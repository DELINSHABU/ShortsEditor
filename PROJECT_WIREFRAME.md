# ShortsEditor - Project Infrastructure Wireframe 🎬✂️

## Project Overview
**ShortsEditor** is an AI-powered YouTube highlight extractor that uses Google's Gemini AI to automatically identify the most engaging moments in videos, perfect for creating shorts, clips, and highlights.

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                 USER INTERFACE                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Next.js Frontend (React 19 + TypeScript)                                      │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│  │   Input Form    │ │  Analysis Progress│ │      Highlights List            │ │
│  │ • YouTube URL   │ │ • Download Status │ │ • Timestamped Clips            │ │
│  │ • Quality Opts  │ │ • AI Processing   │ │ • Confidence Scores            │ │
│  │ • Analyze Btn   │ │ • Real-time Feed  │ │ • Export Options               │ │
│  └─────────────────┘ └──────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              API LAYER                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Next.js API Routes (/api/)                                                    │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│  │  /api/analyze   │ │ /api/download    │ │    /api/clear-cache             │ │
│  │ • Video Analysis│ │ • MP4 Generation │ │ • Cache Management              │ │
│  │ • Gemini Integration │ • FFmpeg Proc │ │ • Storage Cleanup               │ │
│  └─────────────────┘ └──────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            SERVICE LAYER                                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│  Core Business Logic (TypeScript)                                              │
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│  │ Gemini Service  │ │  Video Processing│ │    Utility Services             │ │
│  │ • AI Analysis   │ │ • Download (ytdl)│ │ • Config Management             │ │
│  │ • Prompt Eng.   │ │ • Cropping FFmpeg│ │ • File Operations               │ │
│  │ • Result Parse  │ │ • Quality Opts   │ │ • Error Handling                │ │
│  └─────────────────┘ └──────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          EXTERNAL SERVICES                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐ ┌──────────────────┐ ┌─────────────────────────────────┐ │
│  │  Google Gemini  │ │    YouTube       │ │      File System                │ │
│  │ • Video Analysis│ │ • Video Metadata │ │ • Temp Video Storage            │ │
│  │ • AI Processing │ │ • Thumbnail URLs │ │ • Cache Management              │ │
│  │ • Content Class.│ │ • Video Download │ │ • Export Files                  │ │
│  └─────────────────┘ └──────────────────┘ └─────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Project Structure Breakdown

### **Frontend Application (Next.js)**
```
app/
├── layout.tsx              # Root layout with theme provider
├── page.tsx                # Main ShortsEditor interface
└── globals.css             # Global styles
```

### **Components Architecture**
```
components/
├── ui/                     # Reusable UI primitives (Radix + Tailwind)
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   └── ...
├── theme-provider.tsx      # Dark/light theme management
├── highlights-list.tsx     # Main highlights display component
├── highlight-card.tsx      # Individual highlight item
├── download-progress.tsx   # Real-time progress tracking
└── highlight-download-progress.tsx
```

### **Backend Services**
```
lib/
├── gemini-service.ts       # Google Gemini AI integration
├── video-utils.ts          # YouTube video utilities
├── video-download.ts       # ytdl-core video downloading
├── video-cropping.ts       # FFmpeg video processing
├── config.ts              # Environment & configuration
├── prompt-templates.ts     # AI prompt engineering
└── utils.ts               # General utilities
```

### **API Endpoints**
```
/api/
├── analyze                 # Main video analysis endpoint
├── download               # Video clip download & processing
└── clear-cache            # Cache management endpoint
```

---

## 🔄 Data Flow Architecture

### **1. User Input Processing**
```
User Input → URL Validation → Video ID Extraction → Thumbnail Preview
     │
     ▼
Quality Selection → Analysis Trigger → Progress Tracking
```

### **2. Video Analysis Pipeline**
```
YouTube URL → Video Download (ytdl-core) → Gemini AI Analysis → Results Processing
     │              │                           │                    │
     ▼              ▼                           ▼                    ▼
Video Metadata → Temp Storage → Content Analysis → Highlight Extraction
     │              │                           │                    │
     ▼              ▼                           ▼                    ▼
Duration Info → File Caching → AI Confidence → Timestamp Generation
```

### **3. Highlights Generation**
```
Raw Analysis → Highlight Parsing → Confidence Scoring → Category Classification
     │               │                    │                    │
     ▼               ▼                    ▼                    ▼
Time Segments → Title Generation → Quality Rating → Type Assignment
     │               │                    │                    │
     ▼               ▼                    ▼                    ▼
Start/End Times → Description → Suitability Score → UI Display
```

### **4. Download & Export**
```
Highlight Selection → Video Cropping (FFmpeg) → Quality Processing → File Export
     │                      │                       │                 │
     ▼                      ▼                       ▼                 ▼
Time Range → Segment Extraction → Bitrate Encoding → MP4 Generation
     │                      │                       │                 │
     ▼                      ▼                       ▼                 ▼
User Choice → Temp Processing → Compression → Download Delivery
```

---

## 🧩 Component Interaction Map

```
                 ┌─────────────────────────────────────────┐
                 │              Main Page                  │
                 │            (page.tsx)                   │
                 └───────────────┬─────────────────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
        ▼                        ▼                        ▼
┌──────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│  Input Form  │    │  Progress Tracker   │    │ Highlights List │
│              │    │                     │    │                 │
│ • URL Input  │    │ • Download Status   │    │ • Cards Display │
│ • Quality    │    │ • AI Processing     │    │ • Filter/Sort   │
│ • Analyze    │    │ • Real-time Updates │    │ • Export Opts   │
└──────┬───────┘    └─────────┬───────────┘    └────────┬────────┘
       │                      │                         │
       ▼                      ▼                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    Service Layer                               │
│                                                                │
│  Gemini Service ← → Video Utils ← → Download Service          │
│       │                 │                    │                │
│       ▼                 ▼                    ▼                │
│  AI Analysis      Metadata Fetch      Video Processing        │
└────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technology Stack Map

### **Frontend Stack**
```
┌─────────────────────────────────────────────────────────┐
│                    Frontend                             │
├─────────────────────────────────────────────────────────┤
│ Framework:     Next.js 15 + React 19 + TypeScript      │
│ Styling:       Tailwind CSS + CSS Variables            │
│ Components:    Radix UI (Accessible primitives)        │
│ Icons:         Lucide React                             │
│ Themes:        next-themes (Dark/Light)                 │
│ Forms:         react-hook-form + zod validation        │
│ Animations:    tailwindcss-animate                      │
│ Notifications: sonner (Toast system)                    │
└─────────────────────────────────────────────────────────┘
```

### **Backend Stack**
```
┌─────────────────────────────────────────────────────────┐
│                     Backend                             │
├─────────────────────────────────────────────────────────┤
│ Runtime:       Node.js                                  │
│ API:           Next.js API Routes                       │
│ AI Service:    Google Generative AI (Gemini)           │
│ Video:         @distube/ytdl-core + fluent-ffmpeg      │
│ Processing:    FFmpeg (video cropping/encoding)        │
│ Validation:    zod schemas                              │
│ Utils:         date-fns, clsx, class-variance-authority │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Features & Capabilities Matrix

### **Core Features**
| Feature | Implementation | Status | Dependencies |
|---------|---------------|---------|--------------|
| **YouTube URL Input** | React form with validation | ✅ Complete | zod, react-hook-form |
| **Video Analysis** | Gemini AI integration | ✅ Complete | @google/generative-ai |
| **Progress Tracking** | Real-time status updates | ✅ Complete | React state management |
| **Highlights Display** | Card-based UI with filtering | ✅ Complete | Radix UI components |
| **Video Download** | ytdl-core + FFmpeg | ✅ Complete | @distube/ytdl-core, fluent-ffmpeg |
| **Quality Selection** | Multiple bitrate options | ✅ Complete | FFmpeg encoding |
| **Export Options** | JSON, timestamps, descriptions | ✅ Complete | File system operations |
| **Cache Management** | Temporary file cleanup | ✅ Complete | Node.js fs operations |
| **Theme Support** | Dark/light mode toggle | ✅ Complete | next-themes |
| **Mobile Responsive** | Tailwind responsive design | ✅ Complete | Tailwind CSS |

### **Advanced Features**
| Feature | Implementation | Status | Notes |
|---------|---------------|---------|--------|
| **AI Confidence Scoring** | Gemini analysis rating | ✅ Complete | 1-10 scale scoring |
| **Content Classification** | Type-based categorization | ✅ Complete | Funny, Exciting, Dramatic, Educational |
| **Timestamp Precision** | Exact start/end times | ✅ Complete | MM:SS format support |
| **Batch Processing** | Multiple video analysis | 🔄 Planned | Future enhancement |
| **User Authentication** | Account management | 🔄 Planned | For quota management |
| **Database Storage** | Persistent results | 🔄 Planned | Analysis caching |
| **Real Video Processing** | Actual Gemini video analysis | 🔄 In Progress | Currently simulated |

---

## 🎭 YouTube Summarizer Subsystem

### **Parallel Python Implementation**
```
youtube-summarizer/
├── src/
│   ├── youtube_extractor.py      # Transcript extraction
│   ├── gemini_summarizer.py      # AI summarization  
│   ├── main_summarizer.py        # Orchestration
│   └── config.py                 # Configuration
├── webapp/
│   └── app.py                    # Flask web interface
├── cli.py                        # Command-line interface
└── requirements.txt              # Python dependencies
```

**Integration Points:**
- Shared Gemini AI service
- Common YouTube video processing
- Complementary transcript analysis
- Alternative CLI/web interfaces

---

## 🚀 Deployment Architecture

### **Development Environment**
```
Local Development
├── Next.js Dev Server (localhost:3000)
├── Python Flask App (localhost:5000)  
├── Environment Variables (.env.local)
└── File System Cache (temp/)
```

### **Production Considerations**
```
Production Stack
├── Frontend: Vercel/Netlify deployment
├── API: Serverless functions or Node.js server
├── Storage: Cloud storage for video caching
├── Database: PostgreSQL/MongoDB for results
├── AI: Google Gemini API (rate limited)
└── CDN: Video/asset delivery optimization
```

---

## 🔒 Security & Performance

### **Security Measures**
- Environment variable protection (API keys)
- Input validation (YouTube URL verification)
- Rate limiting (API quota management)
- Temporary file cleanup (cache management)
- Error handling (graceful failures)

### **Performance Optimizations**
- Video caching (avoid re-downloads)
- Progress tracking (user experience)
- Chunk processing (large video handling)
- Quality selection (bandwidth optimization)
- Lazy loading (UI components)

---

## 📈 Future Roadmap

### **Phase 1: Core Enhancement**
- [ ] Real Gemini video analysis implementation
- [ ] Database integration for result storage
- [ ] User authentication system
- [ ] Enhanced error handling and retry mechanisms

### **Phase 2: Advanced Features**
- [ ] Batch video processing
- [ ] Custom AI prompt templates
- [ ] Advanced export formats
- [ ] Integration with social media platforms

### **Phase 3: Scale & Integration**
- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] API for third-party integrations
- [ ] Enterprise features and quotas

---

## 🎯 Key Integration Points

### **AI Services**
- **Primary**: Google Gemini 1.5 Pro
- **Backup**: OpenAI GPT (via ai-sdk)
- **Processing**: Content analysis, highlight detection

### **Video Services**
- **Download**: YouTube video extraction
- **Processing**: FFmpeg encoding/cropping
- **Quality**: Multiple bitrate options

### **Storage Systems**
- **Temporary**: Local file caching
- **Export**: User download delivery
- **Future**: Cloud storage integration

---

*This wireframe represents the current state and planned evolution of the ShortsEditor project, showcasing a comprehensive AI-powered video analysis and editing platform.*
