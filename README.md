# ShortsEditor 🎬✂️

AI-powered YouTube highlight extractor that uses Google's Gemini AI to automatically identify the most engaging moments in videos - perfect for creating shorts, clips, and highlights.

## 🚀 Features

- **AI-Powered Analysis**: Uses Gemini 1.5 Pro to analyze video content
- **Smart Highlight Detection**: Identifies funny, exciting, dramatic, and educational moments
- **Precise Timestamps**: Provides exact start/end times for each highlight
- **Confidence Scoring**: Rates each highlight's suitability for short-form content
- **Video Download & Cropping**: Automatically download and crop highlight clips as MP4 files
- **Multiple Export Formats**: Export as JSON, timestamp list, or YouTube description
- **Filter & Sort**: Organize highlights by type, confidence, or timeline
- **One-Click Preview**: Direct links to YouTube moments with timestamps
- **Quality Options**: Choose video quality (high/medium/low) and resolution (1080p/720p/480p/360p)
- **Modern UI**: Beautiful, responsive interface with dark/light theme support

## 🛠️ Setup

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- Google Gemini API Key

### Installation

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd ShortsEditor
   ```

2. **Install dependencies**:
   ```bash
   pnpm install
   ```

3. **Configure environment variables**:
   Create a `.env.local` file in the root directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   To get a Gemini API key:
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create an account and generate an API key
   - Make sure to enable the Gemini API

4. **Run the development server**:
   ```bash
   pnpm dev
   ```

5. **Open your browser**:
   Navigate to `http://localhost:3000`

## 📖 How to Use

1. **Paste YouTube URL**: Enter any YouTube video URL in the input field
2. **Analyze Video**: Click "Analyze Video" to start the AI analysis
3. **Review Highlights**: Browse through the generated highlights with timestamps
4. **Download Clips**: Click "Download MP4" on any highlight to get the cropped video file
5. **Filter & Sort**: Use controls to filter by type or minimum confidence score
6. **Export Results**: Download highlights in various formats (JSON, timestamps, YouTube description)
7. **Preview Moments**: Click preview buttons to jump to specific moments

## 🔧 Technical Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS
- **AI Integration**: Google Generative AI (Gemini)
- **Styling**: Tailwind CSS with CSS Variables
- **Icons**: Lucide React

## 🎯 Use Cases

- **Content Creators**: Extract viral moments for TikTok, YouTube Shorts, Instagram Reels
- **Social Media Managers**: Identify key highlights from long-form content
- **Video Editors**: Quickly find the best segments for compilation videos
- **Marketers**: Create engaging clips from webinars, presentations, or live streams

## 🤖 AI Analysis Process

The application uses Gemini 1.5 Pro to analyze videos for:

1. **Audio Analysis**: Sudden increases in excitement, laughter, or dramatic audio
2. **Visual Analysis**: Engaging scenes, dramatic events, or visual highlights  
3. **Content Classification**: Categorizes moments as funny, exciting, dramatic, or educational
4. **Confidence Scoring**: Rates each highlight's potential for short-form success (1-10)
5. **Optimal Duration**: Focuses on 15-60 second segments perfect for shorts

## 📊 Highlight Types

- 🚀 **Exciting**: High-energy moments with sudden excitement
- 😂 **Funny**: Comedic moments with laughter or humor
- 🎭 **Dramatic**: Suspenseful or emotionally impactful scenes
- 🎓 **Educational**: Key learning points or explanations
- ⭐ **Other**: Miscellaneous noteworthy moments

## 🛡️ Limitations & Notes

- **Current Implementation**: Uses simulation for demo purposes - replace with actual Gemini video analysis
- **YouTube Access**: Direct video processing requires downloading videos or using YouTube API
- **Rate Limits**: Gemini API has usage quotas and rate limits
- **Video Length**: Longer videos may take more time to process
- **API Costs**: Gemini API usage may incur costs based on Google's pricing

## 🚀 Production Deployment

For production use, you'll need to:

1. **Implement Real Video Processing**:
   - Download YouTube videos using `ytdl-core` or similar
   - Convert to supported formats for Gemini API
   - Handle video chunking for large files

2. **Add Authentication**:
   - User accounts for API quota management
   - Rate limiting per user

3. **Database Integration**:
   - Store analysis results
   - Cache video metadata

4. **Error Handling**:
   - Robust error handling for API failures
   - Retry mechanisms and fallbacks

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Google Gemini AI](https://deepmind.google/technologies/gemini/) for powerful video analysis
- [Radix UI](https://www.radix-ui.com/) for accessible UI components
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Next.js](https://nextjs.org/) for the React framework

---

**Note**: This is a demonstration application. For production use with real YouTube videos, additional implementation work is required for video processing and API integration.
