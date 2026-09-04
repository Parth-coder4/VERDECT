const express = require('express');
const router = express.Router();
const { getDb, saveDb, INITIAL_DB } = require('../data/store');

// GET /api/registry
router.get('/', (req, res) => {
  const db = getDb();
  let list = db.batches || [];
  if (req.query.search) {
    const q = String(req.query.search).toLowerCase();
    list = list.filter(
      (b) =>
        String(b.productName || '').toLowerCase().includes(q) ||
        String(b.sku || '').toLowerCase().includes(q) ||
        String(b.brand || '').toLowerCase().includes(q) ||
        String(b.batchNumber || '').toLowerCase().includes(q) ||
        String(b.manufacturer || '').toLowerCase().includes(q) ||
        String(b.category || '').toLowerCase().includes(q) ||
        String(b.fssaiLicense || '').toLowerCase().includes(q)
    );
  }
  if (req.query.category && req.query.category !== 'ALL') {
    list = list.filter((b) => b.category === req.query.category);
  }
  if (req.query.risk && req.query.risk !== 'ALL') {
    list = list.filter((b) => b.riskScore === req.query.risk);
  }
  res.json(list);
});

// POST /api/registry/seed - Reset/seed registry with master standards
router.post('/seed', (req, res) => {
  try {
    const db = getDb();
    db.batches = [...INITIAL_DB.batches];
    saveDb(db);
    res.json(db.batches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to seed product registry.' });
  }
});

// POST /api/registry/import - Bulk import items
router.post('/import', (req, res) => {
  try {
    const items = req.body.items || req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Array of items required for import.' });
    }
    const db = getDb();
    if (!Array.isArray(db.batches)) db.batches = [];

    const existingIds = new Set(db.batches.map((b) => b.id));
    const processed = [];

    for (const item of items) {
      if (!item.productName || !item.sku) continue;
      const id = item.id && !existingIds.has(item.id) ? item.id : `prod_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newItem = {
        id,
        sku: String(item.sku).trim(),
        productName: String(item.productName).trim(),
        brand: item.brand || 'Registered Brand',
        category: item.category || 'Packaged Foods',
        batchNumber: item.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
        mfgDate: item.mfgDate || new Date().toISOString().slice(0, 10),
        expiryDate: item.expiryDate || '2027-12-31',
        declaredMRP: Number(item.declaredMRP) || 50.0,
        netQuantity: item.netQuantity || '200 g',
        manufacturer: item.manufacturer || 'Registered FMCG Packager / Importer',
        fssaiLicense: item.fssaiLicense || undefined,
        consumerCare: item.consumerCare || undefined,
        originCountry: item.originCountry || 'India',
        cin: item.cin || undefined,
        complianceHistory: item.complianceHistory || { scansCount: 0, passedCount: 0, violationsCount: 0 },
        riskScore: item.riskScore || 'LOW',
        registeredDate: item.registeredDate || new Date().toISOString().slice(0, 10),
        notes: item.notes || undefined,
        barcodeType: item.barcodeType || 'EAN-13'
      };
      processed.push(newItem);
      existingIds.add(id);
    }

    db.batches = [...processed, ...db.batches];
    saveDb(db);
    res.status(201).json(db.batches);
  } catch (err) {
    res.status(500).json({ error: 'Failed to import registry items.' });
  }
});

// POST /api/registry
router.post('/', (req, res) => {
  try {
    const item = req.body;
    if (!item.productName || !item.sku) {
      return res.status(400).json({ error: 'Product name and SKU are required.' });
    }
    const db = getDb();
    const newItem = {
      id: item.id || `prod_${Date.now()}`,
      sku: String(item.sku).trim(),
      productName: String(item.productName).trim(),
      brand: item.brand || 'Registered Brand',
      category: item.category || 'Packaged Foods',
      batchNumber: item.batchNumber || `BATCH-${Date.now().toString().slice(-4)}`,
      mfgDate: item.mfgDate || new Date().toISOString().slice(0, 10),
      expiryDate: item.expiryDate || '2027-12-31',
      declaredMRP: Number(item.declaredMRP) || 50.0,
      netQuantity: item.netQuantity || '200 g',
      manufacturer: item.manufacturer || 'Registered FMCG Packager / Importer',
      fssaiLicense: item.fssaiLicense || undefined,
      consumerCare: item.consumerCare || undefined,
      originCountry: item.originCountry || 'India',
      cin: item.cin || undefined,
      complianceHistory: item.complianceHistory || { scansCount: 0, passedCount: 0, violationsCount: 0 },
      riskScore: item.riskScore || 'LOW',
      registeredDate: item.registeredDate || new Date().toISOString().slice(0, 10),
      notes: item.notes || undefined,
      barcodeType: item.barcodeType || 'EAN-13'
    };

    if (!Array.isArray(db.batches)) db.batches = [];
    db.batches.unshift(newItem);
    saveDb(db);
    res.status(201).json(newItem);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create registry item.' });
  }
});

// PUT /api/registry/:id
router.put('/:id', (req, res) => {
  try {
    const db = getDb();
    const idx = (db.batches || []).findIndex((b) => b.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Batch record not found.' });
    }
    db.batches[idx] = { ...db.batches[idx], ...req.body };
    saveDb(db);
    res.json(db.batches[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update registry item.' });
  }
});

// DELETE /api/registry/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.batches = (db.batches || []).filter((b) => b.id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: `Batch ${req.params.id} removed from registry.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete registry item.' });
  }
});

module.exports = router;

