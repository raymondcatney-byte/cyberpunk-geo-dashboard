// Minimal KV/Redis wrapper for Vercel serverless.
// Uses Upstash Redis REST if configured; otherwise falls back to in-memory storage.

type Stored = {
  updatedAt: string;
  events?: unknown[];
  collectors?: unknown;
};

const MEM: Map<string, { value: Stored; expiresAt: number }> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__intel_mem_store || new Map();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).__intel_mem_store = MEM;

function nowMs() {
  return Date.now();
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: String(url).replace(/\/+$/, ''), token: String(token) };
}

async function upstash(cmd: unknown[]) {
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
  const data = (await r.json()) as Array<{ result?: unknown; error?: unknown }>;
  if (!Array.isArray(data) || !data.length) throw new Error('UPSTASH_BAD');
  if (data[0]?.error) throw new Error('UPSTASH_ERR');
  return data[0]?.result;
}

export async function storeLatest(key: string, payload: Stored, ttlSeconds: number) {
  const cfg = getUpstashConfig();
  if (cfg) {
    // SET key json EX ttl
    await upstash(['SET', key, JSON.stringify(payload), 'EX', String(ttlSeconds)]);
    return { backend: 'upstash' as const };
  }

  MEM.set(key, { value: payload, expiresAt: nowMs() + ttlSeconds * 1000 });
  return { backend: 'memory' as const };
}

export async function readLatest(key: string): Promise<Stored | null> {
  const cfg = getUpstashConfig();
  if (cfg) {
    const result = await upstash(['GET', key]);
    if (!result) return null;
    try {
      return JSON.parse(String(result)) as Stored;
    } catch {
      return null;
    }
  }

  const item = MEM.get(key);
  if (!item) return null;
  if (item.expiresAt <= nowMs()) {
    MEM.delete(key);
    return null;
  }
  return item.value;
}

export async function setIfNotExists(key: string, payloadOrTtlSeconds: Stored | number, maybeTtlSeconds?: number): Promise<boolean> {
  const payload =
    typeof payloadOrTtlSeconds === 'number'
      ? { updatedAt: new Date().toISOString(), events: [] }
      : payloadOrTtlSeconds;
  const ttlSeconds = typeof payloadOrTtlSeconds === 'number' ? payloadOrTtlSeconds : (maybeTtlSeconds ?? 0);

  const cfg = getUpstashConfig();
  if (cfg) {
    // SET key json NX EX ttl (NX = only if not exists)
    const result = await upstash(['SET', key, JSON.stringify(payload), 'NX', 'EX', String(ttlSeconds)]);
    return result !== null;
  }

  if (MEM.has(key)) return false;
  MEM.set(key, { value: payload, expiresAt: nowMs() + ttlSeconds * 1000 });
  return true;
}

