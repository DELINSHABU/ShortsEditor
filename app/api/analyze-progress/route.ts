import { NextRequest, NextResponse } from 'next/server'
import { geminiService, AnalysisProgress } from '@/lib/gemini-service'
import { extractVideoId } from '@/lib/config'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { youtubeUrl, analysisType = 'highlights' } = body

    // Validate input
    if (!youtubeUrl) {
      return NextResponse.json(
        { error: 'YouTube URL is required' },
        { status: 400 }
      )
    }

    // Validate YouTube URL format
    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube URL format' },
        { status: 400 }
      )
    }

    // Check if environment variables are configured
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          message: 'API key not configured. Please check your environment variables.' 
        },
        { status: 500 }
      )
    }

    console.log(`Starting analysis with download progress for video: ${videoId}`)
    
    // Use the new method that tracks download progress
    const analysisResult = await geminiService.analyzeVideoWithDownload(youtubeUrl)
    
    console.log(`Analysis completed for video: ${videoId}, found ${analysisResult.totalHighlights} highlights`)
    
    return NextResponse.json({
      success: true,
      data: analysisResult,
      message: `Found ${analysisResult.totalHighlights} potential highlights`
    })

  } catch (error) {
    console.error('Video analysis error:', error)
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return NextResponse.json(
          { 
            error: 'Authentication failed',
            message: 'Invalid or missing Gemini API key' 
          },
          { status: 401 }
        )
      }
      
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'API quota exceeded. Please try again later.' 
          },
          { status: 429 }
        )
      }
    }

    return NextResponse.json(
      { 
        error: 'Analysis failed',
        message: error instanceof Error ? error.message : 'Unable to analyze video. Please try again.' 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { 
      message: 'Video Analysis with Progress API',
      version: '1.0.0',
      endpoints: {
        POST: 'Analyze YouTube video for highlights with download progress tracking',
      },
      requiredFields: ['youtubeUrl'],
      optionalFields: ['analysisType']
    }
  )
}
