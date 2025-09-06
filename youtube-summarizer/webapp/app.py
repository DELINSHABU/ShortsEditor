#!/usr/bin/env python3
"""
YouTube Video Summarizer Web Application
Flask web app with API endpoints for video summarization
"""

import os
import sys
import json
import logging
from datetime import datetime
from pathlib import Path
from threading import Thread

from flask import Flask, render_template, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit

# Add src directory to Python path
sys.path.append(str(Path(__file__).parent.parent / "src"))

from main_summarizer import YouTubeVideoSummarizer
from config import get_config

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global summarizer instance
summarizer = None

def init_summarizer():
    """Initialize the YouTube summarizer"""
    global summarizer
    try:
        summarizer = YouTubeVideoSummarizer()
        logger.info("YouTube Summarizer initialized successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to initialize summarizer: {e}")
        return False

# Initialize on startup
init_summarizer()

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/video/info', methods=['POST'])
def get_video_info():
    """Get information about a YouTube video"""
    try:
        data = request.get_json()
        video_url = data.get('video_url', '').strip()
        
        if not video_url:
            return jsonify({'error': 'Video URL is required'}), 400
        
        if not summarizer:
            return jsonify({'error': 'Summarizer not initialized'}), 500
        
        # Get video info
        video_info = summarizer.get_video_info(video_url)
        
        return jsonify({
            'success': True,
            'data': video_info
        })
        
    except Exception as e:
        logger.error(f"Error getting video info: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/video/summarize', methods=['POST'])
def summarize_video():
    """Summarize a YouTube video"""
    try:
        data = request.get_json()
        video_url = data.get('video_url', '').strip()
        summary_type = data.get('summary_type', 'detailed')
        chunk_duration = data.get('chunk_duration', 60)
        language = data.get('language', 'en')
        
        if not video_url:
            return jsonify({'error': 'Video URL is required'}), 400
        
        if not summarizer:
            return jsonify({'error': 'Summarizer not initialized'}), 500
        
        # Start summarization in background thread
        session_id = request.sid if hasattr(request, 'sid') else 'web'
        
        def run_summarization():
            try:
                # Emit progress updates
                socketio.emit('progress', {
                    'step': 'starting',
                    'message': 'Starting video analysis...',
                    'progress': 0
                }, room=session_id)
                
                result = summarizer.summarize_video(
                    video_url=video_url,
                    summary_type=summary_type,
                    chunk_duration=chunk_duration,
                    language=language,
                    save_files=True
                )
                
                # Emit completion
                socketio.emit('summarization_complete', {
                    'success': result['success'],
                    'data': result
                }, room=session_id)
                
            except Exception as e:
                socketio.emit('summarization_error', {
                    'error': str(e)
                }, room=session_id)
        
        # Start background thread
        thread = Thread(target=run_summarization)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': 'Summarization started',
            'session_id': session_id
        })
        
    except Exception as e:
        logger.error(f"Error starting summarization: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/video/summarize/sync', methods=['POST'])
def summarize_video_sync():
    """Synchronous video summarization for simple requests"""
    try:
        data = request.get_json()
        video_url = data.get('video_url', '').strip()
        summary_type = data.get('summary_type', 'brief')
        chunk_duration = data.get('chunk_duration', 60)
        language = data.get('language', 'en')
        
        if not video_url:
            return jsonify({'error': 'Video URL is required'}), 400
        
        if not summarizer:
            return jsonify({'error': 'Summarizer not initialized'}), 500
        
        # Run summarization
        result = summarizer.summarize_video(
            video_url=video_url,
            summary_type=summary_type,
            chunk_duration=chunk_duration,
            language=language,
            save_files=False  # Don't save files for sync requests
        )
        
        # Format response for UI
        response_data = {
            'success': result['success'],
            'video_id': result.get('video_id'),
            'video_url': result.get('video_url'),
            'summary_type': result.get('summary_type'),
            'error': result.get('error')
        }
        
        if result['success']:
            response_data.update({
                'summary': result.get('summary', {}).get('summary', ''),
                'key_quotes': result.get('key_quotes', {}).get('key_quotes', ''),
                'metadata': result.get('metadata', {}),
                'chunks': len(result.get('transcript_chunks', [])),
                'transcript_entries': result.get('metadata', {}).get('transcript_entries', 0)
            })
        
        return jsonify(response_data)
        
    except Exception as e:
        logger.error(f"Error in sync summarization: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/config', methods=['GET'])
def get_config():
    """Get application configuration"""
    try:
        config = get_config()
        return jsonify({
            'summary_types': ['detailed', 'brief', 'key_points', 'timestamped'],
            'output_formats': ['json', 'markdown', 'text'],
            'default_summary_type': config.default_summary_type,
            'default_chunk_duration': config.default_chunk_duration,
            'gemini_model': config.gemini_model
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info(f"Client connected: {request.sid}")
    emit('connected', {'message': 'Connected to YouTube Summarizer'})

@socketio.on('disconnect')  
def handle_disconnect():
    """Handle WebSocket disconnection"""
    logger.info(f"Client disconnected: {request.sid}")

@socketio.on('join_room')
def handle_join_room(data):
    """Handle joining a room for progress updates"""
    room = data.get('room', request.sid)
    logger.info(f"Client {request.sid} joined room {room}")

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    # Check if config is available
    try:
        config = get_config()
        logger.info("Configuration loaded successfully")
    except Exception as e:
        logger.error(f"Configuration error: {e}")
        print("Please run 'python cli.py setup' to configure your API key")
        sys.exit(1)
    
    # Run the app
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
