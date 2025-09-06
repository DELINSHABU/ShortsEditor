import { NextRequest, NextResponse } from 'next/server'
import { videoDownloadService } from '@/lib/video-download'
import { videoCroppingService } from '@/lib/video-cropping'
import { extractVideoId } from '@/lib/config'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { youtubeUrl, highlight, quality = 'lossless', resolution = 'original' } = body

    console.log('Download request received:', { youtubeUrl, highlightId: highlight?.id, quality, resolution })

    // Validate input
    if (!youtubeUrl || !highlight) {
      return NextResponse.json(
        { error: 'YouTube URL and highlight data are required' },
        { status: 400 }
      )
    }

    // Extract video ID
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      )
    }

    // Validate highlight data
    if (!highlight.id || !highlight.startSeconds || !highlight.endSeconds) {
      return NextResponse.json(
        { error: 'Invalid highlight data' },
        { status: 400 }
      )
    }

    console.log(`Processing highlight: ${highlight.title} (${highlight.startTime} - ${highlight.endTime})`)

    // Check if we already have the cropped file
    const existingCropFile = await videoCroppingService.hasCroppedFile(videoId, highlight.id)
    if (existingCropFile && fs.existsSync(existingCropFile)) {
      console.log('Found existing cropped file:', existingCropFile)
      
      // Return the existing file
      return serveVideoFile(existingCropFile, highlight.title)
    }

    // Check if we have the original video downloaded
    let videoFilePath = await videoDownloadService.hasVideoFile(videoId)
    
    if (!videoFilePath) {
      console.log('Downloading YouTube video...')
      
      // Download the video first
      try {
        videoFilePath = await videoDownloadService.downloadVideo(youtubeUrl, videoId, {
          quality: 'highest',
          format: 'mp4'
        })
        console.log('Video downloaded successfully:', videoFilePath)
      } catch (error: any) {
        console.error('Video download failed:', error)
        
        let errorMessage = 'Unable to download the YouTube video.'
        
        if (error.message.includes('functions')) {
          errorMessage = 'YouTube format extraction failed. The video may be new or have changed format.'
        } else if (error.message.includes('private') || error.message.includes('unavailable')) {
          errorMessage = 'This video is private, unlisted, or has been removed.'
        } else if (error.message.includes('restricted')) {
          errorMessage = 'This video is age-restricted or region-blocked.'
        } else if (error.message.includes('live')) {
          errorMessage = 'Live streams and premieres cannot be downloaded.'
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Download timed out. The video may be too large or your connection is slow.'
        } else if (error.message.includes('No suitable')) {
          errorMessage = 'No downloadable video formats found. This may be a live stream or restricted video.'
        }
        
        return NextResponse.json(
          { 
            error: 'Failed to download video',
            message: errorMessage,
            details: error.message
          },
          { status: 500 }
        )
      }
    } else {
      console.log('Using existing video file:', videoFilePath)
    }

    // Crop the video
    console.log('Cropping video...')
    try {
      const cropResult = await videoCroppingService.cropVideo(
        videoFilePath,
        highlight,
        videoId,
        {
          startTime: highlight.startSeconds,
          endTime: highlight.endSeconds,
          outputFormat: 'mp4',
          quality: quality as 'lossless' | 'youtube' | 'high' | 'medium' | 'low',
          resolution: resolution as 'original' | '1080p' | '720p' | '480p' | '360p'
        }
      )

      console.log('Video cropped successfully:', cropResult.outputPath)

      // Serve the cropped file
      return serveVideoFile(cropResult.outputPath, highlight.title)

    } catch (error) {
      console.error('Video cropping failed:', error)
      return NextResponse.json(
        { 
          error: 'Failed to crop video',
          message: 'Unable to process the video clip. Please try again.' 
        },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Download API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Something went wrong while processing your request.' 
      },
      { status: 500 }
    )
  }
}

// Helper function to serve video files
function serveVideoFile(filePath: string, title: string) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read the file
    const fileBuffer = fs.readFileSync(filePath)
    const fileName = `${sanitizeFilename(title)}.mp4`
    
    // Set appropriate headers for file download
    const headers = new Headers()
    headers.set('Content-Type', 'video/mp4')
    headers.set('Content-Disposition', `attachment; filename="${fileName}"`)
    headers.set('Content-Length', fileBuffer.length.toString())
    headers.set('Cache-Control', 'no-cache')

    console.log(`Serving file: ${filePath} as ${fileName} (${fileBuffer.length} bytes)`)

    return new NextResponse(fileBuffer, {
      status: 200,
      headers
    })

  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
}

// Helper function to sanitize filename
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50) // Limit length
    .trim()
}

export async function GET() {
  return NextResponse.json({
    message: 'Video Download API',
    version: '1.0.0',
    endpoints: {
      POST: 'Download and crop video highlight',
    },
    requiredFields: ['youtubeUrl', 'highlight'],
    optionalFields: ['quality', 'resolution'],
    supportedQualities: ['lossless', 'youtube', 'high', 'medium', 'low'],
    supportedResolutions: ['1080p', '720p', '480p', '360p']
  })
}
