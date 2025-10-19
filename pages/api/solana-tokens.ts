import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const { publicKey } = req.query;
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid publicKey' });
  }

  // Ganti endpoint ke Ankr mainnet
  const endpoint = process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "https://rpc.ankr.com/solana/";
  if (!endpoint) {
    return res.status(500).json({ error: 'Missing Solana RPC endpoint' });
  }

  try {
    // getParsedTokenAccountsByOwner returns all SPL tokens owned by the wallet
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getTokenAccountsByOwner',
        params: [
          publicKey,
          { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
          { encoding: 'jsonParsed' }
        ],
      }),
    });
    const text = await response.text();
    console.error('Solana token API raw response:', text);
    const data = JSON.parse(text);
    if (data.error) {
      return res.status(500).json({ error: 'Solana RPC error', details: data.error });
    }
    // Solana Token List CDN
    const TOKEN_LIST_CDN = "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json";
    let tokenMeta: Record<string, any> = {};
    try {
      const metaRes = await fetch(TOKEN_LIST_CDN);
      const metaData = await metaRes.json();
      if (metaData && Array.isArray(metaData.tokens)) {
        for (const t of metaData.tokens) {
          tokenMeta[t.address] = t;
        }
      }
    } catch {}

    // Parse token list
    // Fallback metadata dari Pump.fun jika mint tidak ada di token list
    async function getPumpFunMeta(mint: string) {
      try {
        // Use Pump.fun API docs endpoint for token metadata
        const pumpRes = await fetch(`https://frontend-api-v3.pump.fun/api/coins/${mint}`);
        if (!pumpRes.ok) return {};
        const pumpData = await pumpRes.json();
        // Defensive mapping for image/imageUri/logo
        return {
          symbol: pumpData.symbol || pumpData.ticker || '',
          name: pumpData.name || pumpData.coinName || '',
          logoURI: pumpData.image || pumpData.imageUri || pumpData.logo || '',
        };
      } catch (err) {
        console.error('Pump.fun metadata fetch error:', err);
        return {};
      }
    }

    const tokens = await Promise.all((data.result?.value || []).map(async (acc: any) => {
      const info = acc.account.data.parsed.info;
      let meta = tokenMeta[info.mint] || {};
      if (!meta.symbol && !meta.logoURI) {
        // Fallback ke Pump.fun
        const pumpMeta = await getPumpFunMeta(info.mint);
        meta = { ...meta, ...pumpMeta };
      }
      return {
        mint: info.mint,
        symbol: meta.symbol || (info.tokenAmount?.decimals === 0 ? 'NFT' : undefined),
        name: meta.name || info.mint,
        amount: info.tokenAmount.uiAmount,
        decimals: info.tokenAmount.decimals,
        logoURI: meta.logoURI || '',
      };
    }));
    return res.status(200).json({ tokens });
  } catch (error) {
    // Log error detail ke console untuk debugging
    console.error('Solana token API error:', error);
    return res.status(500).json({ error: 'RPC request failed', details: error });
  }
}
