import { NextResponse } from 'next/server';
import { fetchJupiterPrices, fetchJupiterTokenData, fetchTokenMetadataFromJupiter } from '../../../lib/solanaMetadata';

// Simple in-memory cache for server-side prices
type PriceValue = number | null | Record<string, number | null>;
const PRICE_CACHE = new Map<string, { ts: number; value: PriceValue }>();
const CACHE_TTL = 15 * 1000; // 15 seconds

async function retryFetch(url: string, attempts = 2, delayMs = 200) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(url);
      if (r.ok) return r;
    } catch (e) {
      // ignore
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

async function fetchTokenListMap() {
  try {
    const LIST_URL = 'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';
    const r = await retryFetch(LIST_URL, 2);
    if (!r) return null;
    const j = await r.json();
    return (j.tokens || []).reduce((acc: any, t: any) => {
      acc[t.address] = t;
      acc[t.symbol?.toLowerCase()] = acc[t.symbol?.toLowerCase()] || t;
      return acc;
    }, {} as Record<string, any>);
  } catch (e) {
    return null;
  }
}

async function fetchPriceFromSources(mintOrSymbol: string, symbol?: string, quote: 'USD' | 'USDC' = 'USD') {
  try {
    const maybeSymbol = (symbol ?? mintOrSymbol).toUpperCase();
    if (maybeSymbol === 'SOL') {
      const res = await retryFetch(
        'https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false',
        2,
        200
      );
      if (!res) return null;
      const data = await res.json();
      const priceUsd = data.market_data?.current_price?.usd ?? null;
      if (quote === 'USD' || priceUsd === null) return priceUsd;
      const usdcRes = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
      if (!usdcRes.ok) return null;
      const usdcJson = await usdcRes.json();
      const usdcPriceUsd = usdcJson.market_data?.current_price?.usd ?? null;
      if (!usdcPriceUsd) return null;
      return priceUsd / usdcPriceUsd;
    }

    // Jupiter price by mint
    const mint = mintOrSymbol;
  // Use Jupiter lite API v3 which returns a mapping of { mint: { usdPrice, ... } }
  const res = await retryFetch(`https://lite-api.jup.ag/price/v3?ids=${mint}`, 2, 200);
  let json: any = null;
  if (res) json = await res.json();
  const priceUsd = json?.[mint]?.usdPrice ?? null;
    if (priceUsd === null) {
      // Try token-list lookup by symbol or address, then CoinGecko
      try {
        const tl = await fetchTokenListMap();
        if (tl) {
          const maybe = tl[mint] || (symbol && tl[symbol.toLowerCase()]);
          if (maybe && maybe.extensions?.coingeckoId) {
            const id = maybe.extensions.coingeckoId;
            const pResp = await retryFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`, 2, 200);
            if (pResp) {
              const pj = await pResp.json();
              const p = pj[id]?.usd ?? null;
              if (p) return p;
            }
          }
        }

        if (symbol) {
          const search = await retryFetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(symbol)}`, 2, 200);
          if (search) {
            const sj = await search.json();
            const found = (sj.coins || []).find((c: any) => (c.symbol || '').toLowerCase() === symbol.toLowerCase());
            if (found && found.id) {
              const priceResp = await retryFetch(`https://api.coingecko.com/api/v3/simple/price?ids=${found.id}&vs_currencies=usd`, 2, 200);
              if (priceResp) {
                const pj = await priceResp.json();
                const p = pj[found.id]?.usd ?? null;
                if (p) return p;
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
      return null;
    }
    if (quote === 'USD') return priceUsd;
    const usdcRes = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
    if (!usdcRes.ok) return null;
    const usdcJson = await usdcRes.json();
    const usdcPriceUsd = usdcJson.market_data?.current_price?.usd ?? null;
    if (!usdcPriceUsd) return null;
    return priceUsd / usdcPriceUsd;
  } catch (e) {
    return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const mintParam = url.searchParams.get('mint') ?? url.searchParams.get('symbol');
    const symbol = url.searchParams.get('symbol') ?? undefined;
    const quote = (url.searchParams.get('quote') as 'USD' | 'USDC') ?? 'USDC';

    if (!mintParam) return NextResponse.json({ error: 'missing mint or symbol' }, { status: 400 });

    // Support comma-separated list of mints: ?mint=AAA,BBB,CCC
    const mints = mintParam.split(',').map((s) => s.trim()).filter(Boolean);

    if (mints.length > 1) {
      // Check cache for the whole batch key
      const batchKey = `batch::${mints.join(',')}::${quote}`;
      const cachedBatch = PRICE_CACHE.get(batchKey);
      if (cachedBatch && Date.now() - cachedBatch.ts < CACHE_TTL) {
        return NextResponse.json({ prices: cachedBatch.value });
      }

      // Use Jupiter price v3 endpoint for multiple ids
      const ids = mints.join(',');
      try {
        const priceMap = await fetchJupiterPrices(mints);
        const out: Record<string, number | null> = {};
        for (const m of mints) {
          const p = priceMap?.[m]?.usdPrice ?? null;
          out[m] = typeof p === 'number' ? p : null;
        }
        PRICE_CACHE.set(batchKey, { ts: Date.now(), value: out });
        return NextResponse.json({ prices: out });
      } catch (e) {
        const out: Record<string, number | null> = {};
        for (const m of mints) out[m] = await fetchPriceFromSources(m, undefined, quote);
        PRICE_CACHE.set(batchKey, { ts: Date.now(), value: out });
        return NextResponse.json({ prices: out });
      }
    }

    // Single mint flow — return richer metadata + price
    const mint = mints[0];
    const cacheKey = `${mint}::${(symbol ?? '').toUpperCase()}::${quote}`;
    const cached = PRICE_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return NextResponse.json({ price: cached.value });
    }

    // Try Jupiter tokens search for metadata and usdPrice
    try {
      const meta = await fetchTokenMetadataFromJupiter(mint);
      if (meta) {
        const out = { id: meta.mint, name: meta.name, symbol: meta.symbol, logoURI: meta.logoURI, usdPrice: meta.price, decimals: meta.decimals };
  PRICE_CACHE.set(cacheKey, { ts: Date.now(), value: out.usdPrice ?? null });
        return NextResponse.json({ token: out });
      }
    } catch (_) {}

    // Fallback to price source only
    const price = await fetchPriceFromSources(mint, symbol, quote);
    PRICE_CACHE.set(cacheKey, { ts: Date.now(), value: price });
    return NextResponse.json({ price });
  } catch (e) {
    return NextResponse.json({ price: null });
  }
}
