# Video Download & Cropping Feature 📹✂️

This document explains the implementation of the video download and cropping functionality in ShortsEditor.

## 🏗️ Architecture Overview

The video download feature consists of several interconnected components:

```
User Request → Download API → Video Download Service → Video Cropping Service → File Response
                    ↓
            Temporary File Management & Cleanup
```

## 📁 Key Components

### 1. **Video Download Service** (`/lib/video-download.ts`)
- Downloads YouTube videos using `ytdl-core`
- Manages temporary storage in `/tmp/videos/`
- Handles file caching and cleanup
- Supports multiple quality options

**Key Features:**
- ✅ Automatic cleanup after 2 hours
- ✅ Quality selection (highest, lowest, etc.)
- ✅ File existence checking to avoid re-downloads
- ✅ Error handling for restricted videos

### 2. **Video Cropping Service** (`/lib/video-cropping.ts`)
- Uses FFmpeg via `fluent-ffmpeg` to crop video segments
- Supports multiple output formats (MP4, WebM)
- Quality and resolution options
- Optimized encoding settings

**Key Features:**
- ✅ Precise timestamp-based cropping
- ✅ Multiple quality levels (high/medium/low)
- ✅ Resolution options (1080p/720p/480p/360p)
- ✅ Optimized encoding for web playback
- ✅ Automatic cleanup after 4 hours

### 3. **Download API** (`/app/api/download/route.ts`)
- Handles HTTP requests for video downloads
- Orchestrates the download and cropping process
- Serves files directly to browser
- Comprehensive error handling

**Process Flow:**
1. Validate YouTube URL and highlight data
2. Check for existing cropped file
3. Download original video if needed
4. Crop video segment using FFmpeg
5. Serve file with appropriate headers

### 4. **UI Components**
- **HighlightCard**: Download button with progress indication
- **Toast notifications**: User feedback during processing
- **Error handling**: Graceful degradation on failures

## 🔧 Technical Implementation

### Video Download Process

```typescript
// 1. Download YouTube video
const videoPath = await videoDownloadService.downloadVideo(youtubeUrl, videoId, {
  quality: 'highest',
  format: 'mp4'
})

// 2. Crop specific segment
const cropResult = await videoCroppingService.cropVideo(
  videoPath,
  highlight,
  videoId,
  {
    startTime: highlight.startSeconds,
    endTime: highlight.endSeconds,
    quality: 'high',
    resolution: '720p'
  }
)

// 3. Serve file to user
return new NextResponse(fileBuffer, {
  headers: {
    'Content-Type': 'video/mp4',
    'Content-Disposition': `attachment; filename="${filename}"`
  }
})
```

### FFmpeg Configuration

The cropping service uses optimized FFmpeg settings:

```bash
ffmpeg -ss {startTime} -i {input} -t {duration} -c:v libx264 -c:a aac 
       -preset fast -crf 23 -movflags +faststart {output}
```

**Parameters:**
- `-ss`: Seek to start time
- `-t`: Duration to extract
- `-preset fast`: Faster encoding
- `-crf 23`: Good quality/size balance
- `-movflags +faststart`: Web optimization

## 📊 File Management

### Directory Structure
```
/tmp/
├── videos/           # Original downloaded videos
│   ├── videoId_timestamp.mp4
│   └── ...
└── highlights/       # Cropped highlight clips
    ├── videoId_highlightId_title_timestamp.mp4
    └── ...
```

### Cleanup Strategy
- **Original Videos**: Cleaned up after 2 hours
- **Highlight Clips**: Cleaned up after 4 hours
- **Periodic Cleanup**: Runs every hour via `setInterval`
- **Startup Cleanup**: Removes old files on service initialization

## 🚀 Performance Optimizations

### 1. **Caching**
- Reuses downloaded videos for multiple highlights
- Checks for existing cropped files before processing
- File age validation prevents serving stale content

### 2. **Streaming**
- Uses streaming for video downloads (no memory overload)
- FFmpeg processes video in chunks
- Files served directly from disk

### 3. **Quality Management**
```typescript
const qualitySettings = {
  high: { videoBitrate: '2000k', audioBitrate: '128k' },
  medium: { videoBitrate: '1000k', audioBitrate: '96k' },
  low: { videoBitrate: '500k', audioBitrate: '64k' }
}
```

## 🛡️ Error Handling

### Common Error Scenarios

1. **Invalid YouTube URL**: Validated before processing
2. **Video Unavailable**: Age-restricted, private, or deleted videos
3. **Network Issues**: Timeout handling for downloads
4. **FFmpeg Errors**: Graceful fallback and cleanup
5. **Disk Space**: Automatic cleanup prevents storage issues

### Error Response Format
```json
{
  "error": "Download failed",
  "message": "Unable to download the YouTube video. It may be private or unavailable."
}
```

## 🔐 Security Considerations

1. **Input Validation**: All URLs and parameters validated
2. **File Sanitization**: Filenames sanitized to prevent directory traversal
3. **Temporary Storage**: Files automatically cleaned up
4. **Resource Limits**: Processing timeouts prevent abuse
5. **CORS**: API endpoints properly configured

## 📈 Monitoring & Logging

The system includes comprehensive logging:

```typescript
console.log('Download request received:', { youtubeUrl, highlightId })
console.log('Video downloaded successfully:', videoPath)
console.log('Video cropped successfully:', outputPath)
console.log('Serving file:', { filename, size })
```

## 🚧 Development Setup

### Prerequisites
- Node.js 18+
- FFmpeg installed on system (handled by `ffmpeg-static`)
- Sufficient disk space for temporary files

### Environment Variables
```env
# Optional: Configure temp directory
TEMP_DIR=/custom/temp/path
```

### Testing
```bash
# Test video download
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "highlight": {
      "id": "test_1",
      "title": "Test Highlight",
      "startSeconds": 30,
      "endSeconds": 60
    }
  }'
```

## 🔮 Future Improvements

1. **Database Storage**: Store metadata in database
2. **CDN Integration**: Upload files to cloud storage
3. **Background Processing**: Queue system for large videos
4. **Progress Tracking**: Real-time download progress
5. **Batch Downloads**: Download multiple highlights at once
6. **Format Options**: Support for different output formats
7. **Watermarking**: Add custom watermarks to clips

## 📋 Troubleshooting

### Common Issues

1. **"FFmpeg not found"**
   - Solution: Ensure `ffmpeg-static` package is installed
   - Verify: `ffmpeg.setFfmpegPath(ffmpegPath)`

2. **"Download timeout"**
   - Solution: Increase timeout in video download service
   - Check internet connection and video availability

3. **"File not found"**
   - Solution: Check file cleanup schedule
   - Verify temporary directory permissions

4. **Memory issues**
   - Solution: Implement streaming for large files
   - Monitor system resources during processing

---

This implementation provides a robust, scalable foundation for video download and cropping functionality while maintaining good performance and user experience.
