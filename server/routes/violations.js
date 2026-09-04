const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../data/store');

// GET /api/violations
router.get('/', (req, res) => {
  const db = getDb();
  let list = db.violations || [];
  if (req.query.status) {
    list = list.filter((v) => v.status === req.query.status);
  }
  res.json(list);
});

// PATCH /api/violations/:id/status
router.patch('/:id/status', (req, res) => {
  try {
    const { status } = req.body || {};
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' });
    }
    const db = getDb();
    const violation = (db.violations || []).find((v) => v.id === req.params.id);
    if (!violation) {
      return res.status(404).json({ error: 'Violation record not found.' });
    }
    violation.status = status;
    saveDb(db);
    res.json({ success: true, violation });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update violation status.' });
  }
});

// DELETE /api/violations/:id
router.delete('/:id', (req, res) => {
  try {
    const db = getDb();
    db.violations = (db.violations || []).filter((v) => v.id !== req.params.id);
    saveDb(db);
    res.json({ success: true, message: `Violation ${req.params.id} dismissed.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete violation.' });
  }
});

module.exports = router;
