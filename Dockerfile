# ==========================================
# Step 1: Build the React + Vite Frontend
# ==========================================
FROM node:20-slim AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# ==========================================
# Step 2: Runtime Container (Python + Node.js)
# ==========================================
FROM python:3.10-slim

# Install system dependencies for OpenCV and Node.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    build-essential \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set up user 1000 standard for Hugging Face Spaces
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PORT=7860 \
    PYTHON_OCR_URL=http://127.0.0.1:5001 \
    NODE_ENV=production

WORKDIR $HOME/app

# Install Python microservice dependencies
COPY --chown=user python-service/requirements.txt ./python-service/
RUN pip install --no-cache-dir --user -r ./python-service/requirements.txt \
    && python3 -c "from rapidocr_onnxruntime import RapidOCR; RapidOCR()"

# Install Node.js backend dependencies
COPY --chown=user server/package*.json ./server/
RUN cd server && npm install --omit=dev

# Copy application code
COPY --chown=user python-service ./python-service
COPY --chown=user server ./server
COPY --chown=user --from=frontend-builder /app/dist ./dist

# Ensure uploads and data directories are writable
RUN mkdir -p server/uploads

# Copy startup script
COPY --chown=user start.sh ./start.sh
RUN sed -i 's/\r$//' ./start.sh && chmod +x ./start.sh

EXPOSE 7860

CMD ["./start.sh"]
