"""
Gemini AI Integration Module
Integrates with Google's Gemini API for content summarization
"""

import os
import logging
import json
from typing import List, Dict, Optional, Union
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class GeminiSummarizer:
    """Summarize content using Google's Gemini AI"""
    
    def __init__(self, api_key: Optional[str] = None, model_name: str = "gemini-1.5-flash"):
        """
        Initialize Gemini summarizer
        
        Args:
            api_key (str, optional): Gemini API key. If None, will look for GEMINI_API_KEY env var
            model_name (str): Gemini model to use (default: gemini-1.5-flash)
        """
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        self.model_name = model_name
        
        if not self.api_key:
            raise ValueError("Gemini API key is required. Set GEMINI_API_KEY environment variable or pass api_key parameter.")
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        # Initialize model
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            }
        )
        
        logger.info(f"Initialized Gemini summarizer with model: {model_name}")
    
    def create_summary_prompt(self, transcript_text: str, summary_type: str = "detailed") -> str:
        """
        Create a prompt for summarizing transcript content
        
        Args:
            transcript_text (str): The transcript text to summarize
            summary_type (str): Type of summary ("detailed", "brief", "key_points", "timestamped")
            
        Returns:
            str: Formatted prompt for Gemini
        """
        base_prompt = f"""
Please analyze and summarize the following YouTube video transcript. The transcript includes timestamps in [MM:SS] or [HH:MM:SS] format.

TRANSCRIPT:
{transcript_text}

"""
        
        if summary_type == "detailed":
            prompt = base_prompt + """
Please provide a detailed summary that includes:
1. Main topic and purpose of the video
2. Key points discussed (with timestamps)
3. Important details and examples mentioned
4. Conclusions or takeaways
5. Any actionable advice or recommendations

Format your response with clear headings and preserve relevant timestamps for key points.
"""
        
        elif summary_type == "brief":
            prompt = base_prompt + """
Please provide a brief summary (2-3 paragraphs) that captures:
1. The main topic and purpose
2. The most important key points
3. The primary conclusion or takeaway

Keep it concise but informative.
"""
        
        elif summary_type == "key_points":
            prompt = base_prompt + """
Please extract the key points from this video as a bulleted list. Include:
1. Main ideas discussed
2. Important facts or statistics mentioned
3. Recommendations or advice given
4. Any tools, resources, or references mentioned

Format as clear bullet points with timestamps where relevant.
"""
        
        elif summary_type == "timestamped":
            prompt = base_prompt + """
Please create a timestamped summary that breaks down the video content by time segments. Include:
1. What is discussed in each major time segment
2. Key quotes or important statements (with exact timestamps)
3. Topic transitions and flow
4. Any resources or links mentioned

Format this as a chronological breakdown with clear timestamps.
"""
        
        else:
            # Default to detailed if unknown type
            return self.create_summary_prompt(transcript_text, "detailed")
        
        return prompt
    
    def summarize_transcript(self, transcript_text: str, summary_type: str = "detailed", 
                           max_retries: int = 3) -> Optional[Dict]:
        """
        Summarize transcript text using Gemini
        
        Args:
            transcript_text (str): The transcript text to summarize
            summary_type (str): Type of summary to generate
            max_retries (int): Maximum number of retry attempts
            
        Returns:
            Dict: Summary result with metadata, or None if failed
        """
        if not transcript_text.strip():
            logger.error("Empty transcript text provided")
            return None
        
        prompt = self.create_summary_prompt(transcript_text, summary_type)
        
        for attempt in range(max_retries):
            try:
                logger.info(f"Generating summary (attempt {attempt + 1}/{max_retries})")
                
                response = self.model.generate_content(prompt)
                
                if response and response.text:
                    result = {
                        'summary': response.text.strip(),
                        'summary_type': summary_type,
                        'model_used': self.model_name,
                        'original_length': len(transcript_text),
                        'summary_length': len(response.text.strip()),
                        'compression_ratio': round(len(response.text.strip()) / len(transcript_text), 3)
                    }
                    
                    logger.info(f"Summary generated successfully. Length: {result['summary_length']} chars")
                    return result
                else:
                    logger.warning(f"Empty response from Gemini (attempt {attempt + 1})")
                    
            except Exception as e:
                logger.error(f"Error generating summary (attempt {attempt + 1}): {e}")
                if attempt == max_retries - 1:
                    logger.error("All retry attempts failed")
                    return None
        
        return None
    
    def summarize_transcript_chunks(self, transcript_chunks: List[Dict], 
                                  summary_type: str = "key_points") -> Optional[List[Dict]]:
        """
        Summarize transcript chunks individually
        
        Args:
            transcript_chunks (List[Dict]): List of transcript chunks with timestamps
            summary_type (str): Type of summary to generate
            
        Returns:
            List[Dict]: List of summarized chunks, or None if failed
        """
        if not transcript_chunks:
            logger.error("No transcript chunks provided")
            return None
        
        summarized_chunks = []
        
        for i, chunk in enumerate(transcript_chunks):
            logger.info(f"Summarizing chunk {i + 1}/{len(transcript_chunks)}")
            
            chunk_text = f"[{chunk['timestamp_start']} - {chunk['timestamp_end']}] {chunk['text']}"
            
            summary_result = self.summarize_transcript(chunk_text, summary_type)
            
            if summary_result:
                chunk_summary = {
                    'chunk_index': i,
                    'start_time': chunk['start_time'],
                    'end_time': chunk['end_time'],
                    'timestamp_start': chunk['timestamp_start'],
                    'timestamp_end': chunk['timestamp_end'],
                    'original_text': chunk['text'],
                    'summary': summary_result['summary'],
                    'summary_type': summary_type,
                    'original_length': len(chunk['text']),
                    'summary_length': len(summary_result['summary']),
                    'compression_ratio': summary_result['compression_ratio']
                }
                summarized_chunks.append(chunk_summary)
            else:
                logger.warning(f"Failed to summarize chunk {i + 1}")
                # Add original chunk with no summary
                chunk_summary = {
                    'chunk_index': i,
                    'start_time': chunk['start_time'],
                    'end_time': chunk['end_time'],
                    'timestamp_start': chunk['timestamp_start'],
                    'timestamp_end': chunk['timestamp_end'],
                    'original_text': chunk['text'],
                    'summary': "Summary generation failed for this segment.",
                    'summary_type': summary_type,
                    'original_length': len(chunk['text']),
                    'summary_length': 0,
                    'compression_ratio': 0
                }
                summarized_chunks.append(chunk_summary)
        
        return summarized_chunks
    
    def create_combined_summary(self, chunk_summaries: List[Dict]) -> Optional[Dict]:
        """
        Create a combined summary from individual chunk summaries
        
        Args:
            chunk_summaries (List[Dict]): List of summarized chunks
            
        Returns:
            Dict: Combined summary result, or None if failed
        """
        if not chunk_summaries:
            return None
        
        # Combine all chunk summaries
        combined_text = "\n\n".join([
            f"**{chunk['timestamp_start']} - {chunk['timestamp_end']}:**\n{chunk['summary']}"
            for chunk in chunk_summaries
        ])
        
        prompt = f"""
Based on the following timestamped summaries of a YouTube video, please create a comprehensive overall summary:

{combined_text}

Please provide:
1. A clear overview of the entire video's content
2. The main themes and topics covered
3. Key insights and takeaways
4. Important timestamps for reference
5. Any actionable advice or recommendations mentioned

Create a well-structured summary that gives someone a complete understanding of the video's content.
"""
        
        try:
            response = self.model.generate_content(prompt)
            
            if response and response.text:
                result = {
                    'combined_summary': response.text.strip(),
                    'num_chunks_processed': len(chunk_summaries),
                    'total_original_length': sum(chunk['original_length'] for chunk in chunk_summaries),
                    'total_chunk_summaries_length': sum(chunk['summary_length'] for chunk in chunk_summaries),
                    'final_summary_length': len(response.text.strip()),
                    'model_used': self.model_name
                }
                
                logger.info("Combined summary generated successfully")
                return result
            
        except Exception as e:
            logger.error(f"Error creating combined summary: {e}")
            return None
        
        return None
    
    def extract_key_quotes(self, transcript_text: str) -> Optional[List[Dict]]:
        """
        Extract key quotes and important statements from transcript
        
        Args:
            transcript_text (str): The transcript text
            
        Returns:
            List[Dict]: List of key quotes with timestamps, or None if failed
        """
        prompt = f"""
Analyze the following transcript and extract the most important quotes, statements, or key phrases. 
Include the timestamp for each quote.

TRANSCRIPT:
{transcript_text}

Please extract 5-10 of the most important or memorable quotes/statements and format them as:
- [Timestamp] "Quote text" - Brief context or explanation

Focus on:
1. Key insights or wisdom shared
2. Important facts or statistics
3. Memorable or quotable statements
4. Actionable advice
5. Surprising or interesting information
"""
        
        try:
            response = self.model.generate_content(prompt)
            
            if response and response.text:
                # Parse the response to extract individual quotes
                # This is a simple parsing - could be enhanced with more sophisticated NLP
                quotes_text = response.text.strip()
                
                result = {
                    'key_quotes': quotes_text,
                    'extracted_by': self.model_name
                }
                
                logger.info("Key quotes extracted successfully")
                return result
            
        except Exception as e:
            logger.error(f"Error extracting key quotes: {e}")
            return None
        
        return None


# Example usage
if __name__ == "__main__":
    # This would require a valid API key
    try:
        summarizer = GeminiSummarizer()
        
        sample_transcript = """
        [00:00] Welcome to today's video about machine learning fundamentals.
        [00:15] We'll be covering three main topics: supervised learning, unsupervised learning, and reinforcement learning.
        [01:30] First, let's talk about supervised learning. This is when we train our model on labeled data.
        [02:45] The key advantage of supervised learning is that we can measure accuracy against known correct answers.
        """
        
        summary = summarizer.summarize_transcript(sample_transcript, "key_points")
        
        if summary:
            print("Summary generated:")
            print(summary['summary'])
        else:
            print("Failed to generate summary")
            
    except ValueError as e:
        print(f"Configuration error: {e}")
    except Exception as e:
        print(f"Error: {e}")
