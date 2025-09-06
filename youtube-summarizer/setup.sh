#!/bin/bash

# YouTube Video Summarizer Setup Script
# This script sets up the YouTube video summarizer tool

set -e  # Exit on any error

echo "🎥 YouTube Video Summarizer Setup"
echo "=================================="

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    echo "Please install Python 3.8 or higher and try again."
    exit 1
fi

# Check Python version
PYTHON_VERSION=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
echo "✅ Found Python $PYTHON_VERSION"

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Please run this script from the youtube-summarizer directory"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
    echo "✅ Virtual environment created"
else
    echo "✅ Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p output temp

echo ""
echo "✅ Installation completed successfully!"
echo ""
echo "Next steps:"
echo "1. Get a Gemini API key from https://makersuite.google.com/app/apikey"
echo "2. Run: source venv/bin/activate"
echo "3. Run: python cli.py setup"
echo "4. Test with: python cli.py help-extended --example"
echo ""
echo "🎉 Happy summarizing!"
