// server/intelligence_store.js
// Minimal KV/Redis wrapper for Vercel serverless (Upstash Redis REST).
// Falls back to in-memory storage if Upstash env vars are missing.

const MEM = globalThis.__intel_mem_store || new Map();
globalThis.__intel_mem_store = MEM;

function nowMs() {
  return Date.now();
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: String(url).replace(/\/+$/, ''), token: String(token) };
}

async function upstash(cmd) {
  const cfg = getUpstashConfig();
  if (!cfg) throw new Error('NO_UPSTASH');

  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([cmd]),
  });

  if (!r.ok) throw new Error(`UPSTASH_${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data) || !data.length) throw new Error('UPSTASH_BAD');
  if (data[0]?.error) throw new Error('UPSTASH_ERR');
  return data[0]?.result;
}

function memGet(key) {
  const item = MEM.get(key);
  if (!item) return null;
  if (item.expiresAt <= nowMs()) {
    MEM.delete(key);
    return null;
  }
  return item.value;
}

function memSet(key, value, ttlSeconds) {
  MEM.set(key, { value, expiresAt: nowMs() + ttlSeconds * 1000 });
}

// Stores a JSON-serializable payload at key for ttlSeconds.
export async function storeLatest(key, payload, ttlSeconds) {
  const cfg = getUpstashConfig();
  if (cfg) {
    await upstash(['SET', key, JSON.stringify(payload), 'EX', String(ttlSeconds)]);
    return { backend: 'upstash' };
  }

  memSet(key, payload, ttlSeconds);
  return { backend: 'memory' };
}

// Reads a JSON payload from key or returns null.
export async function readLatest(key) {
  const cfg = getUpstashConfig();
  if (cfg) {
    const result = await upstash(['GET', key]);
    if (!result) return null;
    try {
      return JSON.parse(String(result));
    } catch {
      return null;
    }
  }

  return memGet(key);
}

// Idempotency helper for dedupe keys.
// Returns true if we set the key (first time), false if it already exists.
export async function setIfNotExists(key, ttlSeconds) {
  const cfg = getUpstashConfig();
  if (cfg) {
    const result = await upstash(['SET', key, '1', 'NX', 'EX', String(ttlSeconds)]);
    return String(result || '').toUpperCase() === 'OK';
  }

  const existing = memGet(key);
  if (existing) return false;
  memSet(key, '1', ttlSeconds);
  return true;
}