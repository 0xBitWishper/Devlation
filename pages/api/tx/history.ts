import type { NextApiRequest, NextApiResponse } from 'next'
import path from 'path'
import fs from 'fs'

const DATA_DIR = path.resolve(process.cwd(), 'data');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { pubkey } = req.query;
    if (!pubkey || typeof pubkey !== 'string') return res.status(400).json({ error: 'pubkey query required' });
    const file = path.join(DATA_DIR, `${pubkey}.burns.json`);
    let arr: any[] = [];
    try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch (e) { arr = []; }
    return res.status(200).json({ burns: arr });
  } catch (e: any) {
    console.error('[history] error', e?.message ?? e);
    return res.status(500).json({ error: 'Failed to read history' });
  }
}
