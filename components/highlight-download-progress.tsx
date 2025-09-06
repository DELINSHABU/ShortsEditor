"use client"

import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Download, Sparkles, CheckCircle, Timer, Gauge, HardDrive } from "lucide-react"

interface DownloadProgressData {
  stage: 'downloading' | 'processing' | 'complete'
  percentage: number
  speed?: number // bytes per second
  downloadedBytes?: number
  totalBytes?: number
  eta?: number // seconds
}

interface HighlightDownloadProgressProps {
  progress: DownloadProgressData
  className?: string
}

export function HighlightDownloadProgress({ progress, className = "" }: HighlightDownloadProgressProps) {
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
  }

  const formatSpeed = (bytesPerSecond: number): string => {
    return `${formatBytes(bytesPerSecond)}/s`
  }

  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round(seconds % 60)
    return `${minutes}m ${remainingSeconds}s`
  }

  const getStageInfo = () => {
    switch (progress.stage) {
      case 'downloading':
        return {
          icon: <Download className="w-3 h-3 text-blue-500" />,
          text: 'Downloading video...',
          color: 'text-blue-600'
        }
      case 'processing':
        return {
          icon: <Sparkles className="w-3 h-3 text-purple-500" />,
          text: 'Processing video...',
          color: 'text-purple-600'
        }
      case 'complete':
        return {
          icon: <CheckCircle className="w-3 h-3 text-green-500" />,
          text: 'Download ready!',
          color: 'text-green-600'
        }
      default:
        return {
          icon: <Timer className="w-3 h-3 text-gray-500" />,
          text: 'Processing...',
          color: 'text-gray-600'
        }
    }
  }

  const stageInfo = getStageInfo()

  return (
    <div className={`space-y-2 p-3 bg-muted/30 rounded-lg border ${className}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {stageInfo.icon}
          <span className={`text-sm font-medium ${stageInfo.color}`}>
            {stageInfo.text}
          </span>
        </div>
        <Badge variant="outline" className="text-xs">
          {Math.round(progress.percentage)}%
        </Badge>
      </div>

      {/* Progress Bar */}
      <Progress value={progress.percentage} className="h-2" />

      {/* Download Details (only show during download) */}
      {progress.stage === 'downloading' && progress.speed !== undefined && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {progress.downloadedBytes !== undefined && progress.totalBytes !== undefined && (
              <div className="flex items-center gap-1">
                <HardDrive className="w-3 h-3" />
                <span>{formatBytes(progress.downloadedBytes)} / {formatBytes(progress.totalBytes)}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span className="text-blue-600 font-mono">{formatSpeed(progress.speed)}</span>
            </div>
          </div>
          {progress.eta !== undefined && progress.eta > 0 && (
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <span>ETA: {formatTime(progress.eta)}</span>
            </div>
          )}
        </div>
      )}

      {/* Processing Message */}
      {progress.stage === 'processing' && (
        <div className="text-center text-xs text-muted-foreground">
          Creating high-quality video clip...
        </div>
      )}

      {/* Complete Message */}
      {progress.stage === 'complete' && (
        <div className="text-center text-xs text-green-600 bg-green-50 rounded py-1">
          Video clip ready for download!
        </div>
      )}
    </div>
  )
}
