import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'id required' });
  }

  try {
    const raw = await redis.get(`${id}_progress`);
    if (!raw) {
      return res.status(200).json({
        completedSessions: [],
        activeSessions: {},
        summaries: {}
      });
    }
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return res.status(200).json(data);
  } catch (e) {
    console.error('get-state error:', e);
    return res.status(500).json({ error: e.message });
  }
}
