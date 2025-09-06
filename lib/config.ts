export const config = {
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-pro-latest',
  },
  youtube: {
    videoIdRegex: /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    thumbnailBaseUrl: 'https://img.youtube.com/vi',
  },
} as const

export function validateEnvironment() {
  const required = ['GEMINI_API_KEY']
  const missing = required.filter(key => !process.env[key])
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`)
  }
}

export function extractVideoId(url: string): string | null {
  // Multiple patterns to handle different YouTube URL formats
  const patterns = [
    // Standard youtube.com URLs
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // Short youtu.be URLs
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URLs
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Mobile URLs
    /(?:https?:\/\/)?m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ]
  
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }
  
  return null
}
