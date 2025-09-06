import * as ytdl from '@distube/ytdl-core'
import * as fs from 'fs'
import * as path from 'path'
import { promisify } from 'util'
import { spawn } from 'child_process'

const mkdir = promisify(fs.mkdir)
const access = promisify(fs.access)
const stat = promisify(fs.stat)

export interface VideoDownloadOptions {
  quality?: 'highest' | 'lowest' | 'highestvideo' | 'lowestvideo'
  format?: 'mp4' | 'webm'
  onProgress?: (progress: DownloadProgress) => void
}

export interface DownloadProgress {
  downloadedBytes: number
  totalBytes: number
  percentage: number
  speed: number // bytes per second
  eta: number // estimated time remaining in seconds
  stage: 'downloading' | 'processing' | 'complete'
}

export interface VideoInfo {
  title: string
  duration: string
  thumbnail: string
  author: string
  viewCount: number
}

class VideoDownloadService {
  private readonly tempDir: string
  private readonly maxFileAge: number = 1000 * 60 * 60 * 2 // 2 hours

  constructor() {
    this.tempDir = path.join(process.cwd(), 'tmp', 'videos')
    this.ensureTempDir()
  }

  private async ensureTempDir() {
    try {
      await access(this.tempDir)
    } catch {
      await mkdir(this.tempDir, { recursive: true })
    }
  }

  /**
   * Get video information without downloading
   */
  async getVideoInfo(videoUrl: string): Promise<VideoInfo> {
    try {
      const info = await ytdl.getInfo(videoUrl)
      
      return {
        title: info.videoDetails.title,
        duration: this.formatDuration(parseInt(info.videoDetails.lengthSeconds)),
        thumbnail: info.videoDetails.thumbnails[0]?.url || '',
        author: info.videoDetails.author.name,
        viewCount: parseInt(info.videoDetails.viewCount)
      }
    } catch (error) {
      console.error('Error getting video info:', error)
      throw new Error('Failed to get video information')
    }
  }

  /**
   * Download YouTube video to temporary storage with retry logic
   */
  async downloadVideo(
    videoUrl: string, 
    videoId: string, 
    options: VideoDownloadOptions = {},
    maxRetries: number = 3
  ): Promise<string> {
    await this.ensureTempDir()
    
    const { quality = 'highest', format = 'mp4' } = options
    const fileName = `${videoId}_${Date.now()}.${format}`
    const filePath = path.join(this.tempDir, fileName)

    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to download video (attempt ${attempt}/${maxRetries}): ${videoId}`)
        
        return await new Promise<string>(async (resolve, reject) => {
          try {
            // Get video info first to validate and check formats
            ytdl.getInfo(videoUrl).then(async (info) => {
              console.log(`Got video info: ${info.videoDetails.title}`)
              
              // Check available formats
              const formats = ytdl.filterFormats(info.formats, 'videoandaudio')
              console.log(`Found ${formats.length} video+audio formats`)
              
              if (formats.length === 0) {
                // Try video only formats if no combined formats available
                const videoFormats = ytdl.filterFormats(info.formats, 'videoonly')
                console.log(`Found ${videoFormats.length} video-only formats`)
                
                if (videoFormats.length === 0) {
                  reject(new Error('No suitable video formats available. Video may be live stream or have restrictions.'))
                  return
                }
              }

              // Create download stream with better options
              let streamOptions: any = {
                quality: quality === 'highest' ? 'highest' : quality, // Keep 'highest' for best video+audio combo
                filter: formats.length > 0 ? 'videoandaudio' : 'videoonly',
                requestOptions: {
                  headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                  }
                }
              }
              
              // For highest quality, try to get separate high-res video and audio streams
              if (quality === 'highest') {
                console.log('Looking for highest quality format...')
                console.log(`All video+audio formats available: ${formats.map(f => `${f.height || 'unknown'}p-${f.qualityLabel || 'no-label'}-${f.container}`).join(', ')}`)
                
                // Check for high-resolution video-only formats
                const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly')
                const highResVideoFormats = videoOnlyFormats.filter(f => f.height && (typeof f.height === 'number' ? f.height : parseInt(f.height)) >= 720)
                
                if (highResVideoFormats.length > 0) {
                  console.log(`Available high-res video formats: ${highResVideoFormats.slice(0, 5).map(f => `${f.height}p-${f.qualityLabel}`).join(', ')}...`)
                  
                  // Download separate video and audio streams and merge them
                  const mergedFilePath = await this.downloadAndMergeStreams(videoUrl, videoId, info, filePath)
                  resolve(mergedFilePath)
                  return
                } else {
                  console.log('No high-res video-only formats found, using best combined stream')
                }
              }
              
              // Fallback to simpler options if this is a retry
              if (attempt > 1) {
                streamOptions = {
                  quality: 'lowest',
                  filter: 'videoandaudio'
                }
                console.log('Using fallback stream options for retry')
              }
              
              console.log('Creating download stream with options:', streamOptions)
              const stream = ytdl(videoUrl, streamOptions)
              const writeStream = fs.createWriteStream(filePath)
              
              let downloaded = 0
              let startTime = Date.now()
              let lastUpdate = Date.now()
              let lastDownloaded = 0
              
              stream.on('progress', (chunkLength, downloadedBytes, totalBytes) => {
                downloaded = downloadedBytes
                const now = Date.now()
                const elapsed = (now - startTime) / 1000 // seconds
                const timeSinceLastUpdate = (now - lastUpdate) / 1000
                
                // Calculate speed (bytes per second)
                let speed = 0
                if (elapsed > 0) {
                  speed = downloaded / elapsed
                }
                
                // Calculate ETA (estimated time remaining)
                let eta = 0
                if (speed > 0) {
                  const remaining = totalBytes - downloaded
                  eta = remaining / speed
                }
                
                const percentage = (downloaded / totalBytes) * 100
                
                const progressData: DownloadProgress = {
                  downloadedBytes: downloaded,
                  totalBytes: totalBytes,
                  percentage: Math.min(percentage, 100),
                  speed: speed,
                  eta: eta,
                  stage: 'downloading'
                }
                
                // Call progress callback if provided
                if (options.onProgress) {
                  options.onProgress(progressData)
                }
                
                // Log progress every 2 seconds to avoid spam
                if (timeSinceLastUpdate >= 2 || percentage >= 100) {
                  const speedMB = (speed / (1024 * 1024)).toFixed(1)
                  const downloadedMB = (downloaded / (1024 * 1024)).toFixed(1)
                  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1)
                  console.log(`Download progress: ${percentage.toFixed(1)}% (${downloadedMB}/${totalMB} MB) - ${speedMB} MB/s - ETA: ${eta.toFixed(0)}s`)
                  lastUpdate = now
                }
                
                lastDownloaded = downloaded
              })
              
              stream.pipe(writeStream)

              stream.on('error', (error: any) => {
                console.error('Download stream error:', error)
                this.cleanupFile(filePath)
                reject(new Error(`Download failed: ${error.message}`))
              })

              writeStream.on('error', (error) => {
                console.error('Write stream error:', error)
                this.cleanupFile(filePath)
                reject(new Error(`File write failed: ${error.message}`))
              })

              writeStream.on('finish', () => {
                console.log(`Video downloaded successfully: ${filePath}`)
                resolve(filePath)
              })

              // Timeout after 15 minutes
              const timeout = setTimeout(() => {
                console.log('Download timeout reached')
                stream.destroy()
                writeStream.destroy()
                this.cleanupFile(filePath)
                reject(new Error('Download timeout - video may be too large or connection is slow'))
              }, 15 * 60 * 1000)
              
              // Clear timeout on completion
              writeStream.on('finish', () => clearTimeout(timeout))
              stream.on('error', () => clearTimeout(timeout))
              writeStream.on('error', () => clearTimeout(timeout))

            }).catch(reject)

          } catch (error) {
            console.error('Error starting download:', error)
            reject(error)
          }
        })
        
      } catch (error: any) {
        lastError = error
        console.error(`Download attempt ${attempt} failed:`, error.message)
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000 // Exponential backoff
          console.log(`Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Failed to download video after all retries')
  }

  /**
   * Check if a video file exists in temp storage
   */
  async hasVideoFile(videoId: string): Promise<string | null> {
    try {
      const files = fs.readdirSync(this.tempDir)
      const videoFile = files.find(file => file.startsWith(videoId))
      
      if (videoFile) {
        const filePath = path.join(this.tempDir, videoFile)
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
      console.error('Error checking for existing file:', error)
    }
    
    return null
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
   * Clean up old temporary files
   */
  async cleanupOldFiles() {
    try {
      const files = fs.readdirSync(this.tempDir)
      
      for (const file of files) {
        const filePath = path.join(this.tempDir, file)
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
   * Get the size of a file in bytes
   */
  async getFileSize(filePath: string): Promise<number> {
    try {
      const stats = await stat(filePath)
      return stats.size
    } catch (error) {
      return 0
    }
  }

  /**
   * Download separate video and audio streams and merge them with FFmpeg
   */
  private async downloadAndMergeStreams(
    videoUrl: string, 
    videoId: string, 
    info: any, 
    outputPath: string
  ): Promise<string> {
    const tempVideoPath = path.join(this.tempDir, `${videoId}_video_${Date.now()}.mp4`)
    const tempAudioPath = path.join(this.tempDir, `${videoId}_audio_${Date.now()}.webm`)
    
    try {
      console.log('Starting separate stream downloads...')
      
      // Get the best video-only format
      const videoOnlyFormats = ytdl.filterFormats(info.formats, 'videoonly')
      const bestVideoFormat = videoOnlyFormats
        .filter(f => f.container === 'mp4' && f.height)
        .sort((a, b) => {
          const aHeight = typeof a.height === 'number' ? a.height : parseInt(a.height!)
          const bHeight = typeof b.height === 'number' ? b.height : parseInt(b.height!)
          return bHeight - aHeight
        })[0] || videoOnlyFormats[0]
      
      if (!bestVideoFormat) {
        throw new Error('No suitable video-only format found')
      }
      
      // Get the best audio-only format
      const audioOnlyFormats = ytdl.filterFormats(info.formats, 'audioonly')
      const bestAudioFormat = audioOnlyFormats
        .filter(f => (f as any).container === 'webm' || (f as any).container === 'm4a')
        .sort((a, b) => {
          const aBitrate = typeof a.audioBitrate === 'number' ? a.audioBitrate : parseInt(String(a.audioBitrate) || '0')
          const bBitrate = typeof b.audioBitrate === 'number' ? b.audioBitrate : parseInt(String(b.audioBitrate) || '0')
          return bBitrate - aBitrate
        })[0] || audioOnlyFormats[0]
      
      if (!bestAudioFormat) {
        throw new Error('No suitable audio-only format found')
      }
      
      console.log(`Selected video format: ${bestVideoFormat.height}p ${bestVideoFormat.qualityLabel} (${bestVideoFormat.container})`)
      console.log(`Selected audio format: ${bestAudioFormat.audioBitrate}kbps (${bestAudioFormat.container})`)
      
      // Download video stream
      console.log('Downloading video stream...')
      await this.downloadStream(videoUrl, tempVideoPath, { 
        filter: format => format.itag === (typeof bestVideoFormat.itag === 'number' ? bestVideoFormat.itag : parseInt(bestVideoFormat.itag))
      })
      
      // Download audio stream
      console.log('Downloading audio stream...')
      await this.downloadStream(videoUrl, tempAudioPath, { 
        filter: format => format.itag === (typeof bestAudioFormat.itag === 'number' ? bestAudioFormat.itag : parseInt(bestAudioFormat.itag))
      })
      
      // Merge streams with FFmpeg
      console.log('Merging video and audio streams...')
      await this.mergeStreamsWithFFmpeg(tempVideoPath, tempAudioPath, outputPath)
      
      console.log(`Successfully merged streams to: ${outputPath}`)
      return outputPath
      
    } catch (error) {
      console.error('Error in downloadAndMergeStreams:', error)
      throw error
    } finally {
      // Clean up temporary files
      this.cleanupFile(tempVideoPath)
      this.cleanupFile(tempAudioPath)
    }
  }
  
  /**
   * Download a single stream to a file
   */
  private async downloadStream(
    videoUrl: string, 
    outputPath: string, 
    options: any
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = ytdl(videoUrl, options)
      const writeStream = fs.createWriteStream(outputPath)
      
      stream.pipe(writeStream)
      
      stream.on('error', (error) => {
        console.error('Stream download error:', error)
        this.cleanupFile(outputPath)
        reject(error)
      })
      
      writeStream.on('error', (error) => {
        console.error('Write stream error:', error)
        this.cleanupFile(outputPath)
        reject(error)
      })
      
      writeStream.on('finish', () => {
        console.log(`Stream downloaded: ${outputPath}`)
        resolve()
      })
      
      // Timeout after 10 minutes for individual streams
      const timeout = setTimeout(() => {
        stream.destroy()
        writeStream.destroy()
        this.cleanupFile(outputPath)
        reject(new Error('Stream download timeout'))
      }, 10 * 60 * 1000)
      
      writeStream.on('finish', () => clearTimeout(timeout))
      stream.on('error', () => clearTimeout(timeout))
      writeStream.on('error', () => clearTimeout(timeout))
    })
  }
  
  /**
   * Merge video and audio streams using FFmpeg
   */
  private async mergeStreamsWithFFmpeg(
    videoPath: string, 
    audioPath: string, 
    outputPath: string
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        '-i', videoPath,
        '-i', audioPath,
        '-c:v', 'copy',  // Copy video stream without re-encoding
        '-c:a', 'aac',   // Convert audio to AAC
        '-strict', 'experimental',
        '-shortest',     // Match shortest stream duration
        '-y',            // Overwrite output file
        outputPath
      ]
      
      console.log('Running FFmpeg:', 'ffmpeg', ffmpegArgs.join(' '))
      
      const ffmpeg = spawn('ffmpeg', ffmpegArgs)
      
      let stderr = ''
      
      ffmpeg.stderr.on('data', (data) => {
        stderr += data.toString()
        // Log progress from FFmpeg stderr
        const progressMatch = data.toString().match(/time=([0-9:.]+)/)
        if (progressMatch) {
          console.log(`FFmpeg progress: ${progressMatch[1]}`)
        }
      })
      
      ffmpeg.on('error', (error) => {
        console.error('FFmpeg spawn error:', error)
        reject(new Error(`FFmpeg spawn failed: ${error.message}`))
      })
      
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('FFmpeg merge completed successfully')
          resolve()
        } else {
          console.error('FFmpeg stderr:', stderr)
          reject(new Error(`FFmpeg merge failed with code ${code}`))
        }
      })
      
      // Timeout after 15 minutes for merging
      const timeout = setTimeout(() => {
        ffmpeg.kill('SIGKILL')
        reject(new Error('FFmpeg merge timeout'))
      }, 15 * 60 * 1000)
      
      ffmpeg.on('close', () => clearTimeout(timeout))
    })
  }

  /**
   * Format duration seconds to readable string
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const remainingSeconds = seconds % 60
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
    }
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  /**
   * Validate YouTube URL
   */
  isValidYouTubeUrl(url: string): boolean {
    try {
      return ytdl.validateURL(url)
    } catch {
      return false
    }
  }
}

export const videoDownloadService = new VideoDownloadService()

// Clean up old files on startup
videoDownloadService.cleanupOldFiles()

// Set up periodic cleanup (every hour)
setInterval(() => {
  videoDownloadService.cleanupOldFiles()
}, 60 * 60 * 1000)
