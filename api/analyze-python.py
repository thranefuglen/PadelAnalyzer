#!/usr/bin/env python3
import json
import sys
import os
import math
from http.server import BaseHTTPRequestHandler
import tempfile
import uuid

# Try to import MediaPipe and OpenCV
try:
    import mediapipe as mp
    import cv2
    import numpy as np
    HAS_MEDIAPIPE = True
except ImportError:
    print("MediaPipe not available, using fallback analysis", file=sys.stderr)
    try:
        import cv2
        import numpy as np
        HAS_OPENCV = True
    except ImportError:
        HAS_OPENCV = False
    HAS_MEDIAPIPE = False

def analyze_fallback(duration_ms=5000, sample_ms=100):
    """Fallback analysis without MediaPipe"""
    # Generate synthetic tempo series
    tempo_series = []
    num_samples = int(duration_ms / sample_ms)

    for i in range(num_samples):
        timestamp = i * sample_ms
        # Create a synthetic tempo curve with some peaks
        tempo = 20 + 30 * math.sin(timestamp / 1000 * 2) + 10 * math.sin(timestamp / 1000 * 8)
        tempo = max(0, tempo)
        tempo_series.append([timestamp, round(tempo, 1)])

    # Synthetic impact frames
    impact_frames = [800, 2200, 3600] if duration_ms > 4000 else [800, 2200]

    return {
        "summary": {
            "strokeGuess": "forehand",
            "confidence": 0.4
        },
        "metrics": {
            "elbowAngleMax": 145.0,
            "shoulderRotationProxy": 8.5,
            "tempoSeries": tempo_series,
            "impactFrames": impact_frames
        },
        "meta": {
            "fps": 30,
            "sampleMs": sample_ms,
            "framesUsed": num_samples,
            "fallback": True
        }
    }

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # Parse request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)

            # For Vercel, we'll return a fallback analysis
            # In a real production environment, you'd process the actual video
            result = analyze_fallback()

            # Send response
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()

            self.wfile.write(json.dumps(result).encode())

        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            error_response = {
                "error": str(e),
                "summary": {"strokeGuess": "unknown", "confidence": 0.0},
                "metrics": {"elbowAngleMax": 0, "shoulderRotationProxy": 0, "tempoSeries": [], "impactFrames": []},
                "meta": {"fps": 30, "sampleMs": 100, "framesUsed": 0}
            }
            self.wfile.write(json.dumps(error_response).encode())

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()