"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { HighlightsList } from "@/components/highlights-list"
import { DownloadProgressComponent } from "@/components/download-progress"
import { VideoAnalysisResult, Highlight, AnalysisProgress } from "@/lib/gemini-service"
import { extractVideoId } from "@/lib/config"
import { getYouTubeThumbnail } from "@/lib/video-utils"
import { 
  Sparkles, 
  Youtube, 
  AlertCircle, 
  Scissors, 
  Zap, 
  Settings,
  Info,
  Trash2
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"

type AnalysisState = 'idle' | 'analyzing' | 'success' | 'error'

interface AnalysisError {
  message: string
  details?: string
}

export default function ShortsEditor() {
  const [youtubeUrl, setYoutubeUrl] = useState("")
  const [videoQuality, setVideoQuality] = useState<'lossless' | 'youtube' | 'high' | 'medium' | 'low'>('lossless')
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle')
  const [analysisResult, setAnalysisResult] = useState<VideoAnalysisResult | null>(null)
  const [analysisError, setAnalysisError] = useState<AnalysisError | null>(null)
  const [progress, setProgress] = useState(0)
  const [analysisProgressState, setAnalysisProgressState] = useState<AnalysisProgress | null>(null)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const { toast } = useToast()

  const simulateEnhancedProgress = () => {
    // Simulate realistic download progress
    const totalVideoSize = 50 * 1024 * 1024 // 50MB typical video
    let downloadedBytes = 0
    let startTime = Date.now()
    
    // Phase 1: Download simulation (0-70%)
    const downloadPhase = setInterval(() => {
      const now = Date.now()
      const elapsed = (now - startTime) / 1000
      const speed = (2 + Math.random() * 3) * 1024 * 1024 // 2-5 MB/s
      
      downloadedBytes = Math.min(downloadedBytes + (speed * 0.5), totalVideoSize * 0.7)
      const percentage = (downloadedBytes / totalVideoSize) * 100
      
      const eta = downloadedBytes > 0 ? (totalVideoSize - downloadedBytes) / speed : 0
      
      setAnalysisProgressState({
        stage: 'downloading',
        downloadProgress: {
          downloadedBytes,
          totalBytes: totalVideoSize,
          percentage,
          speed,
          eta,
          stage: 'downloading'
        }
      })
      
      if (percentage >= 70) {
        clearInterval(downloadPhase)
        
        // Complete download quickly
        setTimeout(() => {
          setAnalysisProgressState({
            stage: 'downloading',
            downloadProgress: {
              downloadedBytes: totalVideoSize,
              totalBytes: totalVideoSize,
              percentage: 100,
              speed,
              eta: 0,
              stage: 'complete'
            }
          })
          
          // Start analysis phase
          setTimeout(() => {
            let analysisProgress = 0
            const analysisPhase = setInterval(() => {
              analysisProgress += 10 + Math.random() * 15
              if (analysisProgress > 100) analysisProgress = 100
              
              setAnalysisProgressState({
                stage: 'analyzing',
                analysisProgress
              })
              
              if (analysisProgress >= 100) {
                clearInterval(analysisPhase)
                setTimeout(() => {
                  setAnalysisProgressState({
                    stage: 'complete',
                    analysisProgress: 100
                  })
                }, 500)
              }
            }, 800)
          }, 1000)
        }, 2000)
      }
    }, 500)
  }

  const handleAnalyze = async () => {
    if (!youtubeUrl.trim()) {
      toast({
        title: "URL required",
        description: "Please enter a YouTube URL",
        variant: "destructive",
      })
      return
    }

    const videoId = extractVideoId(youtubeUrl)
    if (!videoId) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid YouTube URL",
        variant: "destructive",
      })
      return
    }

    setAnalysisState('analyzing')
    setAnalysisError(null)
    setProgress(0)
    setAnalysisProgressState(null)

    // Enhanced progress simulation with realistic download and analysis phases
    simulateEnhancedProgress()

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeUrl }),
      })

      const result = await response.json()
      
      setProgress(100)
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Analysis failed')
      }

      setAnalysisResult(result.data)
      setAnalysisState('success')
      
      toast({
        title: "Analysis complete!",
        description: `Found ${result.data.totalHighlights} highlights in your video`,
      })

    } catch (error: any) {
      setAnalysisState('error')
      setAnalysisError({
        message: error.message || 'Failed to analyze video',
        details: error.details
      })
      
      toast({
        title: "Analysis failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleNewAnalysis = () => {
    setAnalysisState('idle')
    setAnalysisResult(null)
    setAnalysisError(null)
    setProgress(0)
    setYoutubeUrl("")
  }

  const handleHighlightPreview = (highlight: Highlight) => {
    // In a full implementation, you could open a modal with embedded YouTube player
    // For now, we'll just show a toast
    toast({
      title: `Preview: ${highlight.title}`,
      description: `${highlight.startTime} - ${highlight.endTime}`,
      duration: 3000,
    })
  }

  const handleClearCache = async () => {
    setIsClearingCache(true)
    
    try {
      const response = await fetch('/api/clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ clearType: 'all' }),
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to clear cache')
      }

      toast({
        title: "Cache cleared!",
        description: result.message,
        duration: 4000,
      })

    } catch (error: any) {
      console.error('Cache clear error:', error)
      toast({
        title: "Failed to clear cache",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsClearingCache(false)
    }
  }

  const videoId = extractVideoId(youtubeUrl)
  const thumbnail = videoId ? getYouTubeThumbnail(videoId) : null

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 text-white">
                <Scissors className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">ShortsEditor</h1>
                <p className="text-sm text-muted-foreground">AI-powered YouTube highlight extractor</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    disabled={isClearingCache || analysisState === 'analyzing'}
                    className="gap-2"
                  >
                    {isClearingCache ? (
                      <>
                        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Clearing...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3 h-3" />
                        Clear Cache
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Remove all cached videos to free up storage space</p>
                </TooltipContent>
              </Tooltip>
              
              <Badge variant="secondary" className="gap-1">
                <Zap className="w-3 h-3" />
                Powered by Gemini AI
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {/* URL Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="w-5 h-5 text-red-600" />
              Analyze YouTube Video
            </CardTitle>
            <CardDescription>
              Paste a YouTube URL to automatically extract highlight moments perfect for shorts
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* URL Input */}
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    disabled={analysisState === 'analyzing'}
                    className="text-base"
                  />
                  {youtubeUrl && !videoId && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      Please enter a valid YouTube URL
                    </p>
                  )}
                </div>
                
                {/* Video Quality Selector */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <Select 
                      value={videoQuality} 
                      onValueChange={(value: any) => setVideoQuality(value)}
                      disabled={analysisState === 'analyzing'}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lossless">
                          <div className="flex flex-col">
                            <span>🎯 Lossless</span>
                            <span className="text-xs text-muted-foreground">Original quality (4K/1080p)</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="youtube">
                          <div className="flex flex-col">
                            <span>📺 YouTube</span>
                            <span className="text-xs text-muted-foreground">Optimized for upload</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex flex-col">
                            <span>⬆️ High</span>
                            <span className="text-xs text-muted-foreground">4000k bitrate</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex flex-col">
                            <span>➡️ Medium</span>
                            <span className="text-xs text-muted-foreground">2000k bitrate</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="low">
                          <div className="flex flex-col">
                            <span>⬇️ Low</span>
                            <span className="text-xs text-muted-foreground">1000k bitrate</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button
                  onClick={analysisState === 'success' ? handleNewAnalysis : handleAnalyze}
                  disabled={!youtubeUrl.trim() || (!videoId && analysisState !== 'success') || analysisState === 'analyzing'}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 px-6"
                >
                  {analysisState === 'analyzing' ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                      Analyzing...
                    </>
                  ) : analysisState === 'success' ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze New Video
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Analyze Video
                    </>
                  )}
                </Button>
              </div>
              
              {/* Video Preview */}
              {thumbnail && analysisState !== 'success' && (
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                  <img
                    src={thumbnail}
                    alt="Video thumbnail"
                    className="w-20 h-12 object-cover rounded"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Video ID: {videoId}</p>
                    <p className="text-xs text-muted-foreground">Ready to analyze</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Enhanced Analysis Progress */}
            {analysisState === 'analyzing' && analysisProgressState && (
              <div className="space-y-4">
                <Separator />
                <DownloadProgressComponent progress={analysisProgressState} />
              </div>
            )}
            
            {/* Error Display */}
            {analysisState === 'error' && analysisError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">{analysisError.message}</p>
                  {analysisError.details && (
                    <p className="text-sm opacity-90">{analysisError.details}</p>
                  )}
                  <div className="flex gap-2 mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={handleAnalyze}
                      className="bg-background"
                    >
                      Try Again
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleNewAnalysis}
                    >
                      Start Over
                    </Button>
                  </div>
                </AlertDescription>
              </Alert>
            )}
            
            {/* Info Alert */}
            {analysisState === 'idle' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>How it works:</strong> Our AI analyzes your YouTube video to find the most engaging moments - 
                  sudden excitement, laughter, dramatic events - and provides precise timestamps perfect for creating shorts.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Analysis Results */}
        {analysisState === 'success' && analysisResult && (
          <HighlightsList 
            analysisResult={analysisResult}
            youtubeUrl={youtubeUrl}
            videoQuality={videoQuality}
            onHighlightPreview={handleHighlightPreview}
            className="animate-in slide-in-from-bottom duration-500"
          />
        )}
      </main>
    </div>
  )
}
