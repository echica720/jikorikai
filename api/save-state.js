import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.KV_REST_API_URL,
  token: process.env.KV_REST_API_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { sessionId, progress } = req.body;
  if (!sessionId || !progress) {
    return res.status(400).json({ error: 'sessionId and progress required' });
  }

  try {
    // 30日間保持
    await redis.set(
      `${sessionId}_progress`,
      JSON.stringify(progress),
      { ex: 30 * 24 * 60 * 60 }
    );
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('save-state error:', e);
    return res.status(500).json({ error: e.message });
  }
}
