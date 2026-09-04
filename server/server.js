const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const apiRoutes = require('./routes');
const { uploadDir } = require('./middlewares/upload');
const authRouter = require('./routes/auth');
const { requireAuth } = require('./middlewares/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({ 
  origin: process.env.CLIENT_ORIGIN || true, 
  credentials: true 
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static uploads directory serving
app.use('/api/auth', authRouter);
app.use('/uploads', express.static(uploadDir));


// Mount aggregated REST API routes under /api
app.use('/api', requireAuth, apiRoutes);

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    gateway: 'LMPC Compliance Express Gateway',
    timestamp: new Date().toISOString()
  });
});

// Serve compiled React frontend in production if dist exists
const clientDist = path.join(__dirname, '../dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) {
      return next();
    }
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`LMPC Compliance Express Gateway running on port ${PORT}`);
  console.log(`Connected to Python OCR Microservice on port 5001`);
  console.log(`Serving static uploads from: ${uploadDir}`);
  console.log(`====================================================`);
});
