const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../data/store');
const { requireAdmin } = require('../middlewares/auth');

// GET /api/rulebook (Accessible by all authenticated field inspectors and admins)
router.get('/', (req, res) => {
  const db = getDb();
  res.json(db.rulebook || []);
});

// POST /api/rulebook (Admin only)
router.post('/', requireAdmin, (req, res) => {

  try {
    const item = req.body;
    if (!item.title || !item.code) {
      return res.status(400).json({ error: 'Rule code and title are required.' });
    }
    const db = getDb();
    const newRule = {
      id: item.id || `rule_${Date.now()}`,
      code: item.code,
      title: item.title,
      category: item.category || 'Mandatory Declarations',
      legalAct: item.legalAct || 'Legal Metrology Act, 2009',
      ruleClause: item.ruleClause || 'Packaged Commodities Rules 2011',
      description: item.description || '',
      active: item.active !== undefined ? item.active : true,
      minThreshold: Number(item.minThreshold) || 100,
      unit: item.unit || '%',
      penaltySection: item.penaltySection || 'Section 36(1)'
    };
    db.rulebook.push(newRule);
    saveDb(db);
    res.status(201).json(newRule);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add rule to rulebook.' });
  }
});

// PATCH /api/rulebook/:id/toggle (Admin only)
router.patch('/:id/toggle', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const rule = (db.rulebook || []).find((r) => r.id === req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    rule.active = !rule.active;
    saveDb(db);
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to toggle rule state.' });
  }
});

// PATCH /api/rulebook/:id/threshold (Admin only)
router.patch('/:id/threshold', requireAdmin, (req, res) => {
  try {
    const { threshold } = req.body;
    if (threshold === undefined) {
      return res.status(400).json({ error: 'threshold value required.' });
    }
    const db = getDb();
    const rule = (db.rulebook || []).find((r) => r.id === req.params.id);
    if (!rule) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    rule.minThreshold = Number(threshold);
    saveDb(db);
    res.json({ success: true, rule });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule threshold.' });
  }
});

// PUT /api/rulebook/:id (Admin only)
router.put('/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    const idx = (db.rulebook || []).findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Rule not found.' });
    }
    db.rulebook[idx] = { ...db.rulebook[idx], ...req.body };
    saveDb(db);
    res.json({ success: true, rule: db.rulebook[idx] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update rule.' });
  }
});

// DELETE /api/rulebook/:id (Admin only)
router.delete('/:id', requireAdmin, (req, res) => {
  try {
    const db = getDb();
    db.rulebook = (db.rulebook || []).filter((r) => r.id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: `Rule ${req.params.id} removed from rulebook.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete rule.' });
  }
});

module.exports = router;

