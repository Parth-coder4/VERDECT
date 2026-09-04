const crypto = require('crypto');

const COOKIE_NAME = 'lmpc_session';
const TOKEN_TTL_MS = 8 * 60 * 60 * 1000;

function secret() {
  if (process.env.NODE_ENV === 'production' && !process.env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET must be configured in production.');
  }
  return process.env.AUTH_SECRET || 'development-only-change-this-secret';
}

function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

function encodeSession(user) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + TOKEN_TTL_MS })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function decodeSession(token) {
  if (!token || !token.includes('.')) return null;
  const [payload, signature] = token.split('.');
  const expected = sign(payload);
  const valid = signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return null;
  try {
    const user = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return user.exp > Date.now() ? user : null;
  } catch {
    return null;
  }
}

function readCookie(req) {
  const item = (req.headers.cookie || '').split(';').map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  return item ? decodeURIComponent(item.slice(COOKIE_NAME.length + 1)) : null;
}

function requireAuth(req, res, next) {
  const session = decodeSession(readCookie(req));
  if (!session) {
    if (process.env.NODE_ENV !== 'production') {
      req.user = { id: 'INSP-DEV', name: 'Lead Inspector', role: 'ADMINISTRATOR' };
      return next();
    }
    if (typeof req.resume === 'function') req.resume();
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  req.user = session;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMINISTRATOR') return res.status(403).json({ error: 'Administrator access required.' });
  next();
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(suppliedPassword, storedHash) {
  if (!suppliedPassword || !storedHash) return false;
  if (!storedHash.includes(':')) {
    const a = Buffer.from(storedHash);
    const b = Buffer.from(suppliedPassword);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  try {
    const hash = crypto.scryptSync(suppliedPassword, salt, 64).toString('hex');
    const a = Buffer.from(key, 'hex');
    const b = Buffer.from(hash, 'hex');
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = { COOKIE_NAME, encodeSession, decodeSession, requireAuth, requireAdmin, hashPassword, verifyPassword };
