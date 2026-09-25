# LMPC Compliance & Inspect AI 📦🔍

An advanced AI-driven system for Legal Metrology Packaged Commodities (LMPC) compliance checking, auditing, and forensic anti-counterfeit analysis.

## Overview 🚀

The **LMPC Compliance & Inspect AI** platform acts as a smart bridge between regulatory frameworks and real-world packaged commodities. Using a microservice architecture, it leverages cutting-edge computer vision (OCR and object detection) to scan product panels, extract critical packaging information (like MRP, Net Weight, Manufacturing Date, and Manufacturer Details), and run them against an active regulatory rulebook to flag violations and counterfeits.

## Architecture 🏗️

The project is structured into three main layers:

1. **Frontend (React + Vite + TailwindCSS)** 🎨
   - Modern, responsive dashboard interface.
   - Modules for live scanning, historical violation tracking, rulebook management, and a compliance registry.
   - Hosted at `src/`.

2. **Express API Gateway (Node.js)** 🚪
   - Centralized gateway handling client requests.
   - Manages file uploads (Multer), orchestrates requests to the Python microservice, and aggregates analytical data.
   - Hosted at `server/`.

3. **Python OCR & Counterfeit Microservice** 🐍
   - The AI core of the application powered by EasyOCR, YOLO, and other computer vision libraries.
   - Exposes REST endpoints to extract features, handle multi-panel image inputs, process live video streams, and execute multi-spectral forensic anti-counterfeit analysis.
   - Hosted at `python-service/`.

## Features ✨

- **Multi-Panel Scanning:** Upload front and secondary packaging panels to extract aggregated compliance data.
- **Live Stream OCR:** Real-time object detection and OCR on live video feeds for fast auditing.
- **Counterfeit Detection:** Multi-spectral forensic analysis to verify brand metrics, barcodes, and detect counterfeit products.
- **Violation Engine:** Cross-references extracted product tokens against a dynamic rulebook to flag non-compliant goods.
- **Admin & History Dashboard:** Review past scans, compliance metrics, and system performance.

## Prerequisites 📋

- Node.js (v16+)
- Python (3.9+)
- `npm` or `yarn`

## Installation & Setup 🛠️

### 1. Clone the repository
```bash
git clone https://github.com/yourusername/lmpc-inspect-ai.git
cd lmpc-inspect-ai
```

### 2. Setup the Python Microservice
```bash
cd python-service
# It is recommended to use a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Run the Python service (runs on port 5001 by default)
python app.py
```

### 3. Setup the Node.js API Gateway
```bash
# From the root directory
cd server
npm install
# Start the Express server (runs on port 5000 by default)
npm start
```
*Note: Make sure the `uploads` directory exists within `server/` to handle incoming scans.*

### 4. Setup the React Frontend
```bash
# From the root directory
npm install
# Start the Vite development server
npm run dev
```

### Alternatively: Start Full Stack with Concurrently
If you're at the root of the project, you can start the Node.js server and the React frontend concurrently (ensure the Python service is already running):
```bash
npm install
npm run start
```

## Environment Variables ⚙️

**Backend Gateway (`server/.env`):**
- `PORT`: Port for the Express server (default: 5000)
- `PYTHON_OCR_URL`: URL of the Python microservice (default: `http://127.0.0.1:5001`)
- `CLIENT_ORIGIN`: Allowed CORS origin for the frontend

## Directory Structure 📂

```text
├── public/                 # Static assets
├── src/                    # React Frontend
│   ├── components/         # Reusable UI components
│   ├── pages/              # Dashboard, Scan, Analysis pages
│   ├── services/           # Frontend API calls
│   └── context/            # Global state (Auth, Theme, Compliance)
├── server/                 # Express API Gateway
│   ├── routes/             # API routes (auth, compliance, counterfeit)
│   ├── services/           # Microservice integration scripts (pythonOcrService.js)
│   └── uploads/            # Temporary scan storage
└── python-service/         # Python OCR & CV Service
    ├── app.py              # Main Python entrypoint
    ├── core/               # OCR and counterfeit logic
    ├── models/             # ML Models (YOLO weights, etc.)
    └── requirements.txt    # Python dependencies
```

## Contributing 🤝
Contributions are always welcome! Please open an issue or submit a pull request for any bugs, improvements, or new features.

## License 📄
[MIT License](LICENSE)
