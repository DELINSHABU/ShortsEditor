"use client"

import { Progress } from "@/components/ui/progress"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Download, Sparkles, CheckCircle, Timer, Gauge, HardDrive } from "lucide-react"
import { AnalysisProgress, DownloadProgress } from "@/lib/gemini-service"

interface DownloadProgressComponentProps {
  progress: AnalysisProgress
  className?: string
}

export function DownloadProgressComponent({ progress, className = "" }: DownloadProgressComponentProps) {
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

  const getStageIcon = () => {
    switch (progress.stage) {
      case 'downloading':
        return <Download className="w-4 h-4 text-blue-500" />
      case 'analyzing':
        return <Sparkles className="w-4 h-4 text-purple-500" />
      case 'complete':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Timer className="w-4 h-4 text-gray-500" />
    }
  }

  const getStageText = () => {
    switch (progress.stage) {
      case 'downloading':
        return 'Downloading video...'
      case 'analyzing':
        return 'Analyzing with AI...'
      case 'complete':
        return 'Analysis complete!'
      default:
        return 'Processing...'
    }
  }

  const getStageColor = () => {
    switch (progress.stage) {
      case 'downloading':
        return 'text-blue-600'
      case 'analyzing':
        return 'text-purple-600'
      case 'complete':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const getCurrentProgress = () => {
    if (progress.stage === 'downloading' && progress.downloadProgress) {
      return progress.downloadProgress.percentage
    }
    if (progress.stage === 'analyzing' && progress.analysisProgress !== undefined) {
      return progress.analysisProgress
    }
    if (progress.stage === 'complete') {
      return 100
    }
    return 0
  }

  return (
    <Card className={`${className}`}>
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Stage Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStageIcon()}
              <span className={`font-medium ${getStageColor()}`}>
                {getStageText()}
              </span>
            </div>
            <Badge variant="outline" className="gap-1">
              <Timer className="w-3 h-3" />
              {Math.round(getCurrentProgress())}%
            </Badge>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={getCurrentProgress()} 
            className="h-3"
          />

          {/* Download Details */}
          {progress.stage === 'downloading' && progress.downloadProgress && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-gray-500" />
                    <span className="text-muted-foreground">Size:</span>
                    <span className="font-mono">
                      {formatBytes(progress.downloadProgress.downloadedBytes)} / {formatBytes(progress.downloadProgress.totalBytes)}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-gray-500" />
                    <span className="text-muted-foreground">Speed:</span>
                    <span className="font-mono text-blue-600">
                      {formatSpeed(progress.downloadProgress.speed)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-gray-500" />
                    <span className="text-muted-foreground">ETA:</span>
                    <span className="font-mono">
                      {progress.downloadProgress.eta > 0 ? formatTime(progress.downloadProgress.eta) : 'Calculating...'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 flex items-center justify-center">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="text-blue-600 font-medium">
                      {progress.downloadProgress.stage === 'downloading' ? 'Active' : 'Processing'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Analysis Details */}
          {progress.stage === 'analyzing' && (
            <>
              <Separator />
              <div className="flex items-center justify-center text-sm text-muted-foreground">
                <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
                AI is analyzing video content for highlight moments...
              </div>
            </>
          )}

          {/* Completion Message */}
          {progress.stage === 'complete' && (
            <>
              <Separator />
              <div className="flex items-center justify-center text-sm text-green-600 bg-green-50 rounded-lg py-2">
                <CheckCircle className="w-4 h-4 mr-2" />
                Video analysis completed successfully!
              </div>
            </>
          )}

          {/* Progress Text */}
          <div className="text-xs text-center text-muted-foreground">
            {progress.stage === 'downloading' && 'Large videos may take several minutes to download'}
            {progress.stage === 'analyzing' && 'This may take 30-60 seconds depending on video length'}
            {progress.stage === 'complete' && 'Ready to view highlights'}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
