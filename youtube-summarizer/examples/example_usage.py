#!/usr/bin/env python3
"""
Example Usage of YouTube Video Summarizer
Demonstrates various ways to use the tool programmatically
"""

import sys
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent.parent / "src"))

from main_summarizer import YouTubeVideoSummarizer
from youtube_extractor import YouTubeExtractor
from gemini_summarizer import GeminiSummarizer


def example_basic_usage():
    """Basic usage example"""
    print("=== Basic Usage Example ===")
    
    try:
        # Initialize the summarizer
        summarizer = YouTubeVideoSummarizer()
        
        # Example video URL (replace with actual video)
        video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Get video info first
        print("Getting video information...")
        video_info = summarizer.get_video_info(video_url)
        
        if video_info.get('has_transcripts'):
            print(f"✅ Video has transcripts available")
            print(f"Available languages: {len(video_info['available_transcripts'])}")
            
            # Summarize the video
            print("Generating summary...")
            result = summarizer.summarize_video(
                video_url=video_url,
                summary_type="key_points",
                save_files=False  # Don't save files in example
            )
            
            if result['success']:
                print("✅ Summary generated successfully!")
                print(f"Summary: {result['summary']['summary'][:200]}...")
            else:
                print(f"❌ Failed: {result['error']}")
        else:
            print("❌ No transcripts available")
            
    except Exception as e:
        print(f"Error: {e}")


def example_transcript_extraction():
    """Example of just extracting transcripts"""
    print("\n=== Transcript Extraction Example ===")
    
    try:
        extractor = YouTubeExtractor()
        
        # Extract transcript with timestamps
        video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        transcript = extractor.extract_transcript(video_url)
        
        if transcript:
            print(f"✅ Extracted {len(transcript)} transcript entries")
            
            # Show first few entries
            print("First few entries:")
            for entry in transcript[:3]:
                print(f"[{entry['timestamp']}] {entry['text']}")
            
            # Group into chunks
            chunks = extractor.group_transcript_by_time(transcript, chunk_duration=120)
            print(f"Grouped into {len(chunks)} 2-minute chunks")
            
        else:
            print("❌ Failed to extract transcript")
            
    except Exception as e:
        print(f"Error: {e}")


def example_gemini_summarization():
    """Example of using Gemini for summarization"""
    print("\n=== Gemini Summarization Example ===")
    
    try:
        # Initialize Gemini summarizer
        summarizer = GeminiSummarizer()
        
        # Sample transcript text (in real usage, this would come from YouTube)
        sample_transcript = """
        [00:00] Welcome to today's tutorial on machine learning fundamentals.
        [00:15] We'll be covering three main topics today: supervised learning, unsupervised learning, and reinforcement learning.
        [01:30] First, let's talk about supervised learning. This is a type of machine learning where we train our model on labeled data.
        [02:45] The key advantage of supervised learning is that we can measure the accuracy of our model against known correct answers.
        [04:00] Some common examples of supervised learning include classification and regression problems.
        [05:30] Next, let's discuss unsupervised learning. Unlike supervised learning, we don't have labeled data here.
        [07:00] The goal in unsupervised learning is to find hidden patterns or structures in the data.
        [08:30] Common techniques include clustering and dimensionality reduction.
        [10:00] Finally, reinforcement learning is about learning through trial and error.
        [11:30] The model learns by receiving rewards or penalties for its actions.
        [13:00] This is commonly used in game AI and robotics applications.
        """
        
        # Generate different types of summaries
        summary_types = ["brief", "key_points", "detailed"]
        
        for summary_type in summary_types:
            print(f"\n--- {summary_type.upper()} SUMMARY ---")
            
            result = summarizer.summarize_transcript(sample_transcript, summary_type)
            
            if result:
                print(f"Summary ({result['summary_length']} chars):")
                print(result['summary'])
                print(f"Compression ratio: {result['compression_ratio']:.3f}")
            else:
                print("❌ Failed to generate summary")
        
        # Extract key quotes
        print(f"\n--- KEY QUOTES ---")
        quotes = summarizer.extract_key_quotes(sample_transcript)
        
        if quotes:
            print(quotes['key_quotes'])
        else:
            print("❌ Failed to extract quotes")
            
    except Exception as e:
        print(f"Error: {e}")


def example_advanced_usage():
    """Advanced usage with custom settings"""
    print("\n=== Advanced Usage Example ===")
    
    try:
        # Custom configuration
        summarizer = YouTubeVideoSummarizer()
        
        # Override some settings
        summarizer.config.set('default_summary_type', 'timestamped')
        summarizer.config.set('default_chunk_duration', 180)  # 3 minutes
        
        video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Process with custom settings
        result = summarizer.summarize_video(
            video_url=video_url,
            summary_type="timestamped",
            chunk_duration=180,
            language="en",
            save_files=False
        )
        
        if result['success']:
            print("✅ Advanced processing completed!")
            
            # Show metadata
            metadata = result['metadata']
            print(f"Video duration: {metadata.get('total_duration', 0):.1f}s")
            print(f"Transcript entries: {metadata.get('transcript_entries', 0)}")
            print(f"Number of chunks: {metadata.get('num_chunks', 0)}")
            
            # Show chunk summaries if available
            if result['chunk_summaries']:
                print(f"\nChunk summaries ({len(result['chunk_summaries'])}):")
                for i, chunk in enumerate(result['chunk_summaries'][:2]):  # Show first 2
                    print(f"Chunk {i+1}: {chunk['timestamp_start']} - {chunk['timestamp_end']}")
                    print(f"Summary: {chunk['summary'][:100]}...")
            
        else:
            print(f"❌ Failed: {result['error']}")
            
    except Exception as e:
        print(f"Error: {e}")


def example_batch_processing():
    """Example of processing multiple videos"""
    print("\n=== Batch Processing Example ===")
    
    # List of video URLs to process
    video_urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://www.youtube.com/watch?v=EXAMPLE1", 
        "https://www.youtube.com/watch?v=EXAMPLE2"
    ]
    
    try:
        summarizer = YouTubeVideoSummarizer()
        results = []
        
        for i, url in enumerate(video_urls, 1):
            print(f"\nProcessing video {i}/{len(video_urls)}: {url}")
            
            # Quick check if video has transcripts
            video_info = summarizer.get_video_info(url)
            
            if not video_info.get('has_transcripts'):
                print(f"❌ No transcripts available, skipping...")
                continue
            
            # Process the video
            result = summarizer.summarize_video(
                video_url=url,
                summary_type="brief",
                save_files=False
            )
            
            if result['success']:
                print(f"✅ Processed successfully")
                results.append({
                    'url': url,
                    'video_id': result['video_id'],
                    'summary': result['summary']['summary'] if result['summary'] else None,
                    'duration': result['metadata'].get('total_duration', 0)
                })
            else:
                print(f"❌ Failed: {result['error']}")
        
        print(f"\n=== Batch Results ===")
        print(f"Processed {len(results)} videos successfully")
        
        for result in results:
            print(f"- {result['video_id']}: {result['duration']:.1f}s")
            
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    print("YouTube Video Summarizer - Example Usage")
    print("=" * 50)
    
    # Run examples
    example_basic_usage()
    example_transcript_extraction()
    example_gemini_summarization()
    example_advanced_usage()
    example_batch_processing()
    
    print("\n" + "=" * 50)
    print("Examples completed!")
    print("Note: Replace example URLs with actual YouTube videos for real testing.")
