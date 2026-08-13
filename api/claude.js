import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

const ALLOWED_ORIGINS = [
  'https://jikorikai.vercel.app',
];

const ALLOWED_MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS_CAP = 2500;
const CALL_LIMIT_PER_SESSION = 300;

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowed = ALLOWED_ORIGINS.includes(origin);

  if (allowed) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(allowed ? 200 : 403).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  try {
    const { sessionId, system, messages, max_tokens } = req.body || {};

    if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 64) {
      return res.status(401).json({ error: 'session required' });
    }

    const raw = await redis.get(sessionId);
    if (!raw) return res.status(401).json({ error: 'session not found or expired' });

    const session = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (session.expires && Date.now() > session.expires) {
      return res.status(401).json({ error: 'session expired' });
    }

    const counterKey = `calls:${sessionId}`;
    const count = await redis.incr(counterKey);
    if (count === 1) await redis.expire(counterKey, 60 * 60 * 24 * 40);
    if (count > CALL_LIMIT_PER_SESSION) {
      return res.status(429).json({ error: 'call limit reached' });
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages required' });
    }

    const payload = {
      model: ALLOWED_MODEL,
      max_tokens: Math.min(Number(max_tokens) || 2500, MAX_TOKENS_CAP),
      system,
      messages,
    };

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (e) {
    console.error('claude handler error:', e);
    return res.status(500).json({ error: 'server error' });
  }
}
