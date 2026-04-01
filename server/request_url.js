function firstHeader(value) {
  if (Array.isArray(value)) return value[0];
  return value;
}

function safeProto(req) {
  const proto = firstHeader(req.headers?.['x-forwarded-proto']);
  if (!proto) return 'https';
  const normalized = proto.split(',')[0]?.trim().toLowerCase();
  return normalized === 'http' ? 'http' : 'https';
}

function safeHost(req) {
  const host = firstHeader(req.headers?.host);
  const normalized = String(host || '').trim();
  return normalized || 'vercel.invalid';
}

export function getRequestUrl(req) {
  const raw = typeof req.url === 'string' ? req.url : '/';
  const base = `${safeProto(req)}://${safeHost(req)}`;
  return new URL(raw, base);
}
