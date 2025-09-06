import { Highlight } from './gemini-service'

/**
 * Convert seconds to MM:SS format
 */
export function secondsToTimestamp(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Convert MM:SS format to seconds
 */
export function timestampToSeconds(timestamp: string): number {
  const [minutes, seconds] = timestamp.split(':').map(Number)
  return minutes * 60 + seconds
}

/**
 * Format duration for display (handles hours too)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * Get YouTube video thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'maxresdefault'): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

/**
 * Create YouTube URL with timestamp
 */
export function createYouTubeUrlWithTimestamp(videoId: string, startSeconds: number): string {
  return `https://www.youtube.com/watch?v=${videoId}&t=${startSeconds}s`
}

/**
 * Create YouTube embed URL with timestamp and parameters
 */
export function createYouTubeEmbedUrl(videoId: string, startSeconds?: number, endSeconds?: number): string {
  const baseUrl = `https://www.youtube.com/embed/${videoId}`
  const params = new URLSearchParams()
  
  if (startSeconds) {
    params.append('start', startSeconds.toString())
  }
  
  if (endSeconds) {
    params.append('end', endSeconds.toString())
  }
  
  // Add some useful parameters for shorts/highlights
  params.append('autoplay', '0')
  params.append('modestbranding', '1')
  params.append('rel', '0')
  
  return `${baseUrl}?${params.toString()}`
}

/**
 * Extract video title from YouTube API (mock implementation)
 */
export async function getYouTubeVideoTitle(videoId: string): Promise<string> {
  // In production, you would use YouTube Data API v3
  // For now, return a placeholder
  return `Video ${videoId.substring(0, 8)}`
}

/**
 * Sort highlights by confidence score
 */
export function sortHighlightsByConfidence(highlights: Highlight[]): Highlight[] {
  return highlights.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Filter highlights by minimum confidence
 */
export function filterHighlightsByConfidence(highlights: Highlight[], minConfidence: number = 6): Highlight[] {
  return highlights.filter(highlight => highlight.confidence >= minConfidence)
}

/**
 * Group highlights by type
 */
export function groupHighlightsByType(highlights: Highlight[]): Record<string, Highlight[]> {
  return highlights.reduce((groups, highlight) => {
    const type = highlight.type
    if (!groups[type]) {
      groups[type] = []
    }
    groups[type].push(highlight)
    return groups
  }, {} as Record<string, Highlight[]>)
}

/**
 * Get highlight type color for UI
 */
export function getHighlightTypeColor(type: Highlight['type']): string {
  const colors = {
    funny: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    exciting: 'bg-red-100 text-red-800 border-red-200',
    dramatic: 'bg-purple-100 text-purple-800 border-purple-200',
    educational: 'bg-blue-100 text-blue-800 border-blue-200',
    other: 'bg-gray-100 text-gray-800 border-gray-200'
  }
  return colors[type] || colors.other
}

/**
 * Get highlight type icon
 */
export function getHighlightTypeIcon(type: Highlight['type']): string {
  const icons = {
    funny: '😂',
    exciting: '🚀',
    dramatic: '🎭',
    educational: '🎓',
    other: '⭐'
  }
  return icons[type] || icons.other
}

/**
 * Calculate highlight duration
 */
export function calculateHighlightDuration(highlight: Highlight): number {
  return highlight.endSeconds - highlight.startSeconds
}

/**
 * Validate highlight duration for shorts (should be 15-60 seconds)
 */
export function isValidShortDuration(highlight: Highlight): boolean {
  const duration = calculateHighlightDuration(highlight)
  return duration >= 15 && duration <= 60
}

/**
 * Export highlights to various formats
 */
export function exportHighlightsToJson(highlights: Highlight[]): string {
  return JSON.stringify(highlights, null, 2)
}

export function exportHighlightsToTimestampList(highlights: Highlight[]): string {
  return highlights
    .map(h => `${h.startTime} - ${h.endTime}: ${h.title}`)
    .join('\n')
}

export function exportHighlightsToYouTubeDescription(highlights: Highlight[], videoId: string): string {
  const lines = [
    '🎬 Video Highlights:',
    '',
    ...highlights.map(h => {
      const url = createYouTubeUrlWithTimestamp(videoId, h.startSeconds)
      return `${h.startTime} - ${h.title} ${url}`
    }),
    '',
    '✂️ Generated by ShortsEditor'
  ]
  return lines.join('\n')
}
