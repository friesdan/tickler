#!/usr/bin/env python3
"""
ACE-Step 1.5 Local Server for MusicTicker
Accepts POST /generate with prompt and returns WAV audio.
Run from: cd ~/Developer/ACE-Step-1.5 && python ../MusicTickerClaude/ace-step-server.py
"""

import sys
import os
import io
import json
import wave
import struct
from http.server import HTTPServer, BaseHTTPRequestHandler

# Add ACE-Step to path
ACE_STEP_DIR = os.path.expanduser("~/Developer/ACE-Step-1.5")
sys.path.insert(0, ACE_STEP_DIR)

# Lazy-loaded model
model = None

def get_model():
    global model
    if model is None:
        print("Loading ACE-Step model... (this may take a moment)")
        try:
            # Try importing ACE-Step's generation pipeline
            from ace_step.pipeline import ACEStepPipeline
            model = ACEStepPipeline()
            print("ACE-Step model loaded successfully")
        except ImportError:
            print("WARNING: ACE-Step not found, using silence generator")
            model = "silence"
    return model

def generate_silence_wav(duration=10, sample_rate=44100):
    """Generate silent WAV as fallback"""
    buf = io.BytesIO()
    n_samples = int(duration * sample_rate)
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sample_rate)
        w.writeframes(b'\x00\x00' * n_samples)
    return buf.getvalue()

def generate_audio(prompt, duration=10, tempo=120):
    m = get_model()
    if m == "silence":
        return generate_silence_wav(duration)

    try:
        result = m.generate(
            prompt=prompt,
            duration=duration,
            tempo=tempo,
        )
        # ACE-Step returns audio data — convert to WAV bytes
        if hasattr(result, 'audio'):
            audio_data = result.audio
        else:
            audio_data = result

        buf = io.BytesIO()
        import numpy as np
        if isinstance(audio_data, np.ndarray):
            # Normalize to int16
            audio_data = (audio_data * 32767).astype(np.int16)
            with wave.open(buf, 'wb') as w:
                w.setnchannels(1)
                w.setsampwidth(2)
                w.setframerate(44100)
                w.writeframes(audio_data.tobytes())
        return buf.getvalue()
    except Exception as e:
        print(f"Generation error: {e}")
        return generate_silence_wav(duration)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/health':
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok"}).encode())
        else:
            self.send_response(404)
            self.end_headers()

    def do_POST(self):
        if self.path == '/generate':
            content_length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(content_length))

            prompt = body.get('prompt', 'ambient electronic music')
            duration = body.get('duration', 10)
            tempo = body.get('tempo', 120)

            print(f"Generating: '{prompt}' ({duration}s, {tempo} BPM)")
            wav_data = generate_audio(prompt, duration, tempo)

            self.send_response(200)
            self.send_header('Content-Type', 'audio/wav')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Content-Length', str(len(wav_data)))
            self.end_headers()
            self.wfile.write(wav_data)
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def log_message(self, format, *args):
        print(f"[ACE-Step Server] {args[0]}")


if __name__ == '__main__':
    port = 8765
    print(f"Starting ACE-Step server on http://localhost:{port}")
    print(f"ACE-Step dir: {ACE_STEP_DIR}")
    server = HTTPServer(('localhost', port), Handler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down")
        server.server_close()
