import { GoogleGenerativeAI, Part } from '@google/generative-ai'
import { config, validateEnvironment, extractVideoId } from './config'
import { videoDownloadService, DownloadProgress } from './video-download'

export interface Highlight {
  id: string
  title: string
  description: string
  startTime: string
  endTime: string
  startSeconds: number
  endSeconds: number
  confidence: number
  type: 'funny' | 'exciting' | 'dramatic' | 'educational' | 'other'
}

export interface VideoAnalysisResult {
  videoId: string
  title?: string
  duration?: string
  totalHighlights: number
  highlights: Highlight[]
  processingTime: number
}

export interface AnalysisProgress {
  stage: 'downloading' | 'analyzing' | 'complete'
  downloadProgress?: DownloadProgress
  analysisProgress?: number
}

class GeminiService {
  private genAI: GoogleGenerativeAI
  private model: any

  constructor() {
    validateEnvironment()
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey!)
    this.model = this.genAI.getGenerativeModel({ model: config.gemini.model })
  }

  async analyzeVideoWithDownload(
    youtubeUrl: string, 
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<VideoAnalysisResult> {
    const startTime = Date.now()
    const videoId = extractVideoId(youtubeUrl)
    
    if (!videoId) {
      throw new Error('Invalid YouTube URL format')
    }

    try {
      // Check if video is already downloaded
      let videoFilePath = await videoDownloadService.hasVideoFile(videoId)
      
      if (!videoFilePath) {
        // Download video with progress tracking
        onProgress?.({
          stage: 'downloading',
          downloadProgress: {
            downloadedBytes: 0,
            totalBytes: 0,
            percentage: 0,
            speed: 0,
            eta: 0,
            stage: 'downloading'
          }
        })
        
        videoFilePath = await videoDownloadService.downloadVideo(
          youtubeUrl,
          videoId,
          {
            quality: 'highest',
            format: 'mp4',
            onProgress: (downloadProgress) => {
              onProgress?.({
                stage: 'downloading',
                downloadProgress
              })
            }
          }
        )
      }
      
      // Start analysis phase
      onProgress?.({
        stage: 'analyzing',
        analysisProgress: 0
      })
      
      // For now, simulate analysis since we can't process the actual video file with Gemini yet
      const result = await this.simulateVideoAnalysisWithProgress(youtubeUrl, onProgress)
      
      onProgress?.({
        stage: 'complete',
        analysisProgress: 100
      })
      
      const processingTime = Date.now() - startTime
      
      return {
        ...result,
        processingTime
      }
    } catch (error) {
      console.error('Error analyzing video with download:', error)
      throw error
    }
  }

  async analyzeVideo(youtubeUrl: string): Promise<VideoAnalysisResult> {
    const startTime = Date.now()
    
    try {
      // Enhanced prompt for better timestamp extraction
      const prompt = `
        Analyze this YouTube video and find highlight-worthy moments for creating short-form content.
        
        IMPORTANT REQUIREMENTS:
        1. Identify moments with sudden increases in excitement, laughter, or dramatic events
        2. Look for visually engaging scenes combined with audio peaks
        3. Each highlight should be 15-60 seconds long (optimal for shorts)
        4. Provide EXACT timestamps in MM:SS format
        5. Confidence level (1-10) based on how suitable it is for short-form content
        
        Return ONLY a valid JSON object with this exact structure:
        {
          "highlights": [
            {
              "id": "unique_id",
              "title": "Brief engaging title",
              "description": "What makes this moment highlight-worthy",
              "startTime": "MM:SS",
              "endTime": "MM:SS", 
              "startSeconds": number,
              "endSeconds": number,
              "confidence": number (1-10),
              "type": "funny|exciting|dramatic|educational|other"
            }
          ]
        }
        
        Focus on moments that would perform well on TikTok, YouTube Shorts, or Instagram Reels.
      `

      // Create content array with prompt and video
      const videoPart: Part = {
        inlineData: {
          mimeType: "video/mp4",
          data: youtubeUrl // Note: In real implementation, you'd need to download/stream the video
        }
      }

      // For now, we'll simulate the API call since we can't directly access YouTube videos
      // In production, you'd need to either:
      // 1. Download the video file first
      // 2. Use YouTube API to get video metadata
      // 3. Or use a service that can process YouTube URLs directly
      
      const result = await this.simulateVideoAnalysis(youtubeUrl)
      
      const processingTime = Date.now() - startTime
      
      return {
        ...result,
        processingTime
      }
    } catch (error) {
      console.error('Error analyzing video:', error)
      throw new Error('Failed to analyze video. Please check your API key and try again.')
    }
  }

  // Simulation method with progress updates
  private async simulateVideoAnalysisWithProgress(
    youtubeUrl: string, 
    onProgress?: (progress: AnalysisProgress) => void
  ): Promise<Omit<VideoAnalysisResult, 'processingTime'>> {
    // Extract video ID for realistic simulation
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^\&\n?#]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown'

    // Simulate analysis with progress updates
    const steps = 5
    for (let i = 0; i <= steps; i++) {
      const progress = (i / steps) * 100
      onProgress?.({
        stage: 'analyzing',
        analysisProgress: progress
      })
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400))
    }

    // Generate realistic highlights
    const highlights: Highlight[] = [
      {
        id: `${videoId}_1`,
        title: "Epic Reaction Moment",
        description: "Sudden burst of excitement with visual drama",
        startTime: "2:15",
        endTime: "2:45",
        startSeconds: 135,
        endSeconds: 165,
        confidence: 9,
        type: "exciting"
      },
      {
        id: `${videoId}_2`,
        title: "Hilarious Commentary", 
        description: "Peak laughter moment with great timing",
        startTime: "5:22",
        endTime: "5:58",
        startSeconds: 322,
        endSeconds: 358,
        confidence: 8,
        type: "funny"
      },
      {
        id: `${videoId}_3`,
        title: "Key Learning Point",
        description: "Important educational moment with visual aids",
        startTime: "8:10",
        endTime: "8:40",
        startSeconds: 490,
        endSeconds: 520,
        confidence: 7,
        type: "educational"
      },
      {
        id: `${videoId}_4`,
        title: "Dramatic Reveal",
        description: "Suspenseful moment with great visual payoff",
        startTime: "12:05",
        endTime: "12:35",
        startSeconds: 725,
        endSeconds: 755,
        confidence: 9,
        type: "dramatic"
      }
    ]

    return {
      videoId,
      title: "Analyzed Video",
      duration: "15:30",
      totalHighlights: highlights.length,
      highlights
    }
  }

  // Simulation method for demo purposes
  private async simulateVideoAnalysis(youtubeUrl: string): Promise<Omit<VideoAnalysisResult, 'processingTime'>> {
    // Extract video ID for realistic simulation
    const videoIdMatch = youtubeUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)
    const videoId = videoIdMatch ? videoIdMatch[1] : 'unknown'

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000))

    // Generate realistic highlights
    const highlights: Highlight[] = [
      {
        id: `${videoId}_1`,
        title: "Epic Reaction Moment",
        description: "Sudden burst of excitement with visual drama",
        startTime: "2:15",
        endTime: "2:45",
        startSeconds: 135,
        endSeconds: 165,
        confidence: 9,
        type: "exciting"
      },
      {
        id: `${videoId}_2`,
        title: "Hilarious Commentary",
        description: "Peak laughter moment with great timing",
        startTime: "5:22",
        endTime: "5:58",
        startSeconds: 322,
        endSeconds: 358,
        confidence: 8,
        type: "funny"
      },
      {
        id: `${videoId}_3`,
        title: "Key Learning Point",
        description: "Important educational moment with visual aids",
        startTime: "8:10",
        endTime: "8:40",
        startSeconds: 490,
        endSeconds: 520,
        confidence: 7,
        type: "educational"
      },
      {
        id: `${videoId}_4`,
        title: "Dramatic Reveal",
        description: "Suspenseful moment with great visual payoff",
        startTime: "12:05",
        endTime: "12:35",
        startSeconds: 725,
        endSeconds: 755,
        confidence: 9,
        type: "dramatic"
      }
    ]

    return {
      videoId,
      title: "Analyzed Video",
      duration: "15:30",
      totalHighlights: highlights.length,
      highlights
    }
  }

  // Method for when you have the actual video file
  async analyzeVideoFile(videoFile: File): Promise<VideoAnalysisResult> {
    const startTime = Date.now()
    
    try {
      const prompt = `
        Analyze this video file and extract highlight moments suitable for short-form content.
        Return timestamps in the exact JSON format specified earlier.
      `

      // Convert file to base64 for Gemini API
      const arrayBuffer = await videoFile.arrayBuffer()
      const base64 = Buffer.from(arrayBuffer).toString('base64')
      
      const videoPart: Part = {
        inlineData: {
          mimeType: videoFile.type || "video/mp4",
          data: base64
        }
      }

      const contents = [prompt, videoPart]
      const result = await this.model.generateContent(contents)
      const response = await result.response
      
      // Parse the JSON response
      const analysisData = JSON.parse(response.text())
      const processingTime = Date.now() - startTime
      
      return {
        videoId: `file_${Date.now()}`,
        title: videoFile.name,
        totalHighlights: analysisData.highlights.length,
        highlights: analysisData.highlights,
        processingTime
      }
    } catch (error) {
      console.error('Error analyzing video file:', error)
      throw new Error('Failed to analyze video file.')
    }
  }
}

export const geminiService = new GeminiService()
