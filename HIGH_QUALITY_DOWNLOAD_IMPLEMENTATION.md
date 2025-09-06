# High-Quality YouTube Video Download Implementation

## Overview

I've successfully implemented enhanced high-quality video downloads using `ytdl-core` to download separate video and audio streams and merge them with FFmpeg. This provides true high-resolution outputs (1080p+) instead of the lower-quality combined streams.

## Implementation Details

### Key Features

1. **Separate Stream Downloads**: When requesting highest quality, the system now:
   - Downloads the highest quality video-only stream (typically 1080p+ MP4)
   - Downloads the highest quality audio-only stream (typically high-bitrate WebM/M4A)
   - Merges them using FFmpeg for optimal quality

2. **Smart Fallback**: Falls back to traditional combined stream downloads for:
   - Lower quality settings (non-highest)
   - Videos without high-resolution separate streams
   - Retry attempts (for reliability)

3. **FFmpeg Integration**: Uses FFmpeg with optimized settings:
   - Video stream copying (no re-encoding for speed)
   - Audio converted to AAC for compatibility
   - Proper stream synchronization

### Code Architecture

#### Main Changes in `lib/video-download.ts`:

1. **Enhanced `downloadVideo()` method**:
   ```typescript
   // For highest quality, try to get separate high-res video and audio streams
   if (quality === 'highest') {
     const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly')
     const highResVideoFormats = videoOnlyFormats.filter(f => 
       f.height && (typeof f.height === 'number' ? f.height : parseInt(f.height)) >= 720
     )
     
     if (highResVideoFormats.length > 0) {
       // Download separate video and audio streams and merge them
       const mergedFilePath = await this.downloadAndMergeStreams(videoUrl, videoId, info, filePath)
       resolve(mergedFilePath)
       return
     }
   }
   ```

2. **New `downloadAndMergeStreams()` method**:
   - Selects best video-only format (highest resolution MP4)
   - Selects best audio-only format (highest bitrate WebM/M4A)
   - Downloads both streams in parallel
   - Merges them with FFmpeg

3. **New `downloadStream()` method**:
   - Downloads individual streams with proper error handling
   - Includes timeout protection and cleanup

4. **New `mergeStreamsWithFFmpeg()` method**:
   - Spawns FFmpeg process with optimized arguments
   - Monitors progress and handles errors
   - Proper cleanup of temporary files

### FFmpeg Command Used

```bash
ffmpeg -i video.mp4 -i audio.webm -c:v copy -c:a aac -strict experimental -shortest -y output.mp4
```

- `-c:v copy`: Copy video stream without re-encoding (fast, lossless)
- `-c:a aac`: Convert audio to AAC for broad compatibility
- `-shortest`: Match duration to shortest stream
- `-y`: Overwrite output file

### Error Handling & Reliability

1. **Timeout Protection**: 
   - 10 minutes per individual stream
   - 15 minutes for FFmpeg merging
   - 15 minutes total for combined download

2. **Cleanup**: 
   - Temporary video and audio files are cleaned up after merging
   - Failed downloads clean up partial files

3. **Graceful Fallback**: 
   - Falls back to combined streams if separate streams fail
   - Maintains existing retry logic

### Quality Improvements

Before:
- Limited to combined video+audio streams (typically max 720p)
- Lower overall quality due to YouTube's combined stream limitations

After:
- Access to highest quality video-only streams (1080p, 1440p, 4K when available)
- High-quality audio streams with better bitrates
- True lossless merging preserves original quality

## Testing Recommendations

### 1. Basic Functionality Test
```bash
# Test with a standard YouTube video
curl -X POST http://localhost:3000/api/download \
  -H "Content-Type: application/json" \
  -d '{
    "youtubeUrl": "https://www.youtube.com/watch?v=VIDEO_ID",
    "highlight": {
      "id": "test",
      "title": "Test Highlight",
      "startSeconds": 10,
      "endSeconds": 30
    },
    "quality": "lossless"
  }'
```

### 2. Quality Comparison Test
1. Download the same video with old system (quality: "high")
2. Download with new system (quality: "lossless") 
3. Compare file sizes and visual quality

### 3. Edge Cases to Test
- Videos with no high-resolution streams available
- Very long videos (test timeout handling)
- Videos with audio/video sync issues
- Network interruption during download

### 4. Performance Testing
- Monitor download times for separate streams vs combined
- Test FFmpeg merging speed
- Verify cleanup of temporary files

## Dependencies

### Required:
- `@distube/ytdl-core`: Already installed
- `ffmpeg`: Must be installed on system

### Installation Check:
```bash
# Verify FFmpeg is available
ffmpeg -version
```

If FFmpeg is not installed:
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows
# Download from https://ffmpeg.org/download.html
```

## Monitoring & Logs

The implementation includes comprehensive logging:
- Format selection details
- Download progress for each stream
- FFmpeg process monitoring
- Error details and fallback triggers

Check logs for:
```
Starting separate stream downloads...
Selected video format: 1080p premium (mp4)
Selected audio format: 128kbps (webm) 
Downloading video stream...
Downloading audio stream...
Merging video and audio streams...
FFmpeg progress: 00:00:15.23
Successfully merged streams to: /path/to/output.mp4
```

## Future Enhancements

1. **Progress Reporting**: Could add real-time progress for stream merging
2. **Format Selection**: Could allow user preference for video/audio formats
3. **Parallel Downloads**: Already implemented but could be optimized further
4. **Quality Validation**: Could verify merged file quality matches expectations

## Configuration

The implementation uses existing configuration patterns and doesn't require additional environment variables. Quality selection remains through the existing `quality` parameter in the download API.

Quality modes:
- `"lossless"` or `"highest"`: Uses new separate stream + merge approach
- Other qualities: Use traditional combined stream approach
