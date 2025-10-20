// solanaMetadata.ts
import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";
// Avoid importing heavy umi/serializers from mpl-token-metadata (causes build issues).
// We'll parse the on‑chain metadata account bytes with a lightweight parser below.

// The canonical Metaplex Token Metadata program id (base58)
// Export name changed in newer versions of mpl-token-metadata; using the
// literal PublicKey avoids import errors and keeps this module stable.
const METAPLEX_PROGRAM_ID_STR =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
const METAPLEX_PROGRAM_ID = new PublicKey(METAPLEX_PROGRAM_ID_STR);

/** Struktur data yang akan dikembalikan ke pemanggil */
export interface TokenMeta {
  /** Mint address dalam bentuk string (base58) */
  mint: string;
  /** Nama token (null bila tidak tersedia) */
  name: string | null;
  /** Simbol token (null bila tidak tersedia) */
  symbol: string | null;
  /** URI metadata yang biasanya menunjuk ke file JSON di Arweave / IPFS */
  uri: string | null;
  /** URL gambar (logo) – di‑extract dari file JSON di atas (bisa null). */
  logoURI?: string | null;
  /** harga USD, bila tersedia dari sumber (Jupiter) */
  price?: number | null;
  /** decimals bila tersedia */
  decimals?: number | null;
}

/** Cache sederhana – mencegah request berulang ke jaringan */
const metaCache = new Map<string, TokenMeta>();

// Cache full token-list to speed up lookups and provide more reliable logoURIs
let tokenListCache: Record<string, any> | null = null;
async function ensureTokenListLoaded() {
  if (tokenListCache) return tokenListCache;
  try {
    const LIST_URL =
      'https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json';
    const resp = await fetch(LIST_URL);
    if (!resp.ok) return null;
    const json = await resp.json();
    tokenListCache = (json.tokens || []).reduce((acc: any, t: any) => {
      acc[t.address] = t;
      return acc;
    }, {} as Record<string, any>);
    return tokenListCache;
  } catch (e) {
    return null;
  }
}

/**
 * Query Jupiter lite token search for a mint or symbol. Returns name/symbol/logoURI when available.
 */
export async function fetchJupiterTokenData(mintOrSymbol: string) {
  try {
    const q = encodeURIComponent(mintOrSymbol);
    const res = await fetch(`https://lite-api.jup.ag/tokens/v2/search?query=${q}`);
    if (!res.ok) return null;
    const json = await res.json();

  // Flexible parsing: results might be an array at the root or nested under different keys
  let candidates: any[] = [];
  if (Array.isArray(json)) candidates = json;
  else if (Array.isArray(json.data)) candidates = json.data;
  else if (Array.isArray(json.tokens)) candidates = json.tokens;
  else if (Array.isArray(json.results)) candidates = json.results;
  else if (Array.isArray(json.items)) candidates = json.items;

    if (candidates.length === 0) {
      // maybe a mapping by mint
      const key = Object.keys(json).find((k) => k.toLowerCase() === mintOrSymbol.toLowerCase());
      if (key) {
        const token = json[key];
        const id = token.address || token.mint || token.id || key;
        const logo = token.logo || token.logoURI || token.icon || token.image || token.logoUrl || token.logo_url;
        const usdPrice = token.usdPrice ?? token.price ?? token.priceUsd ?? token.price_usd ?? null;
        const decimals = token.decimals ?? token.dec ?? null;
        return { id, name: token.name || token.title, symbol: token.symbol || token.ticker, logoURI: logo, usdPrice, decimals };
      } 
      return null;
    }

    const found = candidates.find((c) => {
      const addr = (c.address || c.mint || c.id || c.tokenAddress || '').toString().toLowerCase();
      const sym = (c.symbol || c.ticker || '').toString().toLowerCase();
      return addr === mintOrSymbol.toLowerCase() || sym === mintOrSymbol.toLowerCase();
    }) || candidates[0];

    const id = found?.address || found?.mint || found?.id || found?.tokenAddress || null;
    // prefer common icon/logo/image fields (Jupiter often uses `icon`)
    const logo = found?.logo || found?.logoURI || found?.icon || found?.image || found?.logoUrl || found?.logo_url || found?.image_url || null;
    const name = found?.name || found?.title || found?.tokenName || null;
    const symbol = found?.symbol || found?.ticker || null;
    const usdPrice = found?.usdPrice ?? found?.price ?? found?.priceUsd ?? found?.price_usd ?? null;
    const decimals = found?.decimals ?? found?.dec ?? null;
    return { id, name, symbol, logoURI: logo, usdPrice, decimals };
  } catch (e) {
    return null;
  }
}

/**
 * -------------------------------------------------------------------------
 * 1️⃣  Helper: hitung PDA Metaplex untuk sebuah mint
 * -------------------------------------------------------------------------
 */
function getMetadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync([
    Buffer.from("metadata"),
    METAPLEX_PROGRAM_ID.toBuffer(),
    mint.toBuffer(),
  ], METAPLEX_PROGRAM_ID);
  return pda;
}

/**
 * Lightweight parser for Metaplex Metadata account (v1) to extract
 * name, symbol, and uri fields. This uses the canonical offsets:
 * key(1) + updateAuthority(32) + mint(32) = 65 -> name(32) -> symbol(10) -> uri(200)
 */
function parseMetadataAccountData(raw: Buffer | Uint8Array) {
  try {
    const buf = Buffer.from(raw as any);
    // Primary attempt: canonical offsets
    let name = buf.slice(65, 65 + 32).toString('utf8').replace(/\0/g, '').trim() || null;
    let symbol = buf.slice(97, 97 + 10).toString('utf8').replace(/\0/g, '').trim() || null;
    let uri = buf.slice(107, 107 + 200).toString('utf8').replace(/\0/g, '').trim() || null;

    // If URI missing, scan the buffer for common URI prefixes
    if (!uri) {
      const str = buf.toString('utf8');
      const ipfsIdx = str.indexOf('ipfs://');
      const arIdx = str.indexOf('ar://');
      const httpIdx = str.indexOf('http://');
      const httpsIdx = str.indexOf('https://');
      const idxCandidates = [ipfsIdx, arIdx, httpsIdx, httpIdx].filter((i) => i >= 0);
      if (idxCandidates.length > 0) {
        const idx = Math.min(...idxCandidates);
        const sub = str.slice(idx);
        const m = sub.match(/^(ipfs:\/\/[^\s\"]+|ar:\/\/[^\s\"]+|https?:\/\/[^\s\"]+)/);
        if (m) uri = m[0];
      }
    }

    // If name/symbol missing, try to heuristically extract from buffer
    if (!name || !symbol) {
      const txt = buf.toString('utf8').replace(/\0/g, ' ');
      const near = txt.slice(65, 200).trim();
      const parts = near.split(/\s{2,}|\n/).map((s) => s.trim()).filter(Boolean);
      if (!name && parts[0]) name = parts[0];
      if (!symbol && parts[1]) symbol = parts[1];
    }

    return { name, symbol, uri };
  } catch (e) {
    return { name: null, symbol: null, uri: null };
  }
}

/** Normalize common metadata URIs (ipfs://, ar://) to HTTP gateways for fetching */
function normalizeUri(uri: string) {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://')) {
    // try public gateways
    const cid = uri.replace('ipfs://', '').replace(/^ipfs\//, '');
    return [`https://ipfs.io/ipfs/${cid}`, `https://cloudflare-ipfs.com/ipfs/${cid}`];
  }
  if (uri.startsWith('ar://')) {
    const id = uri.replace('ar://', '');
    return [`https://arweave.net/${id}`];
  }
  return [uri];
}

/**
 * -------------------------------------------------------------------------
 * 2️⃣  Fetch JSON dari token‑list CDN (fallback)
 * -------------------------------------------------------------------------
 */
async function fetchFromTokenList(
  mintStr: string
): Promise<{ name?: string; symbol?: string; logoURI?: string } | null> {
  try {
    // Use Jupiter-lite token search as single source of truth
    const j = await fetchJupiterTokenData(mintStr);
    if (!j) return null;
    // Map to the legacy shape used by callers
    return { name: j.name ?? undefined, symbol: j.symbol ?? undefined, logoURI: j.logoURI ?? undefined };
  } catch (e) {
    console.warn('[meta] gagal fetch token‑list:', e);
    return null;
  }
}

/**
 * -------------------------------------------------------------------------
 * 3️⃣  Core: ambil metadata satu‑mint
 * -------------------------------------------------------------------------
 */
export async function fetchTokenMetadata(
  /** Mint address dalam string (base58) */
  mintAddress: string,
  /** Opsional: koneksi RPC custom (default = mainnet‑beta) */
  connection?: Connection
): Promise<TokenMeta | null> {
  // --------- cache ----------
  if (metaCache.has(mintAddress)) return metaCache.get(mintAddress)!;

  const conn =
    connection ?? new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

  const mintPubkey = new PublicKey(mintAddress);
  const metaPda = getMetadataPda(mintPubkey);

  // First preference: try Jupiter-lite token search for complete info
  try {
    const j = await fetchJupiterTokenData(mintAddress);
    if (j) {
      const result: TokenMeta = {
        mint: j.id ?? mintAddress,
        name: j.name ?? null,
        symbol: j.symbol ?? null,
        uri: null,
        logoURI: j.logoURI ?? null,
        price: typeof j.usdPrice === 'number' ? j.usdPrice : null,
        decimals: typeof j.decimals === 'number' ? j.decimals : undefined,
      };
      metaCache.set(mintAddress, result);
      return result;
    }
  } catch (_) {}

  // --------- coba baca akun metadata on‑chain ----------
  const accountInfo = await conn.getAccountInfo(metaPda);
  if (accountInfo) {
    try {
  let { name, symbol, uri } = parseMetadataAccountData(accountInfo.data);

      // Jika ada URI, fetch file JSON untuk memperoleh logo (optional)
      // Prefer token-list entry if available (faster and reliable)
      let logoURI: string | null = null;
      // try token-list early
      try {
        const j = await fetchJupiterTokenData(mintAddress);
        if (j) {
          if (j.logoURI) logoURI = j.logoURI;
          if (!name) name = j.name ?? name;
          if (!symbol) symbol = j.symbol ?? symbol;
        }
      } catch (_) {}

      if (!logoURI && uri) {
        const candidates = normalizeUri(uri);
        for (const u of candidates) {
          try {
            const metaResp = await fetch(u);
            if (!metaResp.ok) continue;
            const metaJson = await metaResp.json();
            logoURI = metaJson.image ?? metaJson.image_url ?? null;
            if (logoURI) break;
          } catch (e) {
            // try next
          }
        }
      }

      const result: TokenMeta = {
        mint: mintAddress,
        name,
        symbol,
        uri,
        logoURI,
      };
      metaCache.set(mintAddress, result);
      return result;
    } catch (e) {
      console.warn("[meta] deserialize error:", e);
      // fall‑through ke fallback token‑list
    }
  }

  // --------- fallback ke token‑list (off‑chain) ----------
  const listInfo = await fetchFromTokenList(mintAddress);
  if (listInfo) {
    const result: TokenMeta = {
      mint: mintAddress,
      name: listInfo.name ?? null,
      symbol: listInfo.symbol ?? null,
      uri: null,
      logoURI: listInfo.logoURI ?? null,
    };
    metaCache.set(mintAddress, result);
    return result;
  }

  // --------- tidak ditemukan ----------
  const empty: TokenMeta = {
    mint: mintAddress,
    name: null,
    symbol: null,
    uri: null,
    logoURI: null,
  };
  metaCache.set(mintAddress, empty);
  return empty;
}

/**
 * -------------------------------------------------------------------------
 * 4️⃣  Versi batch – lebih efisien bila Anda mau metadata untuk banyak mint
 * -------------------------------------------------------------------------
 */
export async function fetchMultipleMetadata(
  mintAddresses: string[],
  connection?: Connection
): Promise<Record<string, TokenMeta | null>> {
  const uniqueMints = Array.from(new Set(mintAddresses));
  const result: Record<string, TokenMeta | null> = {};

  // Kembalikan nilai cache dulu
  const needFetch: string[] = [];
  for (const m of uniqueMints) {
    const cached = metaCache.get(m);
    if (cached) {
      result[m] = cached;
    } else {
      needFetch.push(m);
    }
  }

  if (needFetch.length === 0) return result;

  const conn =
    connection ?? new Connection(clusterApiUrl("mainnet-beta"), "confirmed");

  // First: query Jupiter for all needed mints in parallel and use those results as authoritative
  const jupiterPromises = needFetch.map((m) =>
    fetchJupiterTokenData(m).then((j) => ({ mint: m, j })).catch(() => ({ mint: m, j: null }))
  );
  const jupiterResults = await Promise.allSettled(jupiterPromises);
  const stillToFetch: string[] = [];
  for (const r of jupiterResults) {
    if (r.status === 'fulfilled') {
      const { mint, j } = r.value as { mint: string; j: any };
      if (j) {
        const meta: TokenMeta = {
          mint: j.id ?? mint,
          name: j.name ?? null,
          symbol: j.symbol ?? null,
          uri: null,
          logoURI: j.logoURI ?? null,
          price: typeof j.usdPrice === 'number' ? j.usdPrice : null,
          decimals: typeof j.decimals === 'number' ? j.decimals : undefined,
        };
        metaCache.set(mint, meta);
        result[mint] = meta;
        continue;
      }
      stillToFetch.push(mint);
    } else {
      // promise rejected, schedule for fallback
      const v = (r as any).reason;
      // can't determine mint here reliably; fallback to original list
    }
  }

  // For remaining tokens, fall back to on‑chain / token-list parsing (batch PDAs + getMultipleAccounts)
  const remaining = stillToFetch.length > 0 ? stillToFetch : [];
  if (remaining.length === 0) return result;

  // Build PDAs for remaining tokens
  const pdas = remaining.map((addr) => ({ mint: addr, pda: getMetadataPda(new PublicKey(addr)) }));
  const BATCH_SIZE = 100;
  for (let i = 0; i < pdas.length; i += BATCH_SIZE) {
    const slice = pdas.slice(i, i + BATCH_SIZE);
    const accountInfos = await conn.getMultipleAccountsInfo(slice.map((x) => x.pda));

    for (let j = 0; j < slice.length; j++) {
      const mint = slice[j].mint;
      const info = accountInfos[j];
      if (info) {
        try {
          let { name, symbol, uri } = parseMetadataAccountData(info.data);
          // Prefer token-list / Jupiter for logo
          let logoURI: string | null = null;
          try {
            const listEntry = await fetchFromTokenList(mint);
            if (listEntry?.logoURI) logoURI = listEntry.logoURI;
          } catch (_) {}

          if (!logoURI && uri) {
            const candidates = normalizeUri(uri);
            for (const u of candidates) {
              try {
                const metaResp = await fetch(u);
                if (!metaResp.ok) continue;
                const metaJson = await metaResp.json();
                logoURI = metaJson.image ?? metaJson.image_url ?? null;
                if (logoURI) break;
              } catch (_) {}
            }
          }

          // Last attempt: try Jupiter token search for logo/name/symbol
          if (!logoURI) {
            try {
              const j = await fetchJupiterTokenData(mint);
              if (j?.logoURI) logoURI = j.logoURI;
              if (!name && j?.name) name = j.name;
              if (!symbol && j?.symbol) symbol = j.symbol;
            } catch (_) {}
          }

          const meta: TokenMeta = { mint, name, symbol, uri, logoURI };
          metaCache.set(mint, meta);
          result[mint] = meta;
          continue;
        } catch (_) {}
      }

      // Fallback token‑list (if on‑chain not present)
      const listInfo = await fetchFromTokenList(mint);
      if (listInfo) {
        const meta: TokenMeta = { mint, name: listInfo.name ?? null, symbol: listInfo.symbol ?? null, uri: null, logoURI: listInfo.logoURI ?? null };
        metaCache.set(mint, meta);
        result[mint] = meta;
      } else {
        const empty: TokenMeta = { mint, name: null, symbol: null, uri: null, logoURI: null };
        metaCache.set(mint, empty);
        result[mint] = empty;
      }
    }
  }

  return result;
}

/**
 * Fetch token price in USD.
 * - For SOL: use CoinGecko simple API
 * - For others: try Jupiter price endpoint (price.jup.ag)
 * Returns number (USD) or null when unavailable.
 */
export async function fetchTokenPrice(
  mintOrSymbol: string,
  symbol?: string,
  quote: 'USD' | 'USDC' = 'USD'
): Promise<number | null> {
  // Simple in-memory TTL cache
  const CACHE_TTL = 15 * 1000; // 15 seconds
  type CacheEntry = { ts: number; value: number | null; quote: 'USD' | 'USDC' };
  if (!(global as any).__tokenPriceCache) (global as any).__tokenPriceCache = new Map<string, CacheEntry>();
  const cacheKey = `${mintOrSymbol}::${(symbol ?? '').toUpperCase()}::${quote}`;
  const cache: Map<string, CacheEntry> = (global as any).__tokenPriceCache;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.value;
  try {
    // If symbol is SOL or mintOrSymbol looks like 'SOL', prefer CoinGecko
    const maybeSymbol = (symbol ?? mintOrSymbol).toUpperCase();
    if (maybeSymbol === "SOL") {
      const res = await fetch(
        "https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false"
      );
      if (!res.ok) return null;
      const data = await res.json();
      const priceUsd = data.market_data?.current_price?.usd ?? null;
      if (quote === 'USD' || priceUsd === null) return priceUsd;
      // convert to USDC via fetching USDC price (should be ~1)
      const usdcRes = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
      if (!usdcRes.ok) return null;
      const usdcJson = await usdcRes.json();
      const usdcPriceUsd = usdcJson.market_data?.current_price?.usd ?? null;
      if (!usdcPriceUsd) return null;
      return priceUsd / usdcPriceUsd;
    }

    // Otherwise query Jupiter price API by mint id
    // Prefer Jupiter lite token search for price (usdPrice)
    const mint = mintOrSymbol;
    try {
      const j = await fetchJupiterTokenData(mint);
      const priceUsdJ = j?.usdPrice ?? null;
      if (typeof priceUsdJ === 'number') {
        const priceUsd = priceUsdJ;
        if (quote === 'USD') {
          cache.set(cacheKey, { ts: Date.now(), value: priceUsd, quote });
          return priceUsd;
        }
        const usdcRes = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
        if (!usdcRes.ok) return null;
        const usdcJson = await usdcRes.json();
        const usdcPriceUsd = usdcJson.market_data?.current_price?.usd ?? null;
        if (!usdcPriceUsd) return null;
        const converted = priceUsd / usdcPriceUsd;
        cache.set(cacheKey, { ts: Date.now(), value: converted, quote });
        return converted;
      }
    } catch (_) {}

    // Fallback: try Jupiter price endpoint by mint
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${mint}`);
    if (!res.ok) return null;
    const json = await res.json();
    const priceUsd = json?.[mint]?.usdPrice ?? null;
    if (priceUsd === null) return null;
    if (quote === 'USD') {
      cache.set(cacheKey, { ts: Date.now(), value: priceUsd, quote });
      return priceUsd;
    }
    // convert USD -> USDC (fetch USDC price in USD and divide)
    const usdcRes = await fetch('https://api.coingecko.com/api/v3/coins/usd-coin?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
    if (!usdcRes.ok) return null;
    const usdcJson = await usdcRes.json();
    const usdcPriceUsd = usdcJson.market_data?.current_price?.usd ?? null;
    if (!usdcPriceUsd) return null;
    const converted = priceUsd / usdcPriceUsd;
    cache.set(cacheKey, { ts: Date.now(), value: converted, quote });
    return converted;
  } catch (e) {
    // fail silently and return null
    return null;
  }
}

/**
 * Batch query Jupiter-lite price v3 endpoint for multiple mints.
 * Returns a map mint -> { usdPrice, ... } when available.
 */
export async function fetchJupiterPrices(mints: string[]) {
  if (!mints || mints.length === 0) return {} as Record<string, any>;
  const ids = encodeURIComponent(mints.join(','));
  try {
    const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids}`);
    if (!res.ok) return {};
    const json = await res.json();
    return json as Record<string, any>;
  } catch (e) {
    return {} as Record<string, any>;
  }
}

/**
 * Fetch token metadata from Jupiter token search (single mint) — returns normalized TokenMeta-like object
 */
export async function fetchTokenMetadataFromJupiter(mint: string) {
  const j = await fetchJupiterTokenData(mint);
  if (!j) return null;
  return {
    mint: j.id ?? mint,
    name: j.name ?? null,
    symbol: j.symbol ?? null,
    uri: null,
    logoURI: j.logoURI ?? null,
    price: typeof j.usdPrice === 'number' ? j.usdPrice : null,
    decimals: typeof j.decimals === 'number' ? j.decimals : null,
  } as TokenMeta;
}
