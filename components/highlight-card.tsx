"use client"

import { Highlight } from '@/lib/gemini-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  getHighlightTypeColor, 
  getHighlightTypeIcon, 
  calculateHighlightDuration,
  createYouTubeUrlWithTimestamp,
  createYouTubeEmbedUrl,
  formatDuration
} from '@/lib/video-utils'
import { ExternalLink, Play, Copy, Download } from 'lucide-react'
import { useState } from 'react'
import { useToast } from '@/hooks/use-toast'
import { HighlightDownloadProgress } from './highlight-download-progress'

interface HighlightCardProps {
  highlight: Highlight
  videoId: string
  youtubeUrl: string
  videoQuality?: 'lossless' | 'youtube' | 'high' | 'medium' | 'low'
  onPreview?: (highlight: Highlight) => void
  className?: string
}

interface DownloadProgressData {
  stage: 'downloading' | 'processing' | 'complete'
  percentage: number
  speed?: number
  downloadedBytes?: number
  totalBytes?: number
  eta?: number
}

export function HighlightCard({ highlight, videoId, youtubeUrl, videoQuality = 'lossless', onPreview, className = '' }: HighlightCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgressData | null>(null)
  const { toast } = useToast()
  
  const duration = calculateHighlightDuration(highlight)
  const typeColor = getHighlightTypeColor(highlight.type)
  const typeIcon = getHighlightTypeIcon(highlight.type)
  const ytUrl = createYouTubeUrlWithTimestamp(videoId, highlight.startSeconds)
  
  const handleCopyTimestamp = async () => {
    const timestampText = `${highlight.startTime} - ${highlight.endTime}: ${highlight.title}`
    await navigator.clipboard.writeText(timestampText)
    toast({
      title: "Copied to clipboard",
      description: "Timestamp copied successfully",
      duration: 2000,
    })
  }
  
  const handleCopyUrl = async () => {
    await navigator.clipboard.writeText(ytUrl)
    toast({
      title: "URL copied",
      description: "YouTube URL with timestamp copied to clipboard",
      duration: 2000,
    })
  }
  
  const handlePreview = () => {
    if (onPreview) {
      setIsLoading(true)
      onPreview(highlight)
      setTimeout(() => setIsLoading(false), 1000)
    }
  }

  const simulateDownloadProgress = () => {
    setDownloadProgress(null)
    
    // Estimate video segment size (smaller than full video)
    const segmentDuration = highlight.endSeconds - highlight.startSeconds
    const estimatedSize = Math.max(segmentDuration * 0.5 * 1024 * 1024, 5 * 1024 * 1024) // ~0.5MB per second, min 5MB
    
    let downloadedBytes = 0
    let startTime = Date.now()
    
    // Phase 1: Download simulation
    const downloadPhase = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const speed = (1.5 + Math.random() * 2) * 1024 * 1024 // 1.5-3.5 MB/s
      
      downloadedBytes = Math.min(downloadedBytes + (speed * 0.5), estimatedSize)
      const percentage = Math.min((downloadedBytes / estimatedSize) * 70, 70) // Download takes 70% of progress
      
      const eta = downloadedBytes > 0 ? (estimatedSize - downloadedBytes) / speed : 0
      
      setDownloadProgress({
        stage: 'downloading',
        percentage,
        speed,
        downloadedBytes,
        totalBytes: estimatedSize,
        eta
      })
      
      if (percentage >= 70) {
        clearInterval(downloadPhase)
        
        // Phase 2: Processing simulation
        setTimeout(() => {
          let processingProgress = 70
          const processingPhase = setInterval(() => {
            processingProgress += 5 + Math.random() * 10
            if (processingProgress > 100) processingProgress = 100
            
            setDownloadProgress({
              stage: 'processing',
              percentage: processingProgress
            })
            
            if (processingProgress >= 100) {
              clearInterval(processingPhase)
              setTimeout(() => {
                setDownloadProgress({
                  stage: 'complete',
                  percentage: 100
                })
                
                // Clear progress after 2 seconds
                setTimeout(() => {
                  setDownloadProgress(null)
                }, 2000)
              }, 500)
            }
          }, 400)
        }, 1000)
      }
    }, 500)
  }

  const handleDownload = async () => {
    if (isDownloading) return

    setIsDownloading(true)
    setDownloadProgress(null)
    
    toast({
      title: "Starting download...",
      description: `Processing ${highlight.title}`,
      duration: 3000,
    })

    // Start progress simulation
    simulateDownloadProgress()

    try {
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl,
          highlight,
          quality: videoQuality,
          resolution: videoQuality === 'lossless' ? 'original' : '720p'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Download failed')
      }

      // Get the blob and create download link
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${highlight.title.replace(/[^a-zA-Z0-9\s-_]/g, '').replace(/\s+/g, '_')}.mp4`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)

      toast({
        title: "Download complete!",
        description: `${highlight.title} has been downloaded`,
        duration: 3000,
      })

    } catch (error: any) {
      console.error('Download error:', error)
      toast({
        title: "Download failed",
        description: error.message || "Failed to download video clip. Please try again.",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {highlight.title}
            </CardTitle>
            <CardDescription className="mt-1 line-clamp-2">
              {highlight.description}
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="outline" className={`${typeColor} border`}>
              <span className="mr-1">{typeIcon}</span>
              {highlight.type}
            </Badge>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Timestamp and Duration Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <span className="font-mono font-medium text-primary">{highlight.startTime}</span>
              <span className="text-muted-foreground">→</span>
              <span className="font-mono font-medium text-primary">{highlight.endTime}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {formatDuration(duration)}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <div className="flex items-center">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 w-1.5 rounded-full mr-0.5 ${
                    i < Math.floor(highlight.confidence / 2) 
                      ? 'bg-green-500' 
                      : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-1">
              {highlight.confidence}/10
            </span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Button 
              onClick={handlePreview} 
              disabled={isLoading}
              variant="outline"
              className="flex-1"
            >
              <Play className="w-4 h-4 mr-2" />
              {isLoading ? 'Loading...' : 'Preview'}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(ytUrl, '_blank')}
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleCopyTimestamp}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Download Button */}
          <Button 
            onClick={handleDownload} 
            disabled={isDownloading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isDownloading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download MP4
                <Badge variant="outline" className="ml-2 bg-green-100 text-green-800 border-green-300">
                  {videoQuality === 'lossless' ? '🎯' : videoQuality === 'youtube' ? '📺' : videoQuality === 'high' ? '⬆️' : videoQuality === 'medium' ? '➡️' : '⬇️'}
                  {videoQuality}
                </Badge>
              </>
            )}
          </Button>
          
          {/* Download Progress - show below button when downloading */}
          {downloadProgress && (
            <HighlightDownloadProgress progress={downloadProgress} />
          )}
        </div>
        
        {/* Additional Info */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {duration >= 15 && duration <= 60 ? (
                <span className="text-green-600">✓ Perfect for shorts</span>
              ) : duration < 15 ? (
                <span className="text-yellow-600">⚠ Too short for shorts</span>
              ) : (
                <span className="text-orange-600">⚠ Long for shorts</span>
              )}
            </span>
            <button 
              onClick={handleCopyUrl}
              className="hover:text-foreground transition-colors"
            >
              Copy YouTube URL
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
