import { NextRequest, NextResponse } from 'next/server'
import { videoDownloadService } from '@/lib/video-download'
import { videoCroppingService } from '@/lib/video-cropping'
import * as fs from 'fs'
import * as path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('Cache clearing request received')
    
    const body = await request.json().catch(() => ({}))
    const { clearType = 'all' } = body // 'all', 'downloads', 'cropped'
    
    let clearedFiles = 0
    let totalSize = 0
    const results: { type: string; files: number; size: number }[] = []
    
    // Clear downloaded video cache
    if (clearType === 'all' || clearType === 'downloads') {
      const downloadTempDir = path.join(process.cwd(), 'tmp', 'videos')
      const downloadResult = await clearDirectory(downloadTempDir, 'downloaded videos')
      if (downloadResult) {
        results.push(downloadResult)
        clearedFiles += downloadResult.files
        totalSize += downloadResult.size
      }
      
      // Force cleanup through the video download service
      await videoDownloadService.cleanupOldFiles()
    }
    
    // Clear cropped video cache
    if (clearType === 'all' || clearType === 'cropped') {
      const croppedTempDir = path.join(process.cwd(), 'tmp', 'cropped')
      const croppedResult = await clearDirectory(croppedTempDir, 'cropped videos')
      if (croppedResult) {
        results.push(croppedResult)
        clearedFiles += croppedResult.files
        totalSize += croppedResult.size
      }
      
      // Force cleanup through the video cropping service
      await videoCroppingService.cleanupOldFiles()
    }
    
    // Clear any other temporary directories
    if (clearType === 'all') {
      const tempDir = path.join(process.cwd(), 'tmp')
      const otherDirs = ['uploads', 'processing', 'temp']
      
      for (const dir of otherDirs) {
        const dirPath = path.join(tempDir, dir)
        const dirResult = await clearDirectory(dirPath, dir)
        if (dirResult) {
          results.push(dirResult)
          clearedFiles += dirResult.files
          totalSize += dirResult.size
        }
      }
    }
    
    const message = clearedFiles > 0 
      ? `Successfully cleared ${clearedFiles} files (${formatBytes(totalSize)})`
      : 'No cached files found to clear'
    
    console.log(`Cache clear completed: ${message}`)
    
    return NextResponse.json({
      success: true,
      message,
      details: {
        filesCleared: clearedFiles,
        totalSizeCleared: totalSize,
        formattedSize: formatBytes(totalSize),
        breakdown: results
      }
    })
    
  } catch (error: any) {
    console.error('Cache clear error:', error)
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to clear cache',
        message: error.message || 'An error occurred while clearing the cache',
        details: error.stack
      },
      { status: 500 }
    )
  }
}

/**
 * Clear all files in a directory
 */
async function clearDirectory(dirPath: string, description: string): Promise<{ type: string; files: number; size: number } | null> {
  try {
    if (!fs.existsSync(dirPath)) {
      console.log(`Directory does not exist: ${dirPath}`)
      return null
    }
    
    const files = fs.readdirSync(dirPath)
    let fileCount = 0
    let totalSize = 0
    
    for (const file of files) {
      const filePath = path.join(dirPath, file)
      const stats = fs.statSync(filePath)
      
      if (stats.isFile()) {
        totalSize += stats.size
        fs.unlinkSync(filePath)
        fileCount++
        console.log(`Deleted: ${filePath} (${formatBytes(stats.size)})`)
      } else if (stats.isDirectory()) {
        // Recursively clear subdirectories
        const subResult = await clearDirectory(filePath, `${description}/${file}`)
        if (subResult) {
          fileCount += subResult.files
          totalSize += subResult.size
        }
        
        // Remove empty directory
        try {
          fs.rmdirSync(filePath)
          console.log(`Removed empty directory: ${filePath}`)
        } catch (err) {
          // Directory might not be empty, ignore error
        }
      }
    }
    
    if (fileCount > 0) {
      console.log(`Cleared ${fileCount} ${description} files (${formatBytes(totalSize)})`)
      return {
        type: description,
        files: fileCount,
        size: totalSize
      }
    }
    
    return null
    
  } catch (error: any) {
    console.error(`Error clearing directory ${dirPath}:`, error)
    throw error
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

export async function GET() {
  return NextResponse.json({
    message: 'Cache Clear API',
    version: '1.0.0',
    endpoints: {
      POST: 'Clear cached video files'
    },
    supportedTypes: ['all', 'downloads', 'cropped'],
    description: 'Clears temporary video files from the server cache to free up storage space'
  })
}
