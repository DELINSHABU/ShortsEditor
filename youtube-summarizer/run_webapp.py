#!/usr/bin/env python3
"""
YouTube Video Summarizer Web App Runner
Simple script to start the web application
"""

import sys
import os
from pathlib import Path

# Add src directory to Python path
sys.path.append(str(Path(__file__).parent / "src"))

# Change to webapp directory and run
os.chdir(str(Path(__file__).parent / "webapp"))

if __name__ == "__main__":
    from app import app, socketio
    
    print("🎥 YouTube Video Summarizer Web Application")
    print("=" * 50)
    print("Starting server on http://localhost:5000")
    print("Press Ctrl+C to stop")
    print("=" * 50)
    
    try:
        socketio.run(app, debug=False, host='0.0.0.0', port=5000)
    except KeyboardInterrupt:
        print("\n👋 Server stopped!")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        print("Make sure you have set up your Gemini API key with: python cli.py setup")
