const express = require('express');
const { COOKIE_NAME, encodeSession, decodeSession, hashPassword, verifyPassword } = require('../middlewares/auth');
const { getDb, saveDb } = require('../data/store');

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';

// GET /api/auth/me - Verify and return current authenticated user session
router.get('/me', (req, res) => {
  const item = (req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : null;
  const session = decodeSession(token);
  if (!session) {
    return res.status(401).json({ error: 'Unauthenticated' });
  }
  res.json(session);
});

// POST /api/auth/login - Secure login with password verification
router.post('/login', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Badge ID and password are required.' });
  }

  const db = getDb();
  const cleanUsername = String(username).trim();
  const user = (db.users || []).find(
    (u) =>
      u.role === role &&
      (u.username.toLowerCase() === cleanUsername.toLowerCase() ||
        u.badgeNumber.toLowerCase() === cleanUsername.toLowerCase() ||
        u.email?.toLowerCase() === cleanUsername.toLowerCase())
  );

  if (!user || !verifyPassword(String(password), user.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials. Check badge ID, role, or password.' });
  }

  const nowIso = new Date().toISOString();

  // Update user last login
  user.lastLogin = nowIso;

  // If inspector, update lastActiveTime and lastLogin in inspectors list
  if (db.inspectors) {
    const insp = db.inspectors.find(
      (i) => i.idBadge?.toUpperCase() === user.badgeNumber?.toUpperCase() || i.name === user.name
    );
    if (insp) {
      insp.lastActiveTime = 'Active now';
      insp.lastLogin = nowIso;
    }
  }

  const profile = {
    id: user.id || user.badgeNumber,
    name: user.name,
    badgeNumber: user.badgeNumber,
    role: user.role,
    jurisdiction: user.jurisdiction || 'Regional Metrology Directorate',
    email: user.email || `${user.badgeNumber.toLowerCase()}@metrology.gov.in`,
    avatarUrl: user.avatarUrl || '',
    inspectionsCompleted: user.inspectionsCompleted || 0,
    accuracyRate: user.accuracyRate || 99.2,
    activeStatus: user.activeStatus !== false,
    lastLogin: nowIso
  };

  // Record audit log
  try {
    if (!db.auditLogs) db.auditLogs = [];
    db.auditLogs.unshift({
      id: `LOG-AUTH-${Date.now()}`,
      timestamp: nowIso,
      userId: profile.id,
      userName: profile.name,
      action: 'USER_LOGIN',
      targetResource: `SESSION-${profile.role}`,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || '127.0.0.1',
      status: 'SUCCESS',
      category: 'AUTH',
      details: `${profile.role} ${profile.name} successfully authenticated via Agency Badge ${profile.badgeNumber}.`
    });
    saveDb(db);
  } catch (err) {
    console.error('Audit log write error on login:', err);
  }

  res.cookie(COOKIE_NAME, encodeSession(profile), {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 8 * 60 * 60 * 1000,
    path: '/'
  });

  res.json(profile);
});

// POST /api/auth/register - Sign up for new inspector or administrator accounts
router.post('/register', (req, res) => {
  try {
    const { name, badgeNumber, email, password, role, jurisdiction, phone } = req.body || {};

    if (!name || !badgeNumber || !password || !role) {
      return res.status(400).json({ error: 'Name, Badge ID, Password, and Role are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const db = getDb();
    const cleanBadge = String(badgeNumber).trim().toUpperCase();

    // Check for duplicate badge
    const existing = (db.users || []).find(
      (u) => u.badgeNumber.toUpperCase() === cleanBadge || u.username.toUpperCase() === cleanBadge
    );

    if (existing) {
      return res.status(409).json({ error: `An account with Badge ID '${cleanBadge}' already exists.` });
    }

    const passwordHash = hashPassword(String(password));
    const newUser = {
      id: cleanBadge,
      username: cleanBadge,
      passwordHash,
      name: String(name).trim(),
      badgeNumber: cleanBadge,
      role: role === 'ADMINISTRATOR' ? 'ADMINISTRATOR' : 'INSPECTOR',
      jurisdiction: jurisdiction || 'Northern Metrology Zone - Sector 4',
      email: email || `${cleanBadge.toLowerCase()}@metrology.gov.in`,
      phone: phone || '+91 98000 00000',
      avatarUrl: '',
      inspectionsCompleted: 0,
      accuracyRate: 99.0,
      activeStatus: true,
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);

    // Also add to inspectors roster if role is INSPECTOR
    if (newUser.role === 'INSPECTOR') {
      const initials = newUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();

      db.inspectors.unshift({
        id: `insp_${Date.now()}`,
        name: newUser.name,
        initials: initials || 'IN',
        idBadge: newUser.badgeNumber,
        totalInspections: 0,
        reportsGenerated: 0,
        currentStatus: 'Active - Field',
        statusType: 'success',
        email: newUser.email,
        phone: newUser.phone,
        jurisdiction: newUser.jurisdiction,
        avatarBgColor: 'bg-sky-500',
        lastActiveTime: 'Just Registered',
        accuracyRate: 99.0
      });
    }

    // Record audit log
    db.auditLogs.unshift({
      id: `LOG-REG-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: newUser.id,
      userName: newUser.name,
      action: 'USER_REGISTER',
      targetResource: `ACCOUNT-${newUser.role}`,
      ipAddress: req.ip || '127.0.0.1',
      status: 'SUCCESS',
      category: 'AUTH',
      details: `New ${newUser.role} account registered: ${newUser.name} (${newUser.badgeNumber}).`
    });

    saveDb(db);

    const profile = {
      id: newUser.id,
      name: newUser.name,
      badgeNumber: newUser.badgeNumber,
      role: newUser.role,
      jurisdiction: newUser.jurisdiction,
      email: newUser.email,
      avatarUrl: newUser.avatarUrl,
      inspectionsCompleted: 0,
      accuracyRate: 99.0,
      activeStatus: true
    };

    res.cookie(COOKIE_NAME, encodeSession(profile), {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      maxAge: 8 * 60 * 60 * 1000,
      path: '/'
    });

    res.status(201).json(profile);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// POST /api/auth/logout - Clear session cookie
router.post('/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax', secure: isProduction, path: '/' });
  res.status(204).end();
});

module.exports = router;

