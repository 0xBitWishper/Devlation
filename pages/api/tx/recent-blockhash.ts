import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, clusterApiUrl } from '@solana/web3.js'

const RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl('mainnet-beta');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const conn = new Connection(RPC_URL, { commitment: 'confirmed' });
    const lh = await conn.getLatestBlockhash('finalized');
    return res.status(200).json({ blockhash: lh.blockhash, lastValidBlockHeight: lh.lastValidBlockHeight });
  } catch (e: any) {
    console.error('[recent-blockhash] error', e?.message ?? e);
    return res.status(500).json({ error: 'Failed to fetch blockhash' });
  }
}
