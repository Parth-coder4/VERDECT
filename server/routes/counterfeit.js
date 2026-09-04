const express = require('express');
const router = express.Router();
const { upload } = require('../middlewares/upload');
const { processCounterfeitWithPython } = require('../services/pythonOcrService');

// POST /api/counterfeit/analyze
router.post('/analyze', upload.any(), async (req, res) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'Image file required for counterfeit analysis.' });
    }

    // Find primary front image
    const frontFile = files.find(f => f.fieldname === 'front_image' || f.fieldname === 'image' || f.fieldname === 'file') || files[0];
    // Any remaining files are secondary panels (back, sides, etc.)
    const secondaryFiles = files.filter(f => f !== frontFile);

    const pyResult = await processCounterfeitWithPython(
      frontFile.path,
      secondaryFiles.map(f => f.path)
    );

    if (!pyResult || !pyResult.success || !pyResult.data) {
      return res.status(502).json({
        error: pyResult?.error || 'Python Counterfeit Forensics Microservice failed.'
      });
    }
    res.json(pyResult.data);
  } catch (err) {
    console.error('Counterfeit analysis error:', err);
    res.status(500).json({ error: err.message || 'Counterfeit analysis error occurred.' });
  }
});

// GET /api/counterfeit/presets
router.get('/presets', (req, res) => {
  res.json({
    genuine: {
      counterfeitScore: 4,
      verdict: 'AUTHENTIC',
      confidence: 0.99,
      factors: {
        hologramOpticalScore: 99,
        packagingGamutFidelity: 98,
        barcodeGs1Integrity: 100,
        microprintTypography: 98,
        tamperSealStatus: 'INTACT'
      },
      detectedAnomalies: [
        'GS1 India prefix 890 verified in National Registry',
        'TetraPak foil laminate integrity matches genuine standard'
      ],
      forensicNotes: 'Packaging authentic with genuine security markers.'
    },
    suspect: {
      counterfeitScore: 42,
      verdict: 'SUSPECTED_COUNTERFEIT',
      confidence: 0.92,
      factors: {
        hologramOpticalScore: 68,
        packagingGamutFidelity: 72,
        barcodeGs1Integrity: 85,
        microprintTypography: 65,
        tamperSealStatus: 'SUSPICIOUS'
      },
      detectedAnomalies: [
        'Substrate color density exhibits 6.5% variance from master standard',
        'Micro-typography slightly degraded at edge'
      ],
      forensicNotes: 'Minor optical variance detected on packaging surface.'
    },
    fake: {
      counterfeitScore: 89,
      verdict: 'CRITICAL_COUNTERFEIT',
      confidence: 0.97,
      factors: {
        hologramOpticalScore: 28,
        packagingGamutFidelity: 35,
        barcodeGs1Integrity: 15,
        microprintTypography: 32,
        tamperSealStatus: 'BROKEN_TAMPERED'
      },
      detectedAnomalies: [
        'GS1 Checksum Failure: Invalid EAN-13 check digit',
        'Laser photocopy raster artifacts detected at 1200 DPI',
        'Pantone color gamut shift > 18% (Non-standard solvent ink)'
      ],
      forensicNotes: 'High counterfeit hazard. Illegitimate manufacturing packaging.'
    }
  });
});

module.exports = router;
