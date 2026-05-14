import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const data = req.body;

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

    const expirySeconds = Math.ceil((data.expires - Date.now()) / 1000);

    await redis.set(id, JSON.stringify(data), { ex: expirySeconds });

    return res.status(200).json({ id });
  } catch (e) {
    console.error('create-session error:', e);
    return res.status(500).json({ error: e.message });
  }
}
