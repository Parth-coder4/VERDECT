#!/bin/bash
set -e

echo "Starting Python OCR Microservice on port 5001..."
python3 python-service/app.py &

echo "Waiting for Python microservice to initialize..."
sleep 3

echo "Starting Node.js Express Gateway on port ${PORT:-7860}..."
cd server && node server.js
