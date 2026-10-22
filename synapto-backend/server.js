/**
 * Synapto AI — API + static frontend (single deploy)
 * Zero npm runtime deps. Built-ins only.
 * Run: node server.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3001;
const STATIC_DIR = process.env.STATIC_DIR || path.join(__dirname, '..');
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_FILE = process.env.DB_PATH || path.join(DATA_DIR, 'synapto.json');
const SESSION_MS = (Number(process.env.SESSION_DAYS) || 30) * 24 * 60 * 60 * 1000;

const defaultData = () => ({
  users: {}, progress: {}, wall: [], leaderboard: {},
  classrooms: {}, parentSessions: {}, parentAccounts: {}, moderation: [], billing: {},
});

function load() {
  try {
    if (fs.existsSync(DB_FILE)) return Object.assign(defaultData(), JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
  } catch (e) { console.warn('DB load failed:', e.message); }
  return defaultData();
}

let data = load();
if (!data.parentAccounts) data.parentAccounts = {};

function save() {
  try { fs.writeFileSync(DB_FILE, JSON.stringify(data)); } catch (e) { console.error('save failed', e.message); }
}
setInterval(save, 4000);
process.on('exit', save);
process.on('SIGINT', () => { save(); process.exit(0); });
process.on('SIGTERM', () => { save(); process.exit(0); });

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return { salt, hash };
}
function verifyPassword(password, salt, hash) {
  try {
    const h = crypto.scryptSync(String(password), salt, 64);
    const expected = Buffer.from(hash, 'hex');
    if (h.length !== expected.length) return false;
    return crypto.timingSafeEqual(h, expected);
  } catch (e) { return false; }
}
function issueSession(email) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + SESSION_MS;
  data.parentSessions[token] = { email, expiresAt };
  save();
  return { token, email, expiresAt };
}
function authParent(req) {
  const header = req.headers.authorization || '';
  const token = header.indexOf('Bearer ') === 0 ? header.slice(7) : null;
  if (!token) return null;
  const session = data.parentSessions[token];
  if (!session || session.expiresAt < Date.now()) return null;
  return { token, session };
}

function upsertUser(deviceId, fields) {
  const existing = data.users[deviceId] || { deviceId, name: 'Explorer', createdAt: Date.now() };
  data.users[deviceId] = Object.assign({}, existing, fields, { deviceId, updatedAt: Date.now() });
  save();
  return data.users[deviceId];
}
function setProgress(deviceId, lessonId, stars) {
  if (!data.progress[deviceId]) data.progress[deviceId] = {};
  const prev = data.progress[deviceId][lessonId];
  const s = Math.max(prev ? prev.stars : 0, Math.max(0, Math.min(3, Number(stars) || 0)));
  data.progress[deviceId][lessonId] = { stars: s, ts: Date.now() };
  const entries = Object.values(data.progress[deviceId]);
  const totalStars = entries.reduce((a, e) => a + e.stars, 0);
  const name = (data.users[deviceId] && data.users[deviceId].name) || 'Explorer';
  data.leaderboard[deviceId] = { name, stars: totalStars, lessons: entries.length, updatedAt: Date.now() };
  save();
  return data.progress[deviceId][lessonId];
}
function getProgress(deviceId) {
  const p = data.progress[deviceId] || {};
  return Object.keys(p).map(lessonId => ({ lessonId, stars: p[lessonId].stars, ts: p[lessonId].ts }));
}
function makeClassCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}
function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
  });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let buf = '';
    req.on('data', c => { buf += c; if (buf.length > 300000) { reject(new Error('too large')); req.destroy(); } });
    req.on('end', () => { try { resolve(buf ? JSON.parse(buf) : {}); } catch (e) { resolve({}); } });
    req.on('error', reject);
  });
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
};

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent(reqPath.split('?')[0]);
  const cleaned = path.normalize(decoded).replace(/^(\.\.[/\\])+/, '');
  const full = path.join(root, cleaned);
  if (!full.startsWith(path.resolve(root))) return null;
  return full;
}

function serveStatic(req, res) {
  let reqPath = new URL(req.url, 'http://x').pathname;
  if (reqPath === '/') reqPath = '/index.html';
  const file = safeJoin(STATIC_DIR, reqPath);
  if (!file) { res.writeHead(403); return res.end('Forbidden'); }
  fs.readFile(file, (err, buf) => {
    if (err) {
      const fallback = path.join(STATIC_DIR, 'synapto-xai.html');
      return fs.readFile(fallback, (err2, buf2) => {
        if (err2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(buf2);
      });
    }
    const ext = path.extname(file).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(buf);
  });
}

async function handle(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    });
    return res.end();
  }
  const u = new URL(req.url, 'http://localhost');
  const p = u.pathname;
  const method = req.method;
  try {
    if (method === 'GET' && p === '/health') return json(res, 200, { ok: true, service: 'synapto-api', version: '2.0.0' });

    if (method === 'POST' && (p === '/api/auth/signup' || p === '/api/auth/parent/signup')) {
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return json(res, 400, { error: 'Valid email required' });
      if (password.length < 8) return json(res, 400, { error: 'Password must be at least 8 characters' });
      if (data.parentAccounts[email]) return json(res, 409, { error: 'Email already registered' });
      const { salt, hash } = hashPassword(password);
      data.parentAccounts[email] = { salt, hash, createdAt: Date.now() };
      const session = issueSession(email);
      return json(res, 200, { ok: true, token: session.token, expiresAt: session.expiresAt, parent: { email } });
    }

    if (method === 'POST' && (p === '/api/auth/login' || p === '/api/auth/parent')) {
      const body = await readBody(req);
      const email = String(body.email || '').toLowerCase().trim();
      const password = String(body.password || '');
      if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return json(res, 400, { error: 'Valid email required' });
      const acct = data.parentAccounts[email];
      if (!acct) {
        if (password.length >= 8) {
          const { salt, hash } = hashPassword(password);
          data.parentAccounts[email] = { salt, hash, createdAt: Date.now() };
          const session = issueSession(email);
          return json(res, 200, { ok: true, token: session.token, expiresAt: session.expiresAt, parent: { email } });
        }
        return json(res, 401, { error: 'Incorrect email or password' });
      }
      if (!verifyPassword(password, acct.salt, acct.hash)) return json(res, 401, { error: 'Incorrect email or password' });
      const session = issueSession(email);
      return json(res, 200, { ok: true, token: session.token, expiresAt: session.expiresAt, parent: { email } });
    }

    if (method === 'POST' && p === '/api/auth/logout') {
      const auth = authParent(req);
      if (auth) { delete data.parentSessions[auth.token]; save(); }
      return json(res, 200, { ok: true });
    }

    if (method === 'GET' && p === '/api/auth/parent/me') {
      const auth = authParent(req);
      if (!auth) return json(res, 401, { error: 'Invalid or expired session' });
      return json(res, 200, { email: auth.session.email, expiresAt: auth.session.expiresAt });
    }

    if (method === 'POST' && p === '/api/users') {
      const body = await readBody(req);
      if (!body.deviceId) return json(res, 400, { error: 'deviceId required' });
      const user = upsertUser(String(body.deviceId).slice(0, 80), {
        name: String(body.name || 'Explorer').slice(0, 48),
        ageBand: body.ageBand || null,
        classCode: body.classCode || null,
      });
      return json(res, 200, { user });
    }

    if (method === 'GET' && p.startsWith('/api/users/') && !p.includes('/progress')) {
      const deviceId = decodeURIComponent(p.slice('/api/users/'.length));
      return json(res, 200, { user: data.users[deviceId] || null, progress: getProgress(deviceId) });
    }

    if (method === 'POST' && /\/api\/users\/[^/]+\/progress$/.test(p)) {
      const deviceId = decodeURIComponent(p.split('/')[3]);
      const body = await readBody(req);
      if (!body.lessonId) return json(res, 400, { error: 'lessonId required' });
      return json(res, 200, { progress: setProgress(deviceId, String(body.lessonId).slice(0, 80), body.stars) });
    }

    if (method === 'GET' && p === '/api/wall') {
      const limit = Math.min(50, Number(u.searchParams.get('limit') || 12));
      return json(res, 200, { events: (data.wall || []).slice(-limit).reverse() });
    }
    if (method === 'POST' && p === '/api/wall') {
      const body = await readBody(req);
      data.wall.push({ deviceId: String(body.deviceId || '').slice(0, 80), name: String(body.name || 'Explorer').slice(0, 48), text: String(body.text || '').slice(0, 280), ts: Date.now() });
      if (data.wall.length > 500) data.wall = data.wall.slice(-400);
      save();
      return json(res, 200, { ok: true });
    }

    if (method === 'GET' && p === '/api/leaderboard') {
      const list = Object.keys(data.leaderboard || {}).map(id => Object.assign({ deviceId: id }, data.leaderboard[id]));
      list.sort((a, b) => (b.stars || 0) - (a.stars || 0));
      return json(res, 200, { leaderboard: list.slice(0, 50) });
    }
    if (method === 'POST' && p === '/api/leaderboard') {
      const body = await readBody(req);
      if (!body.deviceId) return json(res, 400, { error: 'deviceId required' });
      data.leaderboard[body.deviceId] = { name: String(body.name || 'Explorer').slice(0, 48), stars: Number(body.stars) || 0, lessons: Number(body.lessons) || 0, updatedAt: Date.now() };
      save();
      return json(res, 200, { ok: true });
    }

    if (method === 'POST' && p === '/api/classrooms') {
      const auth = authParent(req);
      if (!auth) return json(res, 401, { error: 'Auth required' });
      let code = makeClassCode();
      while (data.classrooms[code]) code = makeClassCode();
      data.classrooms[code] = { ownerToken: auth.token, ownerEmail: auth.session.email, focusBand: null, members: [], createdAt: Date.now() };
      save();
      return json(res, 200, { code });
    }

    if (method === 'GET' && p === '/api/billing/status') {
      const email = (u.searchParams.get('email') || '').toLowerCase().trim();
      if (!email) return json(res, 400, { error: 'email required' });
      const row = data.billing[email];
      return json(res, 200, row && row.active ? { active: true, plan: row.plan || 'family' } : { active: false });
    }

    if (method === 'POST' && p === '/api/moderation/report') {
      const body = await readBody(req);
      data.moderation.push({ kind: String(body.kind || 'wall').slice(0, 32), name: String(body.name || '').slice(0, 64), text: String(body.text || '').slice(0, 500), ts: Date.now() });
      save();
      return json(res, 200, { ok: true });
    }

    if (p.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    if (method === 'GET' || method === 'HEAD') return serveStatic(req, res);
    json(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    console.error(err);
    json(res, 500, { error: 'Internal server error' });
  }
}

http.createServer((req, res) => handle(req, res)).listen(PORT, () => {
  console.log('\n  Synapto ready → http://localhost:' + PORT);
  console.log('  Health       → http://localhost:' + PORT + '/health');
  console.log('  Static dir   → ' + STATIC_DIR + '\n');
});
