/**
 * Synapto durable store
 * - Default: atomic JSON file + rotating backups
 * - Optional: Postgres when DATABASE_URL is set (npm i pg)
 */
const fs = require('fs');
const path = require('path');

function defaultData() {
  return {
    users: {}, progress: {}, wall: [], leaderboard: {}, classrooms: {},
    parentSessions: {}, parentAccounts: {}, bookmarks: {}, children: {},
    moderation: [], billing: {},
  };
}

function createStore(options) {
  const DATA_DIR = options.dataDir;
  const DB_FILE = options.dbFile;
  const BACKUP_DIR = path.join(DATA_DIR, 'backups');
  const DATABASE_URL = process.env.DATABASE_URL || '';

  let data = defaultData();
  let mode = 'json';
  let pool = null;
  let saveTimer = null;
  let dirty = false;

  function ensureDirs() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  function mergeDefaults(raw) {
    return Object.assign(defaultData(), raw || {});
  }

  function loadJson() {
    ensureDirs();
    try {
      if (fs.existsSync(DB_FILE)) {
        data = mergeDefaults(JSON.parse(fs.readFileSync(DB_FILE, 'utf8')));
        return;
      }
    } catch (e) {
      console.warn('[store] JSON load failed, trying latest backup:', e.message);
      try {
        const files = fs.readdirSync(BACKUP_DIR).filter(function (f) { return f.endsWith('.json'); }).sort().reverse();
        if (files[0]) {
          data = mergeDefaults(JSON.parse(fs.readFileSync(path.join(BACKUP_DIR, files[0]), 'utf8')));
          console.warn('[store] Restored from backup', files[0]);
          return;
        }
      } catch (e2) {
        console.warn('[store] Backup restore failed:', e2.message);
      }
    }
    data = defaultData();
  }

  function saveJsonAtomic() {
    ensureDirs();
    const tmp = DB_FILE + '.tmp.' + process.pid + '.' + Date.now();
    try {
      fs.writeFileSync(tmp, JSON.stringify(data));
      fs.renameSync(tmp, DB_FILE);
      dirty = false;
    } catch (e) {
      console.error('[store] atomic save failed', e.message);
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  function rotateBackup() {
    ensureDirs();
    try {
      if (!fs.existsSync(DB_FILE)) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const dest = path.join(BACKUP_DIR, 'synapto-' + stamp + '.json');
      fs.copyFileSync(DB_FILE, dest);
      const files = fs.readdirSync(BACKUP_DIR).filter(function (f) { return f.indexOf('synapto-') === 0 && f.endsWith('.json'); }).sort();
      while (files.length > 14) {
        const f = files.shift();
        try { fs.unlinkSync(path.join(BACKUP_DIR, f)); } catch (_) {}
      }
    } catch (e) {
      console.warn('[store] backup rotate failed', e.message);
    }
  }

  async function initPostgres() {
    var pg;
    try { pg = require('pg'); } catch (e) {
      console.warn('[store] DATABASE_URL set but pg not installed. Falling back to JSON.');
      return false;
    }
    pool = new pg.Pool({
      connectionString: DATABASE_URL,
      ssl: process.env.PGSSL === 'false' ? false : { rejectUnauthorized: false },
      max: 5,
    });
    const client = await pool.connect();
    try {
      await client.query("CREATE TABLE IF NOT EXISTS synapto_state (id INTEGER PRIMARY KEY CHECK (id = 1), payload JSONB NOT NULL DEFAULT '{}'::jsonb, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
      await client.query("CREATE TABLE IF NOT EXISTS synapto_snapshots (id BIGSERIAL PRIMARY KEY, payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW())");
      const res = await client.query('SELECT payload FROM synapto_state WHERE id = 1');
      if (res.rows.length) data = mergeDefaults(res.rows[0].payload);
      else {
        data = defaultData();
        await client.query('INSERT INTO synapto_state (id, payload) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING', [JSON.stringify(data)]);
      }
      mode = 'postgres';
      console.log('[store] Postgres connected');
      return true;
    } finally { client.release(); }
  }

  async function savePostgres() {
    if (!pool) return;
    const client = await pool.connect();
    try {
      await client.query("INSERT INTO synapto_state (id, payload, updated_at) VALUES (1, $1::jsonb, NOW()) ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()", [JSON.stringify(data)]);
      dirty = false;
    } finally { client.release(); }
  }

  async function snapshotPostgres() {
    if (!pool) return;
    try {
      await pool.query('INSERT INTO synapto_snapshots (payload) VALUES ($1::jsonb)', [JSON.stringify(data)]);
      await pool.query('DELETE FROM synapto_snapshots WHERE id IN (SELECT id FROM synapto_snapshots ORDER BY created_at DESC OFFSET 30)');
    } catch (e) { console.warn('[store] snapshot failed', e.message); }
  }

  function markDirty() { dirty = true; }
  function scheduleSave() {
    if (saveTimer) return;
    saveTimer = setTimeout(async function () {
      saveTimer = null;
      if (!dirty) return;
      try {
        if (mode === 'postgres') await savePostgres();
        else saveJsonAtomic();
      } catch (e) { console.error('[store] save error', e.message); }
    }, 500);
  }
  function save() { markDirty(); scheduleSave(); }
  function saveSync() {
    dirty = true;
    if (mode === 'postgres') {
      if (pool) {
        try { ensureDirs(); fs.writeFileSync(DB_FILE + '.pg-fallback.json', JSON.stringify(data)); } catch (_) {}
        savePostgres().catch(function (e) { console.error('[store] pg saveSync', e.message); });
      }
    } else saveJsonAtomic();
  }

  async function init() {
    if (DATABASE_URL) {
      try {
        const ok = await initPostgres();
        if (ok) {
          setInterval(function () { snapshotPostgres().catch(function () {}); }, 6 * 60 * 60 * 1000);
          return { mode: mode, data: data };
        }
      } catch (e) { console.warn('[store] Postgres init failed, using JSON:', e.message); }
    }
    loadJson();
    mode = 'json';
    rotateBackup();
    setInterval(rotateBackup, 24 * 60 * 60 * 1000);
    return { mode: mode, data: data };
  }

  return {
    init: init, save: save, saveSync: saveSync,
    get data() { return data; },
    set data(v) { data = v; },
    get mode() { return mode; },
  };
}

module.exports = { createStore, defaultData };
