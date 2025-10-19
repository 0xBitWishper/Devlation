import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const { publicKey } = req.query;
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid publicKey' });
  }

  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT;
  if (!endpoint) {
    return res.status(500).json({ error: 'Missing Solana RPC endpoint' });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // QuickNode does not require extra headers for Solana RPC, only endpoint URL
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getBalance',
        params: [publicKey],
      }),
    });
    const data = await response.json();
    // Solana RPC docs: https://docs.solana.com/api/http#getbalance
    // Response: { result: { value: <lamports> }, ... }
    if (data.error) {
      return res.status(500).json({ error: 'Solana RPC error', details: data.error });
    }
    if (data.result && typeof data.result.value === 'number') {
      // Convert lamports to SOL
      const sol = data.result.value / 1e9;
      return res.status(200).json({ sol });
    } else {
      return res.status(500).json({ error: 'Failed to fetch balance', details: data });
    }
  } catch (error) {
    return res.status(500).json({ error: 'RPC request failed', details: error });
  }
}
