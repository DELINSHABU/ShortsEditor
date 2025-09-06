"use client"

import { Highlight, VideoAnalysisResult } from '@/lib/gemini-service'
import { HighlightCard } from './highlight-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  sortHighlightsByConfidence, 
  filterHighlightsByConfidence,
  groupHighlightsByType,
  exportHighlightsToJson,
  exportHighlightsToTimestampList,
  exportHighlightsToYouTubeDescription
} from '@/lib/video-utils'
import { 
  Download, 
  Filter, 
  SortDesc, 
  Clock, 
  Target,
  FileText,
  Youtube,
  Sparkles,
  MessageSquare,
  Quote,
  Copy,
  Loader2
} from 'lucide-react'
import { useState, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SummaryResult {
  success: boolean
  videoId: string
  videoUrl: string
  summary: string
  keyQuotes?: string
  metadata: {
    transcriptEntries: number
    totalDuration: number
    summaryLength: number
    compressionRatio: number
  }
}

interface HighlightsListProps {
  analysisResult: VideoAnalysisResult
  youtubeUrl: string
  videoQuality?: 'lossless' | 'youtube' | 'high' | 'medium' | 'low'
  onHighlightPreview?: (highlight: Highlight) => void
  className?: string
}

export function HighlightsList({ analysisResult, youtubeUrl, videoQuality = 'lossless', onHighlightPreview, className = '' }: HighlightsListProps) {
  const [sortBy, setSortBy] = useState<'confidence' | 'time' | 'type'>('confidence')
  const [filterType, setFilterType] = useState<'all' | Highlight['type']>('all')
  const [minConfidence, setMinConfidence] = useState(6)
  const { toast } = useToast()
  
  // Video summarizer state
  const [summaryResult, setSummaryResult] = useState<SummaryResult | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)

  const filteredAndSortedHighlights = useMemo(() => {
    let highlights = [...analysisResult.highlights]
    
    // Filter by type
    if (filterType !== 'all') {
      highlights = highlights.filter(h => h.type === filterType)
    }
    
    // Filter by confidence
    highlights = filterHighlightsByConfidence(highlights, minConfidence)
    
    // Sort
    switch (sortBy) {
      case 'confidence':
        highlights = sortHighlightsByConfidence(highlights)
        break
      case 'time':
        highlights = highlights.sort((a, b) => a.startSeconds - b.startSeconds)
        break
      case 'type':
        highlights = highlights.sort((a, b) => a.type.localeCompare(b.type))
        break
    }
    
    return highlights
  }, [analysisResult.highlights, sortBy, filterType, minConfidence])

  const highlightsByType = useMemo(() => 
    groupHighlightsByType(analysisResult.highlights), 
    [analysisResult.highlights]
  )

  const exportToFormat = (format: 'json' | 'timestamps' | 'youtube') => {
    let content = ''
    let filename = ''
    
    switch (format) {
      case 'json':
        content = exportHighlightsToJson(filteredAndSortedHighlights)
        filename = `highlights-${analysisResult.videoId}.json`
        break
      case 'timestamps':
        content = exportHighlightsToTimestampList(filteredAndSortedHighlights)
        filename = `timestamps-${analysisResult.videoId}.txt`
        break
      case 'youtube':
        content = exportHighlightsToYouTubeDescription(filteredAndSortedHighlights, analysisResult.videoId)
        filename = `youtube-description-${analysisResult.videoId}.txt`
        break
    }
    
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    
    toast({
      title: "Export successful",
      description: `Highlights exported as ${format.toUpperCase()}`,
      duration: 3000,
    })
  }

  // Video summarizer functions
  const handleSummarizeVideo = async (summaryType: string = 'detailed') => {
    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          youtubeUrl,
          summaryType
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to summarize video')
      }

      setSummaryResult(result.data)
      toast({
        title: "Summary generated!",
        description: `Video successfully summarized with ${result.data.metadata.transcriptEntries} transcript entries`,
      })

    } catch (error: any) {
      setSummaryError(error.message || 'Failed to generate summary')
      toast({
        title: "Summary failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSummaryLoading(false)
    }
  }

  const handleCopySummary = async () => {
    if (!summaryResult) return
    
    const text = `YouTube Video Summary\n=====================\n\nVideo ID: ${summaryResult.videoId}\nGenerated: ${new Date().toLocaleString()}\n\nSUMMARY:\n${summaryResult.summary}\n\n${summaryResult.keyQuotes ? `KEY QUOTES:\n${summaryResult.keyQuotes}\n\n` : ''}Powered by ShortsEditor AI`

    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Summary copied!",
        description: "Summary has been copied to your clipboard",
      })
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy summary to clipboard",
        variant: "destructive",
      })
    }
  }

  if (analysisResult.totalHighlights === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No highlights found</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            The AI couldn't identify any highlight-worthy moments in this video. 
            Try analyzing a different video or adjusting the analysis parameters.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-500" />
                Analysis Results
              </CardTitle>
              <CardDescription>
                {analysisResult.title && `${analysisResult.title} • `}
                Processed in {(analysisResult.processingTime / 1000).toFixed(1)}s
                {analysisResult.duration && ` • Duration: ${analysisResult.duration}`}
              </CardDescription>
            </div>
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {analysisResult.totalHighlights} highlights
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {Object.entries(highlightsByType).map(([type, highlights]) => (
              <div key={type} className="text-center">
                <div className="text-2xl font-bold text-primary">{highlights.length}</div>
                <div className="text-sm text-muted-foreground capitalize">{type}</div>
              </div>
            ))}
          </div>
          
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <SortDesc className="w-4 h-4" />
              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="confidence">Confidence</SelectItem>
                  <SelectItem value="time">Timeline</SelectItem>
                  <SelectItem value="type">Type</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="funny">Funny</SelectItem>
                  <SelectItem value="exciting">Exciting</SelectItem>
                  <SelectItem value="dramatic">Dramatic</SelectItem>
                  <SelectItem value="educational">Educational</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Min confidence:</span>
              <Select value={minConfidence.toString()} onValueChange={(value) => setMinConfidence(Number(value))}>
                <SelectTrigger className="w-16">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                    <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator orientation="vertical" className="h-6" />
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToFormat('json')}
              >
                <Download className="w-4 h-4 mr-2" />
                JSON
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToFormat('timestamps')}
              >
                <FileText className="w-4 h-4 mr-2" />
                Timestamps
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => exportToFormat('youtube')}
              >
                <Youtube className="w-4 h-4 mr-2" />
                Description
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAndSortedHighlights.length === 0 ? (
          <Card className="md:col-span-2">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Filter className="w-8 h-8 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No highlights match your filters</h3>
              <p className="text-sm text-muted-foreground text-center">
                Try adjusting the confidence threshold or type filter to see more results.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredAndSortedHighlights.map((highlight) => (
            <HighlightCard
              key={highlight.id}
              highlight={highlight}
              videoId={analysisResult.videoId}
              youtubeUrl={youtubeUrl}
              videoQuality={videoQuality}
              onPreview={onHighlightPreview}
            />
          ))
        )}
      </div>
      
      {/* Highlights Summary & Video Summarizer */}
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="highlights" className="w-full">
            <div className="border-b px-6 pt-6">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="highlights" className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Highlights Summary
                </TabsTrigger>
                <TabsTrigger value="summarize" className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Video Summary
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="highlights" className="px-6 pb-6 mt-0">
              <div className="pt-4">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>
                    Showing {filteredAndSortedHighlights.length} of {analysisResult.totalHighlights} highlights
                  </span>
                </div>
                
                {/* Additional highlights stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/20 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-primary">{analysisResult.totalHighlights}</div>
                    <div className="text-xs text-muted-foreground">Total Found</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{filteredAndSortedHighlights.length}</div>
                    <div className="text-xs text-muted-foreground">Currently Shown</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">{analysisResult.duration || 'N/A'}</div>
                    <div className="text-xs text-muted-foreground">Video Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">{(analysisResult.processingTime / 1000).toFixed(1)}s</div>
                    <div className="text-xs text-muted-foreground">Analysis Time</div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="summarize" className="px-6 pb-6 mt-0">
              <div className="pt-4 space-y-4">
                {!summaryResult && !summaryLoading && (
                  <div className="text-center space-y-4">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3 className="font-medium mb-2">Generate Video Summary</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create an AI-powered summary of this video with key insights and timestamps
                      </p>
                      <div className="flex gap-2 justify-center flex-wrap">
                        <Button 
                          onClick={() => handleSummarizeVideo('brief')} 
                          variant="outline" 
                          size="sm"
                        >
                          Brief Summary
                        </Button>
                        <Button 
                          onClick={() => handleSummarizeVideo('detailed')} 
                          size="sm"
                        >
                          Detailed Analysis
                        </Button>
                        <Button 
                          onClick={() => handleSummarizeVideo('key_points')} 
                          variant="outline" 
                          size="sm"
                        >
                          Key Points
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
                
                {summaryLoading && (
                  <div className="text-center space-y-4 py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                    <div>
                      <h3 className="font-medium">Generating Summary...</h3>
                      <p className="text-sm text-muted-foreground">
                        Analyzing video transcript with AI. This may take a moment.
                      </p>
                    </div>
                  </div>
                )}
                
                {summaryError && (
                  <Alert variant="destructive">
                    <AlertDescription className="space-y-2">
                      <p className="font-medium">Summary Generation Failed</p>
                      <p className="text-sm opacity-90">{summaryError}</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => handleSummarizeVideo('detailed')}
                        className="bg-background mt-2"
                      >
                        Try Again
                      </Button>
                    </AlertDescription>
                  </Alert>
                )}
                
                {summaryResult && (
                  <div className="space-y-4">
                    {/* Summary Metadata */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/20 rounded-lg">
                      <div className="text-center">
                        <div className="text-lg font-semibold text-blue-600">{summaryResult.metadata.transcriptEntries}</div>
                        <div className="text-xs text-muted-foreground">Transcript Lines</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-green-600">{Math.round(summaryResult.metadata.totalDuration)}s</div>
                        <div className="text-xs text-muted-foreground">Duration</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-purple-600">{summaryResult.metadata.summaryLength}</div>
                        <div className="text-xs text-muted-foreground">Summary Length</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-orange-600">{(summaryResult.metadata.compressionRatio * 100).toFixed(1)}%</div>
                        <div className="text-xs text-muted-foreground">Compression</div>
                      </div>
                    </div>
                    
                    {/* Main Summary */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Video Summary
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleCopySummary}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                      <Textarea 
                        value={summaryResult.summary} 
                        readOnly 
                        className="min-h-[120px] resize-none" 
                      />
                    </div>
                    
                    {/* Key Quotes */}
                    {summaryResult.keyQuotes && (
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center gap-2">
                          <Quote className="w-4 h-4" />
                          Key Quotes
                        </h4>
                        <Textarea 
                          value={summaryResult.keyQuotes} 
                          readOnly 
                          className="min-h-[80px] resize-none" 
                        />
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2 justify-center pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          setSummaryResult(null)
                          setSummaryError(null)
                        }}
                      >
                        New Summary
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSummarizeVideo('brief')}
                      >
                        Brief Version
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleSummarizeVideo('key_points')}
                      >
                        Key Points
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
