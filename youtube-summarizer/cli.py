#!/usr/bin/env python3
"""
YouTube Video Summarizer CLI
Command-line interface for the YouTube video summarizer tool
"""

import click
import json
import sys
import os
from pathlib import Path
from rich.console import Console
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table
from rich.panel import Panel
from rich.markdown import Markdown

# Add src directory to Python path
sys.path.append(str(Path(__file__).parent / "src"))

from main_summarizer import YouTubeVideoSummarizer
from config import load_config

console = Console()


@click.group()
@click.version_option(version="1.0.0", prog_name="YouTube Video Summarizer")
def cli():
    """
    YouTube Video Summarizer - Extract and summarize YouTube video content using Gemini AI
    
    This tool can extract transcripts from YouTube videos and generate intelligent summaries
    with timestamps using Google's Gemini AI model.
    """
    pass


@cli.command()
@click.argument('video_url')
@click.option('--summary-type', '-t', 
              type=click.Choice(['detailed', 'brief', 'key_points', 'timestamped']),
              help='Type of summary to generate')
@click.option('--chunk-duration', '-c', type=int,
              help='Duration for transcript chunks in seconds (default: 60)')
@click.option('--language', '-l', default='en',
              help='Preferred transcript language (default: en)')
@click.option('--output-format', '-f',
              type=click.Choice(['json', 'markdown', 'text']),
              help='Output format for saved files')
@click.option('--no-save', is_flag=True,
              help='Do not save results to files')
@click.option('--config', '-cfg', type=click.Path(exists=True),
              help='Path to configuration file')
@click.option('--quiet', '-q', is_flag=True,
              help='Suppress non-error output')
def summarize(video_url, summary_type, chunk_duration, language, output_format, 
              no_save, config, quiet):
    """
    Summarize a YouTube video with timestamps
    
    VIDEO_URL: YouTube video URL or video ID to summarize
    
    Examples:
    
    \b
    # Basic summarization
    python cli.py summarize "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    
    \b
    # Generate key points with 2-minute chunks
    python cli.py summarize "dQw4w9WgXcQ" -t key_points -c 120
    
    \b
    # Brief summary in markdown format
    python cli.py summarize "https://youtu.be/dQw4w9WgXcQ" -t brief -f markdown
    """
    if not quiet:
        console.print(Panel.fit("🎥 YouTube Video Summarizer", style="bold blue"))
    
    try:
        # Load configuration
        if config:
            load_config(config)
        
        # Initialize summarizer
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
            disable=quiet
        ) as progress:
            task = progress.add_task("Initializing...", total=None)
            summarizer = YouTubeVideoSummarizer()
            progress.update(task, description="✅ Initialized")
        
        # Override config with CLI options
        if summary_type:
            summarizer.config.set('default_summary_type', summary_type)
        if chunk_duration:
            summarizer.config.set('default_chunk_duration', chunk_duration)
        if output_format:
            summarizer.config.set('output_format', output_format)
        
        # Check video info first
        if not quiet:
            console.print("🔍 Checking video information...")
        
        video_info = summarizer.get_video_info(video_url)
        
        if 'error' in video_info:
            console.print(f"❌ Error: {video_info['error']}", style="red")
            sys.exit(1)
        
        if not video_info['has_transcripts']:
            console.print("❌ No transcripts available for this video", style="red")
            sys.exit(1)
        
        if not quiet:
            console.print(f"✅ Video ID: {video_info['video_id']}")
            console.print(f"📝 Available transcripts: {len(video_info['available_transcripts'])}")
        
        # Perform summarization
        with Progress(
            SpinnerColumn(),
            TextColumn("[progress.description]{task.description}"),
            console=console,
            disable=quiet
        ) as progress:
            task = progress.add_task("Extracting transcript...", total=None)
            
            result = summarizer.summarize_video(
                video_url=video_url,
                summary_type=summary_type,
                chunk_duration=chunk_duration,
                language=language,
                save_files=not no_save
            )
            
            progress.update(task, description="✅ Completed")
        
        if result['success']:
            if not quiet:
                console.print("✅ Summarization completed successfully!", style="green")
                _display_results(result)
            else:
                # In quiet mode, just output the summary
                if result['summary']:
                    console.print(result['summary']['summary'])
        else:
            console.print(f"❌ Summarization failed: {result['error']}", style="red")
            sys.exit(1)
            
    except Exception as e:
        console.print(f"❌ Unexpected error: {e}", style="red")
        sys.exit(1)


@cli.command()
@click.argument('video_url')
def info(video_url):
    """
    Get information about a YouTube video
    
    VIDEO_URL: YouTube video URL or video ID
    """
    try:
        # Initialize with minimal config (API key might not be needed for info)
        from src.youtube_extractor import YouTubeExtractor
        extractor = YouTubeExtractor()
        
        video_id = extractor.extract_video_id(video_url)
        if not video_id:
            console.print("❌ Invalid video URL", style="red")
            sys.exit(1)
        
        console.print(Panel.fit("📹 Video Information", style="bold blue"))
        
        # Get available transcripts
        available_transcripts = extractor.get_available_transcripts(video_id)
        
        # Create info table
        table = Table(title="Video Details")
        table.add_column("Property", style="cyan")
        table.add_column("Value", style="white")
        
        table.add_row("Video ID", video_id)
        table.add_row("Video URL", f"https://www.youtube.com/watch?v={video_id}")
        table.add_row("Transcripts Available", "Yes" if available_transcripts else "No")
        table.add_row("Number of Languages", str(len(available_transcripts)))
        
        console.print(table)
        
        if available_transcripts:
            console.print("\n📝 Available Transcript Languages:")
            lang_table = Table()
            lang_table.add_column("Language", style="cyan")
            lang_table.add_column("Code", style="yellow")
            lang_table.add_column("Generated", style="green")
            lang_table.add_column("Translatable", style="blue")
            
            for transcript in available_transcripts:
                lang_table.add_row(
                    transcript['language'],
                    transcript['language_code'],
                    "Yes" if transcript['is_generated'] else "No",
                    "Yes" if transcript['is_translatable'] else "No"
                )
            
            console.print(lang_table)
        
    except Exception as e:
        console.print(f"❌ Error: {e}", style="red")
        sys.exit(1)


@cli.command()
@click.option('--api-key', prompt=True, hide_input=True,
              help='Your Google Gemini API key')
def setup(api_key):
    """
    Setup configuration for the YouTube Video Summarizer
    """
    console.print(Panel.fit("⚙️  Setup Configuration", style="bold blue"))
    
    try:
        # Create .env file
        env_file = Path('.env')
        
        env_content = f"""# YouTube Video Summarizer Configuration
# Generated by setup command

# Google Gemini API Key
GEMINI_API_KEY={api_key}

# Optional: Gemini Model Configuration
GEMINI_MODEL=gemini-1.5-flash

# Optional: Default summary settings
DEFAULT_SUMMARY_TYPE=detailed
DEFAULT_CHUNK_DURATION=60

# Optional: Output settings
OUTPUT_FORMAT=json
SAVE_TRANSCRIPTS=true
SAVE_SUMMARIES=true
"""
        
        with open(env_file, 'w') as f:
            f.write(env_content)
        
        console.print("✅ Configuration saved to .env file", style="green")
        
        # Test the configuration
        console.print("🧪 Testing configuration...")
        
        try:
            from src.gemini_summarizer import GeminiSummarizer
            summarizer = GeminiSummarizer(api_key=api_key)
            console.print("✅ Gemini API connection successful!", style="green")
        except Exception as e:
            console.print(f"⚠️  Warning: Could not validate API key: {e}", style="yellow")
        
        console.print("\n🎉 Setup completed! You can now use the summarizer.", style="bold green")
        console.print("Try: python cli.py summarize <video_url>")
        
    except Exception as e:
        console.print(f"❌ Setup failed: {e}", style="red")
        sys.exit(1)


@cli.command()
@click.option('--example', is_flag=True,
              help='Show example commands')
def help_extended(example):
    """
    Show extended help and usage examples
    """
    console.print(Panel.fit("📚 YouTube Video Summarizer Help", style="bold blue"))
    
    if example:
        console.print("\n📋 Example Commands:\n")
        
        examples = [
            ("Basic summarization", 
             "python cli.py summarize 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"),
            ("Key points with custom chunks", 
             "python cli.py summarize 'dQw4w9WgXcQ' -t key_points -c 120"),
            ("Brief summary in markdown", 
             "python cli.py summarize 'https://youtu.be/dQw4w9WgXcQ' -t brief -f markdown"),
            ("Get video information", 
             "python cli.py info 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'"),
            ("Setup configuration", 
             "python cli.py setup"),
        ]
        
        for description, command in examples:
            console.print(f"• {description}:", style="bold cyan")
            console.print(f"  {command}\n", style="white")
    
    else:
        console.print("Summary Types:", style="bold cyan")
        console.print("• detailed: Comprehensive summary with timestamps")
        console.print("• brief: Short 2-3 paragraph summary")
        console.print("• key_points: Bulleted list of main points")
        console.print("• timestamped: Chronological breakdown with timestamps\n")
        
        console.print("Output Formats:", style="bold cyan")
        console.print("• json: Machine-readable JSON format")
        console.print("• markdown: Human-readable Markdown format")
        console.print("• text: Plain text format\n")
        
        console.print("Use --example flag to see command examples", style="yellow")


def _display_results(result):
    """Display summarization results in a nice format"""
    
    # Metadata table
    metadata_table = Table(title="Summary Statistics")
    metadata_table.add_column("Metric", style="cyan")
    metadata_table.add_column("Value", style="white")
    
    metadata = result['metadata']
    metadata_table.add_row("Video Duration", f"{metadata.get('total_duration', 0):.1f}s")
    metadata_table.add_row("Transcript Entries", str(metadata.get('transcript_entries', 0)))
    metadata_table.add_row("Text Length", f"{metadata.get('total_text_length', 0):,} chars")
    metadata_table.add_row("Summary Length", f"{metadata.get('summary_length', 0):,} chars")
    metadata_table.add_row("Compression Ratio", f"{metadata.get('compression_ratio', 0):.3f}")
    metadata_table.add_row("Number of Chunks", str(metadata.get('num_chunks', 0)))
    
    console.print(metadata_table)
    
    # Main summary
    if result['summary']:
        console.print("\n📋 Summary:", style="bold green")
        console.print(Panel(result['summary']['summary'], title="Main Summary"))
    
    # Key quotes if available
    if result['key_quotes']:
        console.print("\n💬 Key Quotes:", style="bold yellow")
        console.print(Panel(result['key_quotes']['key_quotes'], title="Important Quotes"))
    
    # Show file save information
    if result['success']:
        console.print(f"\n💾 Results saved to 'output' directory", style="dim")


if __name__ == '__main__':
    cli()
