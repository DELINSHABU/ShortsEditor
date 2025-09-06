# YouTube Video Summarizer 🎥

A powerful tool that extracts transcripts from YouTube videos and generates intelligent summaries with timestamps using Google's Gemini AI.

## Features ✨

- **Extract YouTube Transcripts**: Automatically extract transcripts from YouTube videos with precise timestamps
- **AI-Powered Summarization**: Use Google's Gemini AI to generate intelligent summaries
- **Multiple Summary Types**: Choose from detailed, brief, key points, or timestamped summaries  
- **Timestamp Preservation**: Maintain original timestamps for reference and navigation
- **Chunk Processing**: Process long videos in manageable time-based chunks
- **Multiple Output Formats**: Save results in JSON, Markdown, or plain text
- **Rich CLI Interface**: Beautiful command-line interface with progress indicators
- **Flexible Configuration**: Customize settings via environment variables or config files

## Installation 🚀

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd youtube-summarizer
   ```

2. **Create and activate virtual environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Get a Gemini API key**:
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Keep it secure for the setup step

5. **Setup configuration**:
   ```bash
   python cli.py setup
   ```
   Enter your Gemini API key when prompted.

## Quick Start 🏃‍♂️

### Web Application (Recommended)

```bash
# Start the web application
source venv/bin/activate
python run_webapp.py

# Open http://localhost:5000 in your browser
```

### CLI Usage

```bash
# Summarize a YouTube video
python cli.py summarize "https://www.youtube.com/watch?v=dQw4w9WgXcQ"

# Get video information first
python cli.py info "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

### Advanced Usage

```bash
# Generate key points with 2-minute chunks
python cli.py summarize "dQw4w9WgXcQ" -t key_points -c 120

# Brief summary in markdown format
python cli.py summarize "https://youtu.be/dQw4w9WgXcQ" -t brief -f markdown

# Quiet mode (only output the summary)
python cli.py summarize "VIDEO_URL" -q

# Don't save files, just display results
python cli.py summarize "VIDEO_URL" --no-save
```

## Summary Types 📋

- **`detailed`**: Comprehensive summary with main topics, key points, examples, and conclusions
- **`brief`**: Concise 2-3 paragraph summary capturing the essence
- **`key_points`**: Bulleted list of main ideas and important information
- **`timestamped`**: Chronological breakdown with time-segmented content

## Output Formats 📄

- **`json`**: Machine-readable format with full metadata
- **`markdown`**: Human-readable format with formatting
- **`text`**: Plain text format for simple consumption

## Configuration ⚙️

The tool can be configured via environment variables or a `.env` file:

```bash
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Optional settings
GEMINI_MODEL=gemini-1.5-flash
DEFAULT_SUMMARY_TYPE=detailed
DEFAULT_CHUNK_DURATION=60
OUTPUT_FORMAT=json
SAVE_TRANSCRIPTS=true
SAVE_SUMMARIES=true
OUTPUT_DIR=output
```

## CLI Commands 💻

### `summarize`
Summarize a YouTube video with timestamps.

```bash
python cli.py summarize VIDEO_URL [OPTIONS]

Options:
  -t, --summary-type [detailed|brief|key_points|timestamped]
  -c, --chunk-duration INTEGER    Duration for chunks in seconds
  -l, --language TEXT             Transcript language (default: en)  
  -f, --output-format [json|markdown|text]
  --no-save                       Don't save results to files
  --config PATH                   Path to configuration file
  -q, --quiet                     Suppress non-error output
```

### `info`
Get information about a YouTube video.

```bash
python cli.py info VIDEO_URL
```

### `setup`
Setup configuration interactively.

```bash
python cli.py setup
```

### `help-extended`
Show detailed help and examples.

```bash
python cli.py help-extended --example
```

## Programmatic Usage 🐍

You can also use the tool programmatically:

```python
from src.main_summarizer import YouTubeVideoSummarizer

# Initialize
summarizer = YouTubeVideoSummarizer()

# Get video info
video_info = summarizer.get_video_info("https://www.youtube.com/watch?v=dQw4w9WgXcQ")

# Summarize video
result = summarizer.summarize_video(
    video_url="https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    summary_type="key_points",
    chunk_duration=120
)

if result['success']:
    print("Summary:", result['summary']['summary'])
    print("Key Quotes:", result['key_quotes']['key_quotes'])
```

## File Structure 📁

```
youtube-summarizer/
├── src/
│   ├── youtube_extractor.py    # YouTube transcript extraction
│   ├── gemini_summarizer.py    # Gemini AI integration  
│   ├── main_summarizer.py      # Main orchestration logic
│   └── config.py               # Configuration management
├── output/                     # Generated summaries and transcripts
├── temp/                       # Temporary files
├── cli.py                      # Command-line interface
├── requirements.txt            # Python dependencies
├── .env.example               # Configuration template
└── README.md                  # This file
```

## Features in Detail 🔍

### Transcript Extraction
- Supports multiple YouTube URL formats
- Handles auto-generated and manual transcripts
- Multiple language support
- Precise timestamp preservation
- Fallback to auto-generated if preferred language unavailable

### AI Summarization
- Uses Google's Gemini 1.5 Flash model by default
- Intelligent prompt engineering for different summary types
- Automatic retry on failures
- Content-aware processing for different video lengths

### Timestamp Processing
- Preserves original video timestamps
- Groups content into logical time-based chunks
- Maintains timestamp references in summaries
- Supports both MM:SS and HH:MM:SS formats

### Output Management
- Multiple format options (JSON, Markdown, Text)
- Automatic file naming with timestamps
- Configurable output directories
- Rich metadata inclusion

## Examples 📚

### Educational Video Summary

Input: Tech tutorial video
```bash
python cli.py summarize "https://www.youtube.com/watch?v=EXAMPLE" -t detailed
```

Output includes:
- Main learning objectives
- Step-by-step instructions with timestamps  
- Important commands or code snippets
- Resources and references mentioned

### Podcast Episode Summary

Input: Long-form podcast
```bash
python cli.py summarize "https://www.youtube.com/watch?v=EXAMPLE" -t key_points -c 300
```

Output includes:
- Key topics discussed in each segment
- Important quotes from guests
- Main takeaways and insights
- Timestamp references for interesting sections

## Troubleshooting 🔧

### Common Issues

**"No transcripts available"**
- The video doesn't have transcripts enabled
- Try a different video or check if captions exist manually

**"API key invalid"**
- Verify your Gemini API key is correct
- Check if the API key has proper permissions
- Ensure you have API quota remaining

**"Failed to extract transcript"**
- Video might be private or restricted
- Geographic restrictions might apply
- Video might have been deleted

**"Summary generation failed"**
- Content might violate Gemini's safety guidelines
- Try with a different summary type
- Check your API quota and limits

### Getting Help

1. Run `python cli.py help-extended --example` for more examples
2. Check the configuration with `python cli.py info VIDEO_URL`
3. Enable verbose logging by setting `LOG_LEVEL=DEBUG` in your `.env`

## Contributing 🤝

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs and feature requests.

### Development Setup

```bash
# Clone and setup development environment
git clone <repository-url>
cd youtube-summarizer
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run tests
python -m pytest tests/

# Format code
black src/ cli.py
```

## License 📄

This project is licensed under the MIT License. See LICENSE file for details.

## Disclaimer ⚠️

This tool is for educational and research purposes. Please respect YouTube's Terms of Service and content creators' rights. Only use this tool with videos that have public transcripts available.

---

**Happy Summarizing! 🎉**
