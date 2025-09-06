import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShortsEditor - AI-Powered YouTube Highlight Extractor',
  description: 'Extract the best moments from YouTube videos using Gemini AI. Perfect for creating shorts, clips, and highlights.',
  keywords: ['YouTube', 'highlights', 'shorts', 'AI', 'video editing', 'Gemini'],
  authors: [{ name: 'ShortsEditor' }],
  openGraph: {
    title: 'ShortsEditor',
    description: 'AI-Powered YouTube highlight extractor for creating perfect shorts',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
