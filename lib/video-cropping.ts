import ffmpeg from 'fluent-ffmpeg'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'
import { Highlight } from './gemini-service'

const access = promisify(fs.access)
const mkdir = promisify(fs.mkdir)
const stat = promisify(fs.stat)

// Set the ffmpeg path to system binary
ffmpeg.setFfmpegPath('/usr/bin/ffmpeg')
ffmpeg.setFfprobePath('/usr/bin/ffprobe')

export interface CropOptions {
  startTime: number // in seconds
  endTime: number // in seconds
  outputFormat?: 'mp4' | 'webm'
  quality?: 'lossless' | 'youtube' | 'high' | 'medium' | 'low'
  resolution?: 'original' | '1080p' | '720p' | '480p' | '360p'
  preserveOriginalQuality?: boolean // When true, uses copy streams for no quality loss
}

export interface CropResult {
  outputPath: string
  fileSize: number
  duration: number
  format: string
}

class VideoCroppingService {
  private readonly outputDir: string
  private readonly maxFileAge: number = 1000 * 60 * 60 * 4 // 4 hours

  constructor() {
    this.outputDir = path.join(process.cwd(), 'tmp', 'highlights')
    this.ensureOutputDir()
  }

  private async ensureOutputDir() {
    try {
      await access(this.outputDir)
    } catch {
      await mkdir(this.outputDir, { recursive: true })
    }
  }

  /**
   * Crop a video segment based on timestamp
   */
  async cropVideo(
    inputPath: string,
    highlight: Highlight,
    videoId: string,
    options: CropOptions = {}
  ): Promise<CropResult> {
    await this.ensureOutputDir()

    const {
      outputFormat = 'mp4',
      quality = 'high',
      resolution = '720p'
    } = options

    const startTime = highlight.startSeconds
    const endTime = highlight.endSeconds
    const duration = endTime - startTime

    // Generate output filename
    const sanitizedTitle = this.sanitizeFilename(highlight.title)
    const timestamp = Date.now()
    const outputFileName = `${videoId}_${highlight.id}_${sanitizedTitle}_${timestamp}.${outputFormat}`
    const outputPath = path.join(this.outputDir, outputFileName)

    return new Promise((resolve, reject) => {
      try {
        let command = ffmpeg(inputPath)
          .seekInput(startTime) // Start from this time
          .duration(duration) // Duration to extract
          .output(outputPath)

        // Set video codec and quality based on options
        switch (quality) {
          case 'lossless':
            // Lossless cropping using stream copying - no re-encoding
            console.log(`Lossless cropping mode: preserving original resolution and quality`)
            command = command
              .videoCodec('copy') // Copy video stream without re-encoding
              .audioCodec('copy') // Copy audio stream without re-encoding
              .addOptions([
                '-avoid_negative_ts make_zero', // Fix timestamp issues
                '-movflags +faststart' // Web optimization
              ])
            
            // Log the source video resolution for debugging
            this.getVideoMetadata(inputPath).then(metadata => {
              const videoStream = metadata.streams.find(s => s.codec_type === 'video')
              if (videoStream) {
                console.log(`Source video resolution: ${videoStream.width}x${videoStream.height} (${videoStream.codec_name})`)
              }
            }).catch(err => console.error('Could not get source video metadata:', err))
            break
            
          case 'youtube':
            // YouTube optimized settings
            command = command
              .videoCodec('libx264')
              .audioCodec('aac')
              .audioChannels(2)
              .audioFrequency(48000)
              .audioBitrate('320k') // High quality audio for YouTube
            
            // Set video quality based on resolution for YouTube
            if (resolution === '1080p') {
              command = command.videoBitrate('8000k') // YouTube recommended for 1080p
            } else if (resolution === '720p') {
              command = command.videoBitrate('5000k') // YouTube recommended for 720p
            } else {
              command = command.videoBitrate('3000k') // Fallback
            }
            break
            
          case 'high':
            command = command
              .videoCodec('libx264')
              .audioCodec('aac')
              .audioChannels(2)
              .audioFrequency(48000)
              .videoBitrate('4000k') // Increased from 2000k
              .audioBitrate('192k') // Increased from 128k
            break
            
          case 'medium':
            command = command
              .videoCodec('libx264')
              .audioCodec('aac')
              .audioChannels(2)
              .audioFrequency(44100)
              .videoBitrate('2000k') // Increased from 1000k
              .audioBitrate('128k') // Increased from 96k
            break
            
          case 'low':
            command = command
              .videoCodec('libx264')
              .audioCodec('aac')
              .audioChannels(2)
              .audioFrequency(44100)
              .videoBitrate('1000k') // Increased from 500k
              .audioBitrate('96k') // Increased from 64k
            break
        }

        // Set resolution (skip for lossless and 'original' to preserve original quality)
        if (quality !== 'lossless' && resolution !== 'original') {
          const resolutionMap = {
            '1080p': '1920x1080',
            '720p': '1280x720',
            '480p': '854x480',
            '360p': '640x360'
          }
          
          if (resolutionMap[resolution] && resolution !== 'original') {
            command = command.size(resolutionMap[resolution])
          }
        }

        // Add additional ffmpeg options based on quality setting (skip for lossless)
        if (quality === 'lossless') {
          // Lossless already has necessary options added above
        } else if (quality === 'youtube') {
          // YouTube-optimized encoding settings
          command = command
            .addOptions([
              '-preset medium', // Better quality than fast
              '-profile:v high', // H.264 high profile
              '-level 4.0', // H.264 level for compatibility
              '-pix_fmt yuv420p', // Pixel format for compatibility
              '-movflags +faststart', // Web optimization
              '-avoid_negative_ts make_zero', // Fix timestamp issues
              '-g 30', // GOP size (keyframe interval)
              '-keyint_min 30', // Minimum keyframe interval
              '-sc_threshold 0', // Disable scene cut detection
              '-b_strategy 1', // B-frame strategy
              '-bf 3', // Maximum B-frames
              '-refs 3' // Reference frames
            ])
        } else {
          // Standard quality settings (don't mix CRF with bitrate)
          command = command
            .addOptions([
              '-preset medium', // Better quality than fast
              '-profile:v high',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
              '-avoid_negative_ts make_zero'
            ])
        }

        command
          .on('start', (commandLine) => {
            console.log('FFmpeg process started:', commandLine)
          })
          .on('progress', (progress) => {
            console.log(`Processing: ${Math.round(progress.percent || 0)}% done`)
          })
          .on('end', async () => {
            try {
              const stats = await stat(outputPath)
              const result: CropResult = {
                outputPath,
                fileSize: stats.size,
                duration,
                format: outputFormat
              }
              console.log(`Video cropped successfully: ${outputPath}`)
              resolve(result)
            } catch (error) {
              reject(new Error('Failed to get output file stats'))
            }
          })
          .on('error', (error) => {
            console.error('FFmpeg error:', error)
            this.cleanupFile(outputPath)
            reject(new Error(`Video cropping failed: ${error.message}`))
          })
          .run()

      } catch (error) {
        console.error('Error starting crop process:', error)
        reject(new Error('Failed to start video cropping'))
      }
    })
  }

  /**
   * Crop multiple highlights from the same video
   */
  async cropMultipleHighlights(
    inputPath: string,
    highlights: Highlight[],
    videoId: string,
    options: CropOptions = {}
  ): Promise<CropResult[]> {
    const results: CropResult[] = []
    
    // Process highlights sequentially to avoid overwhelming the system
    for (const highlight of highlights) {
      try {
        const result = await this.cropVideo(inputPath, highlight, videoId, options)
        results.push(result)
      } catch (error) {
        console.error(`Failed to crop highlight ${highlight.id}:`, error)
        // Continue with other highlights even if one fails
      }
    }
    
    return results
  }

  /**
   * Check if a cropped file already exists
   */
  async hasCroppedFile(videoId: string, highlightId: string): Promise<string | null> {
    try {
      const files = fs.readdirSync(this.outputDir)
      const croppedFile = files.find(file => 
        file.includes(`${videoId}_${highlightId}_`)
      )
      
      if (croppedFile) {
        const filePath = path.join(this.outputDir, croppedFile)
        const stats = await stat(filePath)
        
        // Check if file is not too old
        if (Date.now() - stats.mtime.getTime() < this.maxFileAge) {
          return filePath
        } else {
          // File is too old, clean it up
          this.cleanupFile(filePath)
        }
      }
    } catch (error) {
      console.error('Error checking for existing cropped file:', error)
    }
    
    return null
  }

  /**
   * Get video duration using ffmpeg
   */
  async getVideoDuration(inputPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error('Failed to get video duration'))
          return
        }
        
        const duration = metadata.format.duration
        resolve(duration || 0)
      })
    })
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(inputPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(inputPath, (err, metadata) => {
        if (err) {
          reject(new Error('Failed to get video metadata'))
          return
        }
        resolve(metadata)
      })
    })
  }

  /**
   * Clean up old cropped files
   */
  async cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.outputDir)
      
      for (const file of files) {
        const filePath = path.join(this.outputDir, file)
        const stats = await stat(filePath)
        
        if (Date.now() - stats.mtime.getTime() > this.maxFileAge) {
          this.cleanupFile(filePath)
        }
      }
    } catch (error) {
      console.error('Error during cleanup:', error)
    }
  }

  /**
   * Clean up a specific file
   */
  private cleanupFile(filePath: string) {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
        console.log(`Cleaned up file: ${filePath}`)
      }
    } catch (error) {
      console.error(`Error cleaning up file ${filePath}:`, error)
    }
  }

  /**
   * Sanitize filename for cross-platform compatibility
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special characters
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 50) // Limit length
  }

  /**
   * Format file size to human readable format
   */
  formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    if (bytes === 0) return '0 Bytes'
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  /**
   * Estimate crop processing time based on duration and quality
   */
  estimateProcessingTime(duration: number, quality: string = 'high'): number {
    const baseTime = duration * 0.3 // Base processing time ratio
    const qualityMultiplier = {
      'lossless': 0.1, // Much faster - just stream copying
      'youtube': 2.5, // Higher quality takes longer
      'high': 1.5,
      'medium': 1.0,
      'low': 0.7
    }[quality] || 1.0
    
    const estimatedTime = baseTime * qualityMultiplier
    const minimumTime = quality === 'lossless' ? 2 : 10 // Different minimums based on quality
    
    return Math.max(estimatedTime, minimumTime)
  }
}

export const videoCroppingService = new VideoCroppingService()

// Clean up old files on startup
videoCroppingService.cleanupOldFiles()

// Set up periodic cleanup (every 2 hours)
setInterval(() => {
  videoCroppingService.cleanupOldFiles()
}, 2 * 60 * 60 * 1000)
