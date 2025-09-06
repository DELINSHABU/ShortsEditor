// YouTube Video Summarizer - Frontend JavaScript

class VideoSummarizer {
    constructor() {
        this.socket = null;
        this.currentAnalysis = null;
        this.init();
    }

    init() {
        // Initialize Socket.IO if available
        if (typeof io !== 'undefined') {
            this.socket = io();
            this.setupSocketEvents();
        }

        // Bind event listeners
        this.bindEvents();
        
        // Load saved state if any
        this.loadState();
    }

    bindEvents() {
        // Form submission
        const form = document.getElementById('summarizeForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.startAnalysis();
        });

        // Check video button
        const checkBtn = document.getElementById('checkVideoBtn');
        checkBtn.addEventListener('click', () => {
            this.checkVideo();
        });

        // Action buttons
        document.getElementById('copyResultsBtn')?.addEventListener('click', () => {
            this.copyResults();
        });

        document.getElementById('downloadResultsBtn')?.addEventListener('click', () => {
            this.downloadResults();
        });

        document.getElementById('newAnalysisBtn')?.addEventListener('click', () => {
            this.resetForm();
        });

        document.getElementById('retryBtn')?.addEventListener('click', () => {
            this.startAnalysis();
        });

        // Auto-check video URL on change
        const videoUrlInput = document.getElementById('videoUrl');
        let checkTimeout;
        videoUrlInput.addEventListener('input', () => {
            clearTimeout(checkTimeout);
            checkTimeout = setTimeout(() => {
                if (this.isValidYouTubeUrl(videoUrlInput.value)) {
                    this.checkVideo();
                }
            }, 1000);
        });
    }

    setupSocketEvents() {
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('progress', (data) => {
            this.updateProgress(data);
        });

        this.socket.on('summarization_complete', (data) => {
            if (data.success) {
                this.showResults(data.data);
            } else {
                this.showError(data.data.error || 'Analysis failed');
            }
        });

        this.socket.on('summarization_error', (data) => {
            this.showError(data.error);
        });
    }

    isValidYouTubeUrl(url) {
        const patterns = [
            /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]+/,
            /^[\w-]{11}$/
        ];
        return patterns.some(pattern => pattern.test(url));
    }

    async checkVideo() {
        const videoUrl = document.getElementById('videoUrl').value.trim();
        
        if (!videoUrl || !this.isValidYouTubeUrl(videoUrl)) {
            this.hideVideoInfo();
            return;
        }

        const checkBtn = document.getElementById('checkVideoBtn');
        const originalText = checkBtn.innerHTML;
        
        try {
            checkBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Checking...';
            checkBtn.disabled = true;

            const response = await fetch('/api/video/info', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ video_url: videoUrl })
            });

            const result = await response.json();

            if (result.success) {
                this.showVideoInfo(result.data);
            } else {
                this.showError(result.error);
            }

        } catch (error) {
            console.error('Error checking video:', error);
            this.showError('Failed to check video information');
        } finally {
            checkBtn.innerHTML = originalText;
            checkBtn.disabled = false;
        }
    }

    showVideoInfo(videoInfo) {
        const section = document.getElementById('videoInfoSection');
        const container = document.getElementById('videoInfo');
        
        let statusClass = 'warning-indicator';
        let statusText = 'No transcripts available';
        
        if (videoInfo.has_transcripts) {
            statusClass = 'success-indicator';
            statusText = 'Transcripts available ✓';
        }

        container.innerHTML = `
            <div class="video-details">
                <p><strong>Video ID:</strong> ${videoInfo.video_id}</p>
                <p><strong>Status:</strong> <span class="${statusClass}">${statusText}</span></p>
                ${videoInfo.available_transcripts && videoInfo.available_transcripts.length > 0 ? 
                    `<p><strong>Languages:</strong> ${videoInfo.available_transcripts.length} available</p>` : 
                    ''
                }
            </div>
        `;
        
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });

        // Enable/disable analyze button
        const analyzeBtn = document.getElementById('analyzeBtn');
        if (videoInfo.has_transcripts) {
            analyzeBtn.disabled = false;
            analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Video';
        } else {
            analyzeBtn.disabled = true;
            analyzeBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> No Transcripts Available';
        }
    }

    hideVideoInfo() {
        const section = document.getElementById('videoInfoSection');
        section.style.display = 'none';
        
        const analyzeBtn = document.getElementById('analyzeBtn');
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-magic"></i> Analyze Video';
    }

    async startAnalysis() {
        const formData = new FormData(document.getElementById('summarizeForm'));
        const data = {
            video_url: formData.get('videoUrl'),
            summary_type: formData.get('summaryType'),
            chunk_duration: parseInt(formData.get('chunkDuration')),
            language: 'en'
        };

        if (!data.video_url || !this.isValidYouTubeUrl(data.video_url)) {
            this.showError('Please enter a valid YouTube URL');
            return;
        }

        // Hide previous results/errors
        this.hideAllSections();
        
        // Show loading
        this.showLoading();

        try {
            const response = await fetch('/api/video/summarize/sync', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                this.showResults(result);
            } else {
                this.showError(result.error || 'Analysis failed');
            }

        } catch (error) {
            console.error('Error during analysis:', error);
            this.showError('Network error occurred. Please try again.');
        }
    }

    showLoading() {
        const section = document.getElementById('loadingSection');
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        
        // Simulate progress for sync requests
        let progress = 0;
        const progressFill = document.getElementById('progressFill');
        const progressMessage = document.getElementById('progressMessage');
        
        const messages = [
            'Extracting transcript...',
            'Processing with Gemini AI...',
            'Generating summary...',
            'Finalizing results...'
        ];
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            
            progressFill.style.width = `${progress}%`;
            progressMessage.textContent = messages[Math.floor(progress / 25)] || messages[messages.length - 1];
        }, 500);

        // Store interval to clear it later
        this.progressInterval = interval;
    }

    updateProgress(data) {
        const progressFill = document.getElementById('progressFill');
        const progressMessage = document.getElementById('progressMessage');
        
        progressFill.style.width = `${data.progress || 0}%`;
        progressMessage.textContent = data.message || 'Processing...';
    }

    showResults(result) {
        // Clear loading
        this.hideLoading();
        
        // Populate results
        this.populateResults(result);
        
        // Show results section
        const section = document.getElementById('resultsSection');
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
        
        // Save current analysis
        this.currentAnalysis = result;
        this.saveState();
    }

    populateResults(result) {
        // Set timestamp and type
        document.getElementById('resultTimestamp').textContent = new Date().toLocaleString();
        document.getElementById('resultType').textContent = result.summary_type?.toUpperCase() || 'ANALYSIS';
        
        // Populate metadata
        const metadata = result.metadata || {};
        document.getElementById('videoDuration').textContent = 
            metadata.total_duration ? `${Math.round(metadata.total_duration)}s` : '--';
        document.getElementById('transcriptEntries').textContent = 
            result.transcript_entries || metadata.transcript_entries || '--';
        document.getElementById('compressionRatio').textContent = 
            metadata.compression_ratio ? metadata.compression_ratio.toFixed(3) : '--';
        document.getElementById('chunksCount').textContent = 
            result.chunks || '--';
        
        // Populate summary
        const summaryContent = document.getElementById('summaryContent');
        if (result.summary) {
            // Convert markdown-like formatting to HTML
            let formattedSummary = result.summary
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            // Wrap in paragraphs
            if (!formattedSummary.includes('<p>')) {
                formattedSummary = `<p>${formattedSummary}</p>`;
            }
            
            summaryContent.innerHTML = formattedSummary;
        } else {
            summaryContent.innerHTML = '<p>No summary available.</p>';
        }
        
        // Populate quotes if available
        const quotesSection = document.getElementById('quotesSection');
        const quotesContent = document.getElementById('quotesContent');
        
        if (result.key_quotes) {
            let formattedQuotes = result.key_quotes
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n\n/g, '</p><p>')
                .replace(/\n/g, '<br>');
            
            quotesContent.innerHTML = `<p>${formattedQuotes}</p>`;
            quotesSection.style.display = 'block';
        } else {
            quotesSection.style.display = 'none';
        }
    }

    showError(message) {
        this.hideLoading();
        
        const section = document.getElementById('errorSection');
        const messageEl = document.getElementById('errorMessage');
        
        messageEl.textContent = message || 'An unknown error occurred.';
        section.style.display = 'block';
        section.scrollIntoView({ behavior: 'smooth' });
    }

    hideLoading() {
        document.getElementById('loadingSection').style.display = 'none';
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
        
        // Reset progress
        document.getElementById('progressFill').style.width = '0%';
        document.getElementById('progressMessage').textContent = 'Initializing analysis...';
    }

    hideAllSections() {
        document.getElementById('resultsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('loadingSection').style.display = 'none';
    }

    async copyResults() {
        if (!this.currentAnalysis) return;
        
        const text = `YouTube Video Analysis Results
==========================================

Video ID: ${this.currentAnalysis.video_id}
Summary Type: ${this.currentAnalysis.summary_type}
Generated: ${new Date().toLocaleString()}

SUMMARY:
${this.currentAnalysis.summary || 'No summary available'}

${this.currentAnalysis.key_quotes ? `
KEY QUOTES:
${this.currentAnalysis.key_quotes}
` : ''}

Powered by YouTube Video Summarizer`;

        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Results copied to clipboard!');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy results', 'error');
        }
    }

    downloadResults() {
        if (!this.currentAnalysis) return;
        
        const data = {
            video_id: this.currentAnalysis.video_id,
            video_url: this.currentAnalysis.video_url,
            summary_type: this.currentAnalysis.summary_type,
            timestamp: new Date().toISOString(),
            summary: this.currentAnalysis.summary,
            key_quotes: this.currentAnalysis.key_quotes,
            metadata: this.currentAnalysis.metadata
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `youtube_analysis_${this.currentAnalysis.video_id}_${new Date().getTime()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Results downloaded!');
    }

    resetForm() {
        // Reset form
        document.getElementById('summarizeForm').reset();
        
        // Hide all sections
        this.hideAllSections();
        this.hideVideoInfo();
        
        // Clear state
        this.currentAnalysis = null;
        localStorage.removeItem('videoSummarizerState');
        
        // Focus on URL input
        document.getElementById('videoUrl').focus();
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showToast(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#059669' : '#ef4444'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
            z-index: 1000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // Show toast
        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);
        
        // Hide toast
        setTimeout(() => {
            toast.style.transform = 'translateX(400px)';
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    saveState() {
        if (this.currentAnalysis) {
            localStorage.setItem('videoSummarizerState', JSON.stringify({
                analysis: this.currentAnalysis,
                timestamp: Date.now()
            }));
        }
    }

    loadState() {
        try {
            const saved = localStorage.getItem('videoSummarizerState');
            if (saved) {
                const data = JSON.parse(saved);
                
                // Only restore if less than 1 hour old
                if (Date.now() - data.timestamp < 3600000) {
                    this.currentAnalysis = data.analysis;
                    this.showResults(data.analysis);
                    
                    // Also restore the form
                    if (data.analysis.video_url) {
                        document.getElementById('videoUrl').value = data.analysis.video_url;
                    }
                }
            }
        } catch (error) {
            console.error('Failed to load saved state:', error);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.videoSummarizer = new VideoSummarizer();
});
