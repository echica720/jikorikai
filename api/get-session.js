import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'IDが指定されていません' });
  }

  try {
    const raw = await redis.get(id);

    if (!raw) {
      return res.status(404).json({ error: 'expired' });
    }

    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;

    return res.status(200).json(data);
  } catch (e) {
    console.error('get-session error:', e);
    return res.status(500).json({ error: e.message });
  }
}
