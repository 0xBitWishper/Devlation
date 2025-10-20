import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { fetchJupiterTokenData, fetchTokenMetadataFromJupiter, fetchJupiterPrices, fetchTokenMetadata, fetchMultipleMetadata } from '../../lib/solanaMetadata';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const { publicKey } = req.query;
  if (!publicKey || typeof publicKey !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid publicKey' });
  }

  // Use server-side Connection instead of direct fetch to a hardcoded RPC endpoint
  const rpcEndpoint = (process as any).env?.SOLANA_RPC_ENDPOINT || clusterApiUrl('mainnet-beta');
  const conn = new Connection(rpcEndpoint, 'confirmed');

  try {
    // getParsedTokenAccountsByOwner returns all SPL tokens owned by the wallet
    const resp = await conn.getParsedTokenAccountsByOwner(new PublicKey(publicKey), { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });

    // resp may be an object with a `value` array or an array itself depending on SDK/runtime
    const accounts = Array.isArray((resp as any).value) ? (resp as any).value : (Array.isArray(resp) ? resp as any[] : []);

    // Use centralized metadata helper (Jupiter-first, with token-list and on-chain fallbacks)
    // to fetch metadata for all unique mints in one call.

    // Build initial token array from RPC (defensive parsing)
    const initial = (accounts || []).map((acc: any) => {
      const info = acc?.account?.data?.parsed?.info ?? acc?.data?.parsed?.info ?? null;
      if (!info) return null;
      return {
        mint: info.mint,
        amount: info.tokenAmount?.uiAmount ?? 0,
        decimals: info.tokenAmount?.decimals ?? 0,
      };
    }).filter(Boolean) as Array<{ mint: string; amount: number; decimals: number }>;

    // Enrich with centralized helper
    const uniqueMints = Array.from(new Set(initial.map((t: any) => t.mint))) as string[];

    // Jupiter-first: query Jupiter-lite per-mint, then fallback to fetchMultipleMetadata for misses
    const jPromises = uniqueMints.map((m) =>
      fetchJupiterTokenData(m).then((j) => ({ mint: m, j })).catch(() => ({ mint: m, j: null }))
    );
    const jResults = await Promise.allSettled(jPromises as Promise<any>[]);
    const metaMap: Record<string, any> = {};
    const misses: string[] = [];
    for (const r of jResults) {
      if (r.status === 'fulfilled') {
        const v = r.value as { mint: string; j: any };
        if (v.j) {
          metaMap[v.mint] = {
            mint: v.j.id ?? v.mint,
            name: v.j.name ?? null,
            symbol: v.j.symbol ?? null,
            logoURI: v.j.logoURI ?? null,
            price: typeof v.j.usdPrice === 'number' ? v.j.usdPrice : null,
            decimals: typeof v.j.decimals === 'number' ? v.j.decimals : undefined,
          };
        } else {
          misses.push(v.mint);
        }
      } else {
        // treat as miss
        try {
          const maybe = (r as any).value;
          if (maybe && maybe.mint) misses.push(maybe.mint);
        } catch {
          // ignore
        }
      }
    }

    // Fallback: fetch metadata for misses using the more comprehensive helper
    if (misses.length > 0) {
      const fallback = await fetchMultipleMetadata(misses);
      for (const m of misses) {
        const fm = fallback[m];
        if (fm) {
          metaMap[m] = {
            mint: fm.mint ?? m,
            name: fm.name ?? null,
            symbol: fm.symbol ?? null,
            logoURI: fm.logoURI ?? null,
            price: typeof fm.price === 'number' ? fm.price : null,
            decimals: typeof fm.decimals === 'number' ? fm.decimals : undefined,
          };
        } else {
          metaMap[m] = { mint: m, name: null, symbol: null, logoURI: null, price: null, decimals: undefined };
        }
      }
    }

    // Batch fetch prices for all mints (Jupiter price v3)
    const priceMap = await fetchJupiterPrices(uniqueMints);

    // Merge initial tokens with metadata (solanaMetadata is authoritative)
    const tokens = initial.map((t: any, idx: number) => {
      const meta = metaMap[t.mint] ?? null;
      const priceInfo = priceMap?.[t.mint] ?? {};
      const unitPrice = priceInfo?.usdPrice ?? meta?.price ?? null;
      // Attempt to extract 24h change from common Jupiter/price responses
      const changeCandidates = [
        priceInfo?.priceChange24h,
        priceInfo?.price_change_24h,
        priceInfo?.priceChangePercent24h,
        priceInfo?.percent_change_24h,
        priceInfo?.change24h,
        priceInfo?.change,
        priceInfo?.priceChange,
        priceInfo?.price_24h_change,
      ];
      const change24h = changeCandidates.find((c) => typeof c === 'number') ?? null;
      const priceDirection = change24h === null ? null : (change24h > 0 ? 'up' : change24h < 0 ? 'down' : 'flat');

      return {
        id: idx + 1,
        mint: t.mint,
        // Prefer token symbol from metadata; if decimals==0 treat as NFT
        symbol: meta?.symbol ?? (t.decimals === 0 ? 'NFT' : undefined),
        // name may be null; leave undefined so UI can display mint if desired
        name: meta?.name ?? undefined,
        balance: t.amount,
        decimals: typeof meta?.decimals === 'number' ? meta.decimals : t.decimals,
        mintAddress: t.mint,
        // Use metadata logoURI when available; otherwise null to allow UI fallbacks
        logoURI: meta?.logoURI ?? null,
        icon: undefined,
        // unit price (per token) in USD
        usdPrice: typeof unitPrice === 'number' ? unitPrice : null,
        // 24h change in percent (number) when available
        priceChange24h: typeof change24h === 'number' ? change24h : null,
        // 'up' | 'down' | 'flat' | null
        priceDirection,
      };
    });
    return res.status(200).json({ tokens });
  } catch (error) {
    // Log error detail ke console untuk debugging
    console.error('Solana token API error:', error);
    return res.status(500).json({ error: 'RPC request failed', details: error });
  }
}
