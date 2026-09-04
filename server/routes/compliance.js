const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { upload } = require('../middlewares/upload');
const { getDb, saveDb } = require('../data/store');
const { processScanWithPython, processLiveStreamWithPython } = require('../services/pythonOcrService');

// POST /api/compliance/scan
// POST /api/compliance/scan
router.post('/scan', upload.any(), async (req, res) => {
  try {
    const filesList = req.files || [];

    // Find front image
    const frontFile = filesList.find(
      (f) => f.fieldname === 'front_image' || f.fieldname === 'image' || f.fieldname === 'file'
    ) || filesList[0];

    // Find all secondary / back panel images (back_image, back_image_0, back_image_1, side_image, etc.)
    const secondaryFiles = filesList.filter(
      (f) => f !== frontFile && (f.fieldname.startsWith('back') || f.fieldname.startsWith('side') || f.fieldname.startsWith('panel'))
    );

    const scanId = `INS-9402-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
    const timestamp = new Date().toISOString();

    let pyResult = null;
    if (frontFile) {
      const secondaryPaths = secondaryFiles.map((f) => f.path);
      pyResult = await processScanWithPython(frontFile.path, secondaryPaths, getDb().rulebook);
    }

    if (!pyResult || !pyResult.success || !pyResult.data) {
      return res.status(502).json({
        error: pyResult?.error || 'Python OCR Microservice is unreachable or failed to analyze the image.'
      });
    }

    const pyData = pyResult.data;
    const previewUrl = frontFile ? `/uploads/${frontFile.filename}` : 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=1200&auto=format&fit=crop&q=80';
    const backPreviewUrl = secondaryFiles[0] ? `/uploads/${secondaryFiles[0].filename}` : undefined;
    const additionalUrls = secondaryFiles.slice(1).map((f) => `/uploads/${f.filename}`);

    // Helper to format boxes
    const formatBoxArray = (rawBoxes, defaultPrefix, side) => {
      const result = [];
      if (rawBoxes && Array.isArray(rawBoxes)) {
        rawBoxes.forEach((b, idx) => {
          result.push({
            id: b.id || `box_${side}_${b.category || defaultPrefix}_${idx}`,
            label: b.label || (b.category ? b.category.toUpperCase().replace('_', ' ') : 'DECLARATION'),
            ruleCode: b.rule_id || b.ruleCode || 'RL-MAND-007',
            coords: b.box || b.coords || [0.1, 0.1, 0.3, 0.5],
            status: b.status || 'PASS',
            detectedText: b.detectedText || b.value || '',
            confidence: b.confidence || b.confidence_score || 0.95,
            category: b.category || 'other',
            side: b.side || side,
            script: b.script || 'Latin (English)',
            language: b.language || 'en',
            is_multilingual: Boolean(b.is_multilingual)
          });
        });
      }
      return result;
    };

    // Format Front and Back Bounding Boxes
    const frontBoxes = formatBoxArray(pyData.frontBoundingBoxes || pyData.boundingBoxes, 'front', 'front');
    const backBoxes = formatBoxArray(pyData.backBoundingBoxes, 'back', 'back_0');

    // Build structured panels array
    const panelsList = [];

    // Front Panel
    panelsList.push({
      id: 'panel_front',
      side: 'front',
      label: 'Front Label (PDP)',
      imageUrl: previewUrl,
      boundingBoxes: frontBoxes
    });

    // Secondary Panels
    secondaryFiles.forEach((secFile, idx) => {
      const sideKey = `back_${idx}`;
      let labelName = `Panel ${idx + 2} (Statutory)`;
      if (idx === 0) labelName = 'Back Panel (Statutory & MRP)';
      else if (idx === 1) labelName = 'Side Panel 1 (Ingredients & FSSAI)';
      else if (idx === 2) labelName = 'Side Panel 2 (Nutrition & Address)';



      const panelPyData = (pyData.panels || []).find((p) => p.side === sideKey);
      const panelBoxes = panelPyData ? formatBoxArray(panelPyData.boundingBoxes, sideKey, sideKey) : (idx === 0 ? backBoxes : []);

      panelsList.push({
        id: `panel_${sideKey}`,
        side: sideKey,
        label: labelName,
        imageUrl: `/uploads/${secFile.filename}`,
        boundingBoxes: panelBoxes
      });
    });

    const overallVerdict = pyData.overallVerdict || 'COMPLIANT';
    const complianceRate = pyData.complianceRate !== undefined ? pyData.complianceRate : 100.0;
    const penaltyEstimateInr = pyData.penaltyEstimateInr !== undefined ? pyData.penaltyEstimateInr : (overallVerdict === 'NON-COMPLIANT' ? 25000 : 0);

    // Extract fields from Python OCR data safely
    const manufacturerFeature = pyData.extracted_features?.find(f => f.category === 'address');
    const dateFeature = pyData.extracted_features?.find(f => f.category === 'mfg_date');
    const actualManufacturer = manufacturerFeature && manufacturerFeature.value ? String(manufacturerFeature.value) : 'Registered Packager / Importer';
    const dateStr = dateFeature && dateFeature.value ? String(dateFeature.value).replace(/[^A-Za-z0-9]/g, '') : '';
    const actualBatch = dateStr ? `PKG-${dateStr}` : `SCAN-${Date.now().toString().slice(-6)}`;

    // Generate dynamic notes based on actual rule failures
    let dynamicNotes = 'All statutory declarations meet LMPC Rules 2011 and FSSAI schedule requirements.';
    if (overallVerdict === 'NON-COMPLIANT' && Array.isArray(pyData.ruleEvaluations)) {
      const failedRules = pyData.ruleEvaluations.filter(r => r && (r.status === 'FAIL' || r.status === 'ISSUE'));
      if (failedRules.length > 0) {
        dynamicNotes = failedRules.map(r => (r.title || 'Statutory declaration') + ' is non-compliant or missing.').join(' ');
      }
    }

    const safeProductName = typeof pyData.productName === 'string' && pyData.productName.trim()
      ? pyData.productName.trim()
      : 'Packaged FMCG Commodity';

    const scanRecord = {
      id: scanId,
      timestamp,
      productName: safeProductName,
      category: 'Packaged Food & FMCG',
      batchNumber: actualBatch,
      barcode: (pyData.barcode && (pyData.barcode.barcode || pyData.barcode.code)) || 'No barcode detected',
      manufacturer: actualManufacturer,
      frontImageUrl: previewUrl,
      backImageUrl: backPreviewUrl,
      additionalImageUrls: additionalUrls,
      panels: panelsList,
      overallVerdict: typeof overallVerdict === 'string' ? overallVerdict : 'COMPLIANT',
      complianceRate: typeof complianceRate === 'number' ? complianceRate : 100.0,
      confidenceScore: typeof pyData.confidenceScore === 'number' ? pyData.confidenceScore : 0.98,
      inspectorId: (req.user && req.user.badgeNumber) || 'SYSTEM-AUTO',
      inspectorName: (req.user && req.user.name) || 'Automated Multi-Panel Scanner',
      penaltyEstimateInr,
      notes: dynamicNotes,
      boundingBoxes: frontBoxes,
      backBoundingBoxes: backBoxes.length > 0 ? backBoxes : undefined,
      ruleEvaluations: Array.isArray(pyData.ruleEvaluations) ? pyData.ruleEvaluations : [],
      fontMetrics: pyData.fontMetrics || null,
      counterfeitMetrics: pyData.counterfeit_metrics || null,
      brandMetrics: pyData.brandMetrics || pyData.brand_metrics || null,
      corporateRegistryMatch: pyData.corporate_registry_match || null,
      multilingualTokens: pyData.multilingualTokens || pyData.multilingual_tokens || [],
      multilingual_tokens: pyData.multilingual_tokens || pyData.multilingualTokens || [],
      detectedLanguages: pyData.detectedLanguages || pyData.detected_languages || [],
      detected_languages: pyData.detected_languages || pyData.detectedLanguages || []
    };

    // Save to store
    const db = getDb();
    if (!Array.isArray(db.scans)) db.scans = [];
    db.scans.unshift(scanRecord);

    if (scanRecord.overallVerdict === 'NON-COMPLIANT') {
      if (!Array.isArray(db.violations)) db.violations = [];
      const failedRules = Array.isArray(pyData.ruleEvaluations)
        ? pyData.ruleEvaluations.filter(r => r && (r.status === 'FAIL' || r.status === 'ISSUE'))
        : [];
      const primaryFail = failedRules.length > 0 ? failedRules[0] : { title: 'Unknown Compliance Defect', clause: 'General Provision' };

      const brandText = safeProductName.split(' ')[0] || 'Packaged Commodity';
      const newVio = {
        id: `VIO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
        scanId: scanRecord.id,
        productName: scanRecord.productName,
        brand: brandText,
        batchNumber: scanRecord.batchNumber,
        clauseViolated: primaryFail.clause || 'General Provision',
        ruleTitle: primaryFail.title || 'Compliance Defect',
        severity: 'HIGH',
        status: 'PENDING_NOTICE',
        detectedDate: String(scanRecord.timestamp || new Date().toISOString()).slice(0, 10),
        inspectorId: scanRecord.inspectorId,
        fineAmountInr: scanRecord.penaltyEstimateInr || 25000,
        evidenceThumbnail: scanRecord.frontImageUrl,
        description: scanRecord.notes
      };
      db.violations.unshift(newVio);
    }

    saveDb(db);
    res.json(scanRecord);
  } catch (err) {
    console.error('Scan processing error in compliance router:', err);
    res.status(500).json({ error: err.message || 'Failed to process compliance scan.' });
  }
});

// GET /api/compliance/records
router.get('/records', (req, res) => {
  const db = getDb();
  let list = db.scans || [];
  if (req.query.status && req.query.status !== 'ALL') {
    list = list.filter((s) => s.overallVerdict === req.query.status);
  }
  res.json(list);
});

// GET /api/compliance/records/:id
router.get('/records/:id', (req, res) => {
  const db = getDb();
  const found = (db.scans || []).find((s) => s.id === req.params.id);
  if (found) res.json(found);
  else res.status(404).json({ error: 'Scan record not found' });
});

// DELETE /api/compliance/records/:id
router.delete('/records/:id', (req, res) => {
  try {
    const db = getDb();
    const id = req.params.id;
    const removed = (db.scans || []).find((s) => s.id === id);
    db.scans = (db.scans || []).filter((s) => s.id !== id);
    db.violations = (db.violations || []).filter((v) => v.scanId !== id);
    saveDb(db);
    for (const imageUrl of [removed?.frontImageUrl, removed?.backImageUrl]) {
      if (imageUrl?.startsWith('/uploads/')) {
        const filePath = path.join(__dirname, '..', 'uploads', path.basename(imageUrl));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true, message: `Scan record ${id} deleted.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete record.' });
  }
});

// POST /api/compliance/records/batch-delete
router.post('/records/batch-delete', (req, res) => {
  try {
    const { ids } = req.body || {};
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array required.' });
    }
    const db = getDb();
    const idSet = new Set(ids);
    db.scans = (db.scans || []).filter((s) => !idSet.has(s.id));
    db.violations = (db.violations || []).filter((v) => !idSet.has(v.scanId));
    saveDb(db);
    res.json({ success: true, count: ids.length });
  } catch (err) {
    res.status(500).json({ error: 'Failed to batch delete records.' });
  }
});

// DELETE /api/compliance/records (Clear all)
router.delete('/records', (req, res) => {
  try {
    const db = getDb();
    db.scans = [];
    db.violations = [];
    saveDb(db);
    res.json({ success: true, message: 'All compliance records cleared.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to clear records.' });
  }
});

// POST /api/compliance/live-stream-ocr (Real-time live camera OCR & object detection)
router.post('/live-stream-ocr', upload.single('frame'), async (req, res) => {
  try {
    const file = req.file || (req.files && req.files[0]);
    if (!file) {
      return res.status(400).json({ error: 'No video frame uploaded.' });
    }
    const buffer = fs.readFileSync(file.path);
    // Cleanup temporary frame file asynchronously
    fs.unlink(file.path, () => {});

    const result = await processLiveStreamWithPython(buffer, file.originalname);
    res.json(result);
  } catch (err) {
    console.error('Live stream OCR error:', err);
    res.status(500).json({ error: 'Failed to process live frame.' });
  }
});

module.exports = router;
