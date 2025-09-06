"""
Configuration Management Module
Handles configuration loading and validation
"""

import os
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import json


class Config:
    """Configuration manager for YouTube Summarizer"""
    
    def __init__(self, env_file: Optional[str] = None):
        """
        Initialize configuration
        
        Args:
            env_file (str, optional): Path to .env file. If None, looks for .env in current directory
        """
        # Load environment variables
        if env_file:
            load_dotenv(env_file)
        else:
            load_dotenv()
        
        self._config = self._load_config()
        self._validate_config()
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from environment variables"""
        return {
            # API Configuration
            'gemini_api_key': os.getenv('GEMINI_API_KEY'),
            'gemini_model': os.getenv('GEMINI_MODEL', 'gemini-1.5-flash'),
            
            # Default Settings
            'default_summary_type': os.getenv('DEFAULT_SUMMARY_TYPE', 'detailed'),
            'default_chunk_duration': int(os.getenv('DEFAULT_CHUNK_DURATION', '60')),
            
            # Output Settings
            'output_format': os.getenv('OUTPUT_FORMAT', 'json'),
            'save_transcripts': os.getenv('SAVE_TRANSCRIPTS', 'true').lower() == 'true',
            'save_summaries': os.getenv('SAVE_SUMMARIES', 'true').lower() == 'true',
            
            # File Paths
            'output_dir': os.getenv('OUTPUT_DIR', 'output'),
            'temp_dir': os.getenv('TEMP_DIR', 'temp'),
            
            # Advanced Settings
            'max_retries': int(os.getenv('MAX_RETRIES', '3')),
            'request_timeout': int(os.getenv('REQUEST_TIMEOUT', '30')),
            'log_level': os.getenv('LOG_LEVEL', 'INFO'),
        }
    
    def _validate_config(self):
        """Validate configuration values"""
        # Validate required settings
        if not self._config['gemini_api_key']:
            raise ValueError(
                "GEMINI_API_KEY is required. Please set it in your .env file or environment variables."
            )
        
        # Validate model name
        valid_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro']
        if self._config['gemini_model'] not in valid_models:
            raise ValueError(
                f"Invalid Gemini model: {self._config['gemini_model']}. "
                f"Valid models: {', '.join(valid_models)}"
            )
        
        # Validate summary type
        valid_summary_types = ['detailed', 'brief', 'key_points', 'timestamped']
        if self._config['default_summary_type'] not in valid_summary_types:
            raise ValueError(
                f"Invalid summary type: {self._config['default_summary_type']}. "
                f"Valid types: {', '.join(valid_summary_types)}"
            )
        
        # Validate output format
        valid_formats = ['json', 'text', 'markdown']
        if self._config['output_format'] not in valid_formats:
            raise ValueError(
                f"Invalid output format: {self._config['output_format']}. "
                f"Valid formats: {', '.join(valid_formats)}"
            )
        
        # Validate numeric values
        if self._config['default_chunk_duration'] <= 0:
            raise ValueError("default_chunk_duration must be positive")
        
        if self._config['max_retries'] <= 0:
            raise ValueError("max_retries must be positive")
        
        if self._config['request_timeout'] <= 0:
            raise ValueError("request_timeout must be positive")
    
    def get(self, key: str, default: Any = None) -> Any:
        """
        Get configuration value
        
        Args:
            key (str): Configuration key
            default (Any): Default value if key not found
            
        Returns:
            Configuration value
        """
        return self._config.get(key, default)
    
    def set(self, key: str, value: Any):
        """
        Set configuration value
        
        Args:
            key (str): Configuration key
            value (Any): Configuration value
        """
        self._config[key] = value
    
    def get_all(self) -> Dict[str, Any]:
        """Get all configuration values"""
        return self._config.copy()
    
    def create_directories(self):
        """Create necessary directories"""
        dirs_to_create = [
            self._config['output_dir'],
            self._config['temp_dir']
        ]
        
        for directory in dirs_to_create:
            if not os.path.exists(directory):
                os.makedirs(directory, exist_ok=True)
    
    def save_config_to_file(self, filepath: str):
        """
        Save current configuration to a JSON file
        
        Args:
            filepath (str): Path to save configuration file
        """
        # Create a copy without sensitive information
        config_to_save = self._config.copy()
        if 'gemini_api_key' in config_to_save:
            config_to_save['gemini_api_key'] = '[HIDDEN]'
        
        with open(filepath, 'w') as f:
            json.dump(config_to_save, f, indent=2)
    
    @property
    def gemini_api_key(self) -> str:
        """Get Gemini API key"""
        return self._config['gemini_api_key']
    
    @property
    def gemini_model(self) -> str:
        """Get Gemini model name"""
        return self._config['gemini_model']
    
    @property
    def default_summary_type(self) -> str:
        """Get default summary type"""
        return self._config['default_summary_type']
    
    @property
    def default_chunk_duration(self) -> int:
        """Get default chunk duration"""
        return self._config['default_chunk_duration']
    
    @property
    def output_format(self) -> str:
        """Get output format"""
        return self._config['output_format']
    
    @property
    def save_transcripts(self) -> bool:
        """Get save transcripts setting"""
        return self._config['save_transcripts']
    
    @property
    def save_summaries(self) -> bool:
        """Get save summaries setting"""
        return self._config['save_summaries']
    
    @property
    def output_dir(self) -> str:
        """Get output directory"""
        return self._config['output_dir']
    
    @property
    def temp_dir(self) -> str:
        """Get temp directory"""
        return self._config['temp_dir']
    
    @property
    def max_retries(self) -> int:
        """Get max retries"""
        return self._config['max_retries']
    
    @property
    def request_timeout(self) -> int:
        """Get request timeout"""
        return self._config['request_timeout']
    
    @property
    def log_level(self) -> str:
        """Get log level"""
        return self._config['log_level']


# Global config instance
_global_config = None


def get_config(env_file: Optional[str] = None) -> Config:
    """
    Get global configuration instance
    
    Args:
        env_file (str, optional): Path to .env file
        
    Returns:
        Config: Configuration instance
    """
    global _global_config
    
    if _global_config is None:
        _global_config = Config(env_file)
    
    return _global_config


def load_config(env_file: Optional[str] = None) -> Config:
    """
    Load/reload configuration
    
    Args:
        env_file (str, optional): Path to .env file
        
    Returns:
        Config: Configuration instance
    """
    global _global_config
    _global_config = Config(env_file)
    return _global_config


# Example usage
if __name__ == "__main__":
    try:
        config = Config()
        
        print("Configuration loaded successfully!")
        print(f"Gemini Model: {config.gemini_model}")
        print(f"Default Summary Type: {config.default_summary_type}")
        print(f"Output Format: {config.output_format}")
        
        # Create necessary directories
        config.create_directories()
        print("Directories created successfully!")
        
    except ValueError as e:
        print(f"Configuration error: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")
