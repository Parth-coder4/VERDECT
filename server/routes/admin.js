const express = require('express');
const router = express.Router();
const { getDb, saveDb } = require('../data/store');
const { hashPassword } = require('../middlewares/auth');

// --- INSPECTORS ROSTER ---
router.get('/inspectors', (req, res) => {
  const db = getDb();
  res.json(db.inspectors || []);
});

router.post('/inspectors', (req, res) => {
  try {
    const item = req.body;
    if (!item.name || !item.idBadge) {
      return res.status(400).json({ error: 'Inspector name and badge ID are required.' });
    }
    const db = getDb();
    const cleanBadge = item.idBadge.trim().toUpperCase();

    const newInsp = {
      id: item.id || `insp_${Date.now()}`,
      name: item.name.trim(),
      initials: item.initials || item.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(),
      idBadge: cleanBadge,
      totalInspections: Number(item.totalInspections) || 0,
      reportsGenerated: Number(item.reportsGenerated) || 0,
      currentStatus: item.currentStatus || 'Active - Field',
      statusType: item.statusType || 'success',
      email: item.email || `${item.name.toLowerCase().replace(/\s+/g, '.')}@metrology.gov.in`,
      phone: item.phone || '+91 98000 00000',
      jurisdiction: item.jurisdiction || 'Regional Metrology Directorate',
      avatarBgColor: item.avatarBgColor || 'bg-sky-500',
      lastActiveTime: 'Just onboarded',
      accuracyRate: Number(item.accuracyRate) || 99.0
    };

    db.inspectors.unshift(newInsp);

    // Sync into users table if not existing so inspector can log in
    if (!db.users) db.users = [];
    const userExists = db.users.find((u) => u.badgeNumber.toUpperCase() === cleanBadge);
    if (!userExists) {
      db.users.push({
        id: cleanBadge,
        username: cleanBadge,
        passwordHash: hashPassword(item.password || 'demo-password'),
        name: newInsp.name,
        badgeNumber: cleanBadge,
        role: 'INSPECTOR',
        jurisdiction: newInsp.jurisdiction,
        email: newInsp.email,
        phone: newInsp.phone,
        avatarUrl: '',
        inspectionsCompleted: newInsp.totalInspections,
        accuracyRate: newInsp.accuracyRate,
        activeStatus: true,
        createdAt: new Date().toISOString()
      });
    }

    // Record audit log
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `LOG-ADM-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: req.user?.id || 'ADMIN-DIR-01',
      userName: req.user?.name || 'Administrator',
      action: 'INSPECTOR_ONBOARDED',
      targetResource: `INSP-${cleanBadge}`,
      ipAddress: req.ip || '127.0.0.1',
      status: 'SUCCESS',
      category: 'AUTH',
      details: `Onboarded inspector ${newInsp.name} (Badge: ${cleanBadge}).`
    });

    saveDb(db);
    res.status(201).json(newInsp);
  } catch (err) {
    console.error('Add inspector error:', err);
    res.status(500).json({ error: 'Failed to create inspector record.' });
  }
});

router.put('/inspectors/:id', (req, res) => {
  try {
    const db = getDb();
    const idx = (db.inspectors || []).findIndex((i) => i.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Inspector not found.' });
    }
    db.inspectors[idx] = { ...db.inspectors[idx], ...req.body };
    saveDb(db);
    res.json(db.inspectors[idx]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update inspector.' });
  }
});

router.delete('/inspectors/:id', (req, res) => {
  try {
    const db = getDb();
    const removed = (db.inspectors || []).find((i) => i.id === req.params.id);
    db.inspectors = (db.inspectors || []).filter((i) => i.id !== req.params.id);
    if (removed) {
      db.users = (db.users || []).filter((u) => u.badgeNumber !== removed.idBadge);
    }
    saveDb(db);
    res.json({ success: true, message: `Inspector ${req.params.id} removed.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete inspector.' });
  }
});

// --- AUDIT LOGS ---
router.get('/logs', (req, res) => {
  const db = getDb();
  let list = db.auditLogs || [];
  if (req.query.search) {
    const q = req.query.search.toLowerCase();
    list = list.filter(
      (l) =>
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.targetResource && l.targetResource.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q))
    );
  }
  res.json(list);
});

router.post('/logs', (req, res) => {
  try {
    const item = req.body || {};
    const db = getDb();
    const newLog = {
      id: item.id || `LOG-${Date.now()}`,
      timestamp: item.timestamp || new Date().toISOString(),
      userId: item.userId || req.user?.id || 'SYSTEM',
      userName: item.userName || req.user?.name || 'System Operator',
      action: item.action || item.event || 'SYSTEM_ACTION',
      targetResource: item.targetResource || 'RESOURCE',
      ipAddress: item.ipAddress || req.ip || '127.0.0.1',
      status: item.status || 'SUCCESS',
      category: item.category || 'SECURITY',
      details: item.details || ''
    };
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift(newLog);
    saveDb(db);
    res.status(201).json(newLog);
  } catch (err) {
    res.status(500).json({ error: 'Failed to write audit log.' });
  }
});

// --- REPORTS (Aggregated Institutional Audits & Packaging Field Scans) ---
router.get('/reports', (req, res) => {
  const db = getDb();
  const institutionalReports = (db.reports || []).map((r) => ({
    ...r,
    source: r.source || 'INSTITUTIONAL'
  }));

  // Synthesize packaging scans from field inspections into regulatory report items
  const scanReports = (db.scans || []).map((s) => {
    const isViolation = s.overallVerdict === 'NON-COMPLIANT';
    const isUnderReview = s.overallVerdict === 'UNDER_REVIEW';
    const status = isViolation ? 'Violation Found' : isUnderReview ? 'Pending Review' : 'Clear';
    const statusType = isViolation ? 'danger' : isUnderReview ? 'warning' : 'success';

    let entity = s.manufacturer;
    if (!entity || entity === 'Registered Packager / Importer') {
      entity = s.brandMetrics?.brandDetected || s.productName || 'Packaged Commodity';
    }

    const words = entity.trim().split(/\s+/);
    const initials =
      words.length > 1
        ? (words[0][0] + words[1][0]).toUpperCase()
        : words[0].slice(0, 2).toUpperCase();

    let formattedDate = s.timestamp;
    try {
      const d = new Date(s.timestamp);
      if (!isNaN(d.getTime())) {
        formattedDate = d.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch {
      // fallback
    }

    return {
      id: `REP-${s.id.replace(/^INS-/, '')}`,
      subjectEntity: entity,
      entityInitials: initials || 'RC',
      inspectorName: s.inspectorName || 'Inspector Vikram Malhotra',
      type: isViolation ? 'Surprise Audit' : 'Routine Inspection',
      dateGenerated: formattedDate,
      status: status,
      statusType: statusType,
      location:
        s.manufacturer && s.manufacturer.includes(',')
          ? s.manufacturer.split(',').slice(-2).join(',').trim()
          : 'Northern Metrology Zone - Sector 4',
      severityLevel: isViolation ? 'High' : 'Low',
      fineAmountInr: s.penaltyEstimateInr || (isViolation ? 25000 : 0),
      productName: s.productName,
      scanId: s.id,
      source: 'SCAN'
    };
  });

  const sourceFilter = req.query.source;
  let result = [];
  if (sourceFilter === 'INSTITUTIONAL') {
    result = institutionalReports;
  } else if (sourceFilter === 'SCAN') {
    result = scanReports;
  } else {
    result = [...institutionalReports, ...scanReports];
  }

  res.json(result);
});

router.post('/reports', (req, res) => {
  try {
    const item = req.body || {};
    const db = getDb();
    const initials = item.subjectEntity
      ? item.subjectEntity
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
      : 'RE';

    const newReport = {
      id: item.id || `REP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      subjectEntity: item.subjectEntity || 'Packaged Commodity Logistics Entity',
      entityInitials: item.entityInitials || initials,
      inspectorName: item.inspectorName || req.user?.name || 'Director Rajesh Verma',
      type: item.type || 'Routine Inspection',
      dateGenerated: item.dateGenerated || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      status: item.status || 'Clear',
      statusType: item.statusType || (item.status === 'Violation Found' ? 'danger' : 'success'),
      location: item.location || 'Regional Central Enforcement Command',
      severityLevel: item.severityLevel || 'Low',
      fineAmountInr: item.fineAmountInr || 0,
      productName: item.productName || 'Packaged Commodity',
      source: 'INSTITUTIONAL'
    };

    if (!db.reports) db.reports = [];
    db.reports.unshift(newReport);
    saveDb(db);
    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create report.' });
  }
});

router.delete('/reports/:id', (req, res) => {
  try {
    const db = getDb();
    const targetId = req.params.id;

    // Check institutional reports
    const instIdx = (db.reports || []).findIndex((r) => r.id === targetId);
    if (instIdx !== -1) {
      db.reports.splice(instIdx, 1);
      saveDb(db);
      return res.json({ success: true, message: `Report ${targetId} deleted.` });
    }

    // Check scan records
    const cleanScanId = targetId.replace(/^REP-/, 'INS-');
    const scanIdx = (db.scans || []).findIndex(
      (s) => s.id === targetId || s.id === cleanScanId || `REP-${s.id.replace(/^INS-/, '')}` === targetId
    );
    if (scanIdx !== -1) {
      const removed = db.scans.splice(scanIdx, 1)[0];
      if (db.violations) {
        db.violations = db.violations.filter((v) => v.scanId !== removed.id);
      }
      saveDb(db);
      return res.json({ success: true, message: `Inspection record ${targetId} deleted.` });
    }

    res.status(404).json({ error: 'Report not found.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete report.' });
  }
});

module.exports = router;

