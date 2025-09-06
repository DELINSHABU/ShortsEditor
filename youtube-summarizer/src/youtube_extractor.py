"""
YouTube Transcript Extractor Module
Extracts transcripts from YouTube videos with timestamps
"""

import re
import logging
from typing import List, Dict, Optional, Tuple
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import (
    TranscriptsDisabled, 
    NoTranscriptFound, 
    VideoUnavailable
)

# TooManyRequests might not be available in all versions
try:
    from youtube_transcript_api._errors import TooManyRequests
except ImportError:
    # Create a custom exception if not available
    class TooManyRequests(Exception):
        pass

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class YouTubeExtractor:
    """Extract transcripts from YouTube videos"""
    
    def __init__(self):
        self.supported_languages = ['en', 'en-US', 'en-GB', 'auto']
    
    def extract_video_id(self, url: str) -> Optional[str]:
        """
        Extract YouTube video ID from various URL formats
        
        Args:
            url (str): YouTube video URL
            
        Returns:
            str: Video ID if found, None otherwise
        """
        patterns = [
            r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
            r'youtube\.com/watch\?.*v=([a-zA-Z0-9_-]{11})',
            r'^([a-zA-Z0-9_-]{11})$'  # Direct video ID
        ]
        
        for pattern in patterns:
            match = re.search(pattern, url)
            if match:
                return match.group(1)
        
        return None
    
    def format_timestamp(self, seconds: float) -> str:
        """
        Convert seconds to MM:SS or HH:MM:SS format
        
        Args:
            seconds (float): Time in seconds
            
        Returns:
            str: Formatted timestamp
        """
        hours = int(seconds // 3600)
        minutes = int((seconds % 3600) // 60)
        seconds = int(seconds % 60)
        
        if hours > 0:
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        else:
            return f"{minutes:02d}:{seconds:02d}"
    
    def get_available_transcripts(self, video_id: str) -> List[Dict]:
        """
        Get list of available transcript languages for a video
        
        Args:
            video_id (str): YouTube video ID
            
        Returns:
            List[Dict]: Available transcript information
        """
        try:
            # Try to get any available transcript to check if transcripts exist
            transcript_list = YouTubeTranscriptApi(video_id).list()
            available = []
            
            for transcript in transcript_list:
                available.append({
                    'language': getattr(transcript, 'language', 'Unknown'),
                    'language_code': getattr(transcript, 'language_code', 'auto'),
                    'is_generated': getattr(transcript, 'is_generated', True),
                    'is_translatable': getattr(transcript, 'is_translatable', False)
                })
            
            return available
            
        except Exception as e:
            # If list() fails, try to fetch directly to check if transcripts exist
            try:
                transcript = YouTubeTranscriptApi(video_id).fetch()
                if transcript:
                    return [{
                        'language': 'Auto-detected',
                        'language_code': 'auto',
                        'is_generated': True,
                        'is_translatable': False
                    }]
                else:
                    return []
            except Exception:
                logger.error(f"No transcripts available for video {video_id}")
                return []
    
    def extract_transcript(self, video_url: str, language: str = 'en') -> Optional[List[Dict]]:
        """
        Extract transcript with timestamps from YouTube video
        
        Args:
            video_url (str): YouTube video URL or video ID
            language (str): Preferred language code (default: 'en')
            
        Returns:
            List[Dict]: Transcript data with timestamps, or None if failed
        """
        video_id = self.extract_video_id(video_url)
        if not video_id:
            logger.error(f"Could not extract video ID from: {video_url}")
            return None
        
        try:
            # Try to get transcript using the API
            transcript = YouTubeTranscriptApi(video_id).fetch()
            
            # Format transcript with timestamps
            formatted_transcript = []
            for entry in transcript:
                formatted_entry = {
                    'text': entry['text'].strip(),
                    'start': entry['start'],
                    'duration': entry['duration'],
                    'end': entry['start'] + entry['duration'],
                    'timestamp': self.format_timestamp(entry['start']),
                    'timestamp_end': self.format_timestamp(entry['start'] + entry['duration'])
                }
                formatted_transcript.append(formatted_entry)
            
            logger.info(f"Successfully extracted transcript for video {video_id}")
            return formatted_transcript
            
        except TranscriptsDisabled:
            logger.error(f"Transcripts are disabled for video {video_id}")
            return None
            
        except VideoUnavailable:
            logger.error(f"Video {video_id} is unavailable")
            return None
            
        except TooManyRequests:
            logger.error("Too many requests. Please try again later.")
            return None
            
        except Exception as e:
            logger.error(f"Failed to extract transcript for video {video_id}: {e}")
            return None
    
    def get_transcript_text(self, transcript: List[Dict], include_timestamps: bool = True) -> str:
        """
        Convert transcript list to readable text format
        
        Args:
            transcript (List[Dict]): Transcript data
            include_timestamps (bool): Whether to include timestamps
            
        Returns:
            str: Formatted transcript text
        """
        if not transcript:
            return ""
        
        lines = []
        for entry in transcript:
            if include_timestamps:
                lines.append(f"[{entry['timestamp']}] {entry['text']}")
            else:
                lines.append(entry['text'])
        
        return "\n".join(lines)
    
    def group_transcript_by_time(self, transcript: List[Dict], chunk_duration: int = 60) -> List[Dict]:
        """
        Group transcript entries into time-based chunks
        
        Args:
            transcript (List[Dict]): Transcript data
            chunk_duration (int): Duration of each chunk in seconds (default: 60)
            
        Returns:
            List[Dict]: Grouped transcript chunks
        """
        if not transcript:
            return []
        
        chunks = []
        current_chunk = []
        chunk_start = 0
        
        for entry in transcript:
            if entry['start'] - chunk_start >= chunk_duration and current_chunk:
                # Create chunk
                chunk_text = " ".join([e['text'] for e in current_chunk])
                chunks.append({
                    'start_time': chunk_start,
                    'end_time': current_chunk[-1]['end'],
                    'timestamp_start': self.format_timestamp(chunk_start),
                    'timestamp_end': self.format_timestamp(current_chunk[-1]['end']),
                    'text': chunk_text,
                    'entries': current_chunk.copy()
                })
                
                # Start new chunk
                current_chunk = [entry]
                chunk_start = entry['start']
            else:
                current_chunk.append(entry)
        
        # Add final chunk
        if current_chunk:
            chunk_text = " ".join([e['text'] for e in current_chunk])
            chunks.append({
                'start_time': chunk_start,
                'end_time': current_chunk[-1]['end'],
                'timestamp_start': self.format_timestamp(chunk_start),
                'timestamp_end': self.format_timestamp(current_chunk[-1]['end']),
                'text': chunk_text,
                'entries': current_chunk.copy()
            })
        
        return chunks


# Example usage
if __name__ == "__main__":
    extractor = YouTubeExtractor()
    
    # Test with a video URL
    video_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"  # Example URL
    transcript = extractor.extract_transcript(video_url)
    
    if transcript:
        print("Transcript extracted successfully!")
        print(f"Found {len(transcript)} transcript entries")
        
        # Show first few entries
        for i, entry in enumerate(transcript[:3]):
            print(f"[{entry['timestamp']}] {entry['text']}")
        
        # Group into chunks
        chunks = extractor.group_transcript_by_time(transcript, chunk_duration=120)
        print(f"\nGrouped into {len(chunks)} chunks")
    else:
        print("Failed to extract transcript")
