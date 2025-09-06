"""
Main YouTube Video Summarizer
Combines transcript extraction and Gemini summarization
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from pathlib import Path

from youtube_extractor import YouTubeExtractor
from gemini_summarizer import GeminiSummarizer
from config import get_config


class YouTubeVideoSummarizer:
    """Main class that orchestrates the video summarization process"""
    
    def __init__(self, config_file: Optional[str] = None):
        """
        Initialize the YouTube Video Summarizer
        
        Args:
            config_file (str, optional): Path to configuration file
        """
        self.config = get_config(config_file)
        self.config.create_directories()
        
        # Set up logging
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.youtube_extractor = YouTubeExtractor()
        self.gemini_summarizer = GeminiSummarizer(
            api_key=self.config.gemini_api_key,
            model_name=self.config.gemini_model
        )
        
        self.logger.info("YouTube Video Summarizer initialized successfully")
    
    def summarize_video(self, 
                       video_url: str,
                       summary_type: Optional[str] = None,
                       chunk_duration: Optional[int] = None,
                       language: str = 'en',
                       save_files: bool = True) -> Dict[str, Any]:
        """
        Summarize a YouTube video with timestamps
        
        Args:
            video_url (str): YouTube video URL or video ID
            summary_type (str, optional): Type of summary ('detailed', 'brief', 'key_points', 'timestamped')
            chunk_duration (int, optional): Duration for transcript chunks in seconds
            language (str): Preferred transcript language
            save_files (bool): Whether to save output files
            
        Returns:
            Dict: Complete summarization result
        """
        # Use default values if not provided
        summary_type = summary_type or self.config.default_summary_type
        chunk_duration = chunk_duration or self.config.default_chunk_duration
        
        self.logger.info(f"Starting summarization for video: {video_url}")
        
        result = {
            'video_url': video_url,
            'video_id': None,
            'summary_type': summary_type,
            'chunk_duration': chunk_duration,
            'language': language,
            'timestamp': datetime.now().isoformat(),
            'success': False,
            'error': None,
            'transcript': None,
            'transcript_chunks': None,
            'summary': None,
            'chunk_summaries': None,
            'combined_summary': None,
            'key_quotes': None,
            'metadata': {}
        }
        
        try:
            # Step 1: Extract video ID
            video_id = self.youtube_extractor.extract_video_id(video_url)
            if not video_id:
                raise ValueError(f"Could not extract video ID from URL: {video_url}")
            
            result['video_id'] = video_id
            self.logger.info(f"Extracted video ID: {video_id}")
            
            # Step 2: Extract transcript
            self.logger.info("Extracting transcript...")
            transcript = self.youtube_extractor.extract_transcript(video_url, language)
            
            if not transcript:
                raise ValueError("Failed to extract transcript from video")
            
            result['transcript'] = transcript
            result['metadata']['transcript_entries'] = len(transcript)
            result['metadata']['total_duration'] = transcript[-1]['end'] if transcript else 0
            
            self.logger.info(f"Extracted transcript with {len(transcript)} entries")
            
            # Step 3: Group transcript into chunks
            self.logger.info(f"Grouping transcript into {chunk_duration}s chunks...")
            transcript_chunks = self.youtube_extractor.group_transcript_by_time(
                transcript, chunk_duration
            )
            
            result['transcript_chunks'] = transcript_chunks
            result['metadata']['num_chunks'] = len(transcript_chunks)
            
            self.logger.info(f"Created {len(transcript_chunks)} transcript chunks")
            
            # Step 4: Generate summary of full transcript
            self.logger.info("Generating full transcript summary...")
            full_transcript_text = self.youtube_extractor.get_transcript_text(transcript, True)
            
            summary_result = self.gemini_summarizer.summarize_transcript(
                full_transcript_text, summary_type
            )
            
            if summary_result:
                result['summary'] = summary_result
                self.logger.info("Full transcript summary generated successfully")
            else:
                self.logger.warning("Failed to generate full transcript summary")
            
            # Step 5: Generate chunk summaries (for longer videos)
            if len(transcript_chunks) > 1:
                self.logger.info("Generating chunk summaries...")
                chunk_summaries = self.gemini_summarizer.summarize_transcript_chunks(
                    transcript_chunks, "key_points"
                )
                
                if chunk_summaries:
                    result['chunk_summaries'] = chunk_summaries
                    self.logger.info(f"Generated {len(chunk_summaries)} chunk summaries")
                    
                    # Step 6: Create combined summary from chunks
                    self.logger.info("Creating combined summary...")
                    combined_summary = self.gemini_summarizer.create_combined_summary(chunk_summaries)
                    
                    if combined_summary:
                        result['combined_summary'] = combined_summary
                        self.logger.info("Combined summary generated successfully")
            
            # Step 7: Extract key quotes
            if len(full_transcript_text) > 500:  # Only for substantial content
                self.logger.info("Extracting key quotes...")
                key_quotes = self.gemini_summarizer.extract_key_quotes(full_transcript_text)
                
                if key_quotes:
                    result['key_quotes'] = key_quotes
                    self.logger.info("Key quotes extracted successfully")
            
            # Step 8: Add metadata
            result['metadata'].update({
                'processing_completed': datetime.now().isoformat(),
                'model_used': self.config.gemini_model,
                'total_text_length': len(full_transcript_text),
                'summary_length': len(summary_result['summary']) if summary_result else 0,
                'compression_ratio': summary_result['compression_ratio'] if summary_result else 0
            })
            
            result['success'] = True
            self.logger.info("Video summarization completed successfully")
            
            # Step 9: Save files if requested
            if save_files:
                self._save_results(result, video_id)
            
        except Exception as e:
            self.logger.error(f"Error during summarization: {e}")
            result['error'] = str(e)
            result['success'] = False
        
        return result
    
    def _save_results(self, result: Dict[str, Any], video_id: str):
        """
        Save summarization results to files
        
        Args:
            result (Dict): Summarization results
            video_id (str): YouTube video ID
        """
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            base_filename = f"video_{video_id}_{timestamp}"
            
            # Save transcript if enabled
            if self.config.save_transcripts and result['transcript']:
                transcript_file = os.path.join(
                    self.config.output_dir,
                    f"{base_filename}_transcript.json"
                )
                
                transcript_data = {
                    'video_id': video_id,
                    'video_url': result['video_url'],
                    'timestamp': result['timestamp'],
                    'transcript': result['transcript'],
                    'transcript_chunks': result['transcript_chunks']
                }
                
                with open(transcript_file, 'w', encoding='utf-8') as f:
                    json.dump(transcript_data, f, indent=2, ensure_ascii=False)
                
                self.logger.info(f"Transcript saved to: {transcript_file}")
            
            # Save summaries if enabled
            if self.config.save_summaries:
                summary_file = os.path.join(
                    self.config.output_dir,
                    f"{base_filename}_summary.{self.config.output_format}"
                )
                
                if self.config.output_format == 'json':
                    self._save_json_summary(result, summary_file)
                elif self.config.output_format == 'markdown':
                    self._save_markdown_summary(result, summary_file)
                else:  # text
                    self._save_text_summary(result, summary_file)
                
                self.logger.info(f"Summary saved to: {summary_file}")
                
        except Exception as e:
            self.logger.error(f"Error saving results: {e}")
    
    def _save_json_summary(self, result: Dict[str, Any], filepath: str):
        """Save summary in JSON format"""
        summary_data = {
            'video_info': {
                'video_id': result['video_id'],
                'video_url': result['video_url'],
                'summary_type': result['summary_type']
            },
            'summary': result['summary']['summary'] if result['summary'] else None,
            'chunk_summaries': result['chunk_summaries'],
            'combined_summary': result['combined_summary']['combined_summary'] if result['combined_summary'] else None,
            'key_quotes': result['key_quotes']['key_quotes'] if result['key_quotes'] else None,
            'metadata': result['metadata'],
            'timestamp': result['timestamp']
        }
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(summary_data, f, indent=2, ensure_ascii=False)
    
    def _save_markdown_summary(self, result: Dict[str, Any], filepath: str):
        """Save summary in Markdown format"""
        content = f"""# YouTube Video Summary
        
**Video ID:** {result['video_id']}  
**Video URL:** {result['video_url']}  
**Summary Type:** {result['summary_type']}  
**Generated:** {result['timestamp']}  
**Model:** {result['metadata'].get('model_used', 'Unknown')}

## Main Summary

{result['summary']['summary'] if result['summary'] else 'No summary generated'}

"""
        
        # Add chunk summaries if available
        if result['chunk_summaries']:
            content += "## Timestamped Breakdown\n\n"
            for chunk in result['chunk_summaries']:
                content += f"### {chunk['timestamp_start']} - {chunk['timestamp_end']}\n\n"
                content += f"{chunk['summary']}\n\n"
        
        # Add combined summary if available
        if result['combined_summary']:
            content += "## Combined Summary\n\n"
            content += f"{result['combined_summary']['combined_summary']}\n\n"
        
        # Add key quotes if available
        if result['key_quotes']:
            content += "## Key Quotes\n\n"
            content += f"{result['key_quotes']['key_quotes']}\n\n"
        
        # Add metadata
        content += "## Metadata\n\n"
        for key, value in result['metadata'].items():
            content += f"- **{key.replace('_', ' ').title()}:** {value}\n"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def _save_text_summary(self, result: Dict[str, Any], filepath: str):
        """Save summary in plain text format"""
        content = f"""YOUTUBE VIDEO SUMMARY
{'=' * 50}

Video ID: {result['video_id']}
Video URL: {result['video_url']}
Summary Type: {result['summary_type']}
Generated: {result['timestamp']}
Model: {result['metadata'].get('model_used', 'Unknown')}

MAIN SUMMARY
{'=' * 50}

{result['summary']['summary'] if result['summary'] else 'No summary generated'}

"""
        
        # Add chunk summaries if available
        if result['chunk_summaries']:
            content += "TIMESTAMPED BREAKDOWN\n"
            content += "=" * 50 + "\n\n"
            for chunk in result['chunk_summaries']:
                content += f"{chunk['timestamp_start']} - {chunk['timestamp_end']}\n"
                content += "-" * 30 + "\n"
                content += f"{chunk['summary']}\n\n"
        
        # Add combined summary if available
        if result['combined_summary']:
            content += "COMBINED SUMMARY\n"
            content += "=" * 50 + "\n\n"
            content += f"{result['combined_summary']['combined_summary']}\n\n"
        
        # Add key quotes if available
        if result['key_quotes']:
            content += "KEY QUOTES\n"
            content += "=" * 50 + "\n\n"
            content += f"{result['key_quotes']['key_quotes']}\n\n"
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def get_video_info(self, video_url: str) -> Dict[str, Any]:
        """
        Get basic information about a YouTube video
        
        Args:
            video_url (str): YouTube video URL or video ID
            
        Returns:
            Dict: Video information
        """
        video_id = self.youtube_extractor.extract_video_id(video_url)
        if not video_id:
            return {'error': 'Invalid video URL'}
        
        # Get available transcripts
        available_transcripts = self.youtube_extractor.get_available_transcripts(video_id)
        
        return {
            'video_id': video_id,
            'video_url': f"https://www.youtube.com/watch?v={video_id}",
            'available_transcripts': available_transcripts,
            'has_transcripts': len(available_transcripts) > 0
        }


# Example usage
if __name__ == "__main__":
    try:
        # Initialize summarizer
        summarizer = YouTubeVideoSummarizer()
        
        # Test video URL (replace with actual video)
        test_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        
        # Get video info first
        video_info = summarizer.get_video_info(test_url)
        print(f"Video Info: {video_info}")
        
        if video_info.get('has_transcripts'):
            # Summarize the video
            result = summarizer.summarize_video(
                video_url=test_url,
                summary_type="key_points",
                chunk_duration=120
            )
            
            if result['success']:
                print("✅ Summarization completed successfully!")
                if result['summary']:
                    print(f"Summary: {result['summary']['summary'][:200]}...")
            else:
                print(f"❌ Summarization failed: {result['error']}")
        else:
            print("❌ No transcripts available for this video")
            
    except Exception as e:
        print(f"❌ Error: {e}")
