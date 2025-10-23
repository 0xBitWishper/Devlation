"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useToast } from "../hooks/use-toast"
import { BurnModal } from "./burn-modal"
import { Search, Filter, Flame, Home } from "lucide-react"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "./ui/select"
import { useRouter } from "next/navigation"
import { TokenList } from "./token-list"
import { TokenDetail } from "./token-detail"
import { useWallet } from "@solana/wallet-adapter-react"
import { useConnection } from "@solana/wallet-adapter-react"
import { useIsMobile } from "../hooks/use-mobile"
import { PublicKey, Transaction } from "@solana/web3.js"
import { getAssociatedTokenAddress, createBurnInstruction, createTransferInstruction, createAssociatedTokenAccountInstruction } from "@solana/spl-token"
// (useEffect/useRef consolidated above)

// Simple in-memory caches to reduce repeated RPC/API calls during wallet switching.
// These live at module scope so they persist while the dev server is running.
const TOKEN_CACHE_TTL = 30 * 1000; // 30 seconds
const tokenListCache: Map<string, { ts: number; tokens: any[] }> = new Map();
const balanceCache: Map<string, { ts: number; sol: number }> = new Map();

interface DashboardProps {
  onBurnClick: (token: any) => void
  onHistoryClick: () => void
}

export function Dashboard({ onBurnClick, onHistoryClick }: DashboardProps) {
  const { publicKey, sendTransaction, signTransaction } = useWallet() as any;
  const { connection } = useConnection();
  const isMobile = useIsMobile();
  // dynamic dev detection moved below (depends on tokensOwned state)
  const [tokensOwned, setTokensOwned] = useState<any[]>([]);
  const [tokensError, setTokensError] = useState<string | null>(null);
  // Dynamic dev detection: consider wallet a 'dev' if it holds any of the configured dev token mints.
  // Configure the dev token mints in env: NEXT_PUBLIC_DEV_TOKEN_MINTS (comma separated mint addresses)
  const DEV_TOKEN_MINTS = useMemo(() => {
    try {
      const raw = String((process as any).NEXT_PUBLIC_DEV_TOKEN_MINTS ?? '');
      // preserve exact casing for base58 mint addresses; just trim whitespace
      return raw.split(',').map((s: string) => s.trim()).filter(Boolean);
    } catch (e) { return [] as string[] }
  }, []);

  // Optional: require a minimum token balance to count as dev ownership.
  // Set NEXT_PUBLIC_DEV_MIN_BALANCE to a number (e.g. 0.0001) to require that many tokens.
  const DEV_MIN_BALANCE = useMemo(() => {
    try { return parseFloat(String((process as any).NEXT_PUBLIC_DEV_MIN_BALANCE ?? '0')) || 0; } catch (e) { return 0; }
  }, []);

  // New dev detection: mark the connected wallet as 'dev' if any owned token's
  // Dev detection: strictly use `meta.dev` (set by metadata helper). If any
  // owned token's metadata `dev` equals the connected wallet pubkey, mark as dev.
  const isDev = useMemo(() => {
    try {
      if (!publicKey) return false;
      const pk = publicKey.toBase58();
      for (const t of tokensOwned || []) {
        try {
          const meta = (t as any).meta;
          const mint = (t?.mint || t?.mintAddress || '') as string;
          if (!meta || !mint) continue;
          // ensure metadata corresponds to this mint when possible
          const metaId = String(meta.id ?? meta.mint ?? '').trim();
          if (metaId && metaId !== mint) continue;
          const devField = meta?.dev ?? null;
          if (!devField) continue;
          if (String(devField).trim() === pk) return true;
        } catch (e) { continue; }
      }
      return false;
    } catch (e) { return false; }
  }, [publicKey, tokensOwned]);
  // Prevent SSR/CSR mismatch for wallet-dependent UI by rendering those parts
  // only after the component is mounted on the client.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  // Transaction status UI
  const [txStatus, setTxStatus] = useState<{ txid: string; status: 'pending' | 'confirmed' | 'failed'; message?: string; method?: string } | null>(null);
  const txPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const txAttemptsRef = useRef<number>(0);
  const TX_POLL_INTERVAL = 2000; // ms
  const TX_POLL_MAX = 60; // attempts (~2 minutes)

  // track mounted to avoid setting state after unmount
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchInFlightRef = useRef<boolean>(false);
  const fetchPendingRef = useRef<string | null>(null);
  // Retry trackers to schedule exponential backoff when 429/403 encountered
  const tokenRetryRef = useRef<Map<string, { count: number; timer?: ReturnType<typeof setTimeout> }>>(new Map());
  const balanceRetryRef = useRef<Map<string, { count: number; timer?: ReturnType<typeof setTimeout> }>>(new Map());
  const MAX_RETRIES = 6;
  const BASE_DELAY = 500; // ms

  const fetchTokens = useCallback(async (pubKeyString?: string) => {
    if (!connection) return;
    try {
      // coalescing: if a fetch is already in-flight, remember requested pubKey and return
      if (!fetchInFlightRef.current) {
        fetchInFlightRef.current = true;
      } else {
        fetchPendingRef.current = pubKeyString ?? null;
        return;
      }
      if (!pubKeyString && !publicKey) {
        if (mountedRef.current) setTokensOwned([]);
        return;
      }
      const targetPubKey = pubKeyString ? new PublicKey(pubKeyString) : publicKey;

      if (!targetPubKey) {
        if (mountedRef.current) setTokensOwned([]);
        return;
      }

      if (mountedRef.current) {
        setTokensOwned([]);
        setTokensError(null);
      }

      // Decide whether to prefer server-side API instead of calling the browser RPC directly.
      // Reasons: user previously hit a forbidden RPC from the browser, or the connection endpoint
      // is the public mainnet RPC which often forbids browser-origin requests (403).
      const forceServer = typeof window !== 'undefined' && window.localStorage?.getItem('devlation_force_server_rpc') === 'true';
      // Default: in browser prefer server API, unless RPC endpoint is clearly local/private.
      let preferServer = typeof window !== 'undefined';
      try {
        const endpoint = (connection as any)?.rpcEndpoint || (connection as any)?.rpcUrl || (connection as any)?._rpcEndpoint || null;
        if (endpoint && typeof endpoint === 'string') {
          const ep = endpoint.toLowerCase();
          const isPrivate = ep.includes('localhost') || ep.includes('127.0.0.1') || ep.includes('192.168.') || ep.includes('10.') || ep.includes('172.');
          // If endpoint is private/local, allow client RPC from browser. Otherwise prefer server.
          preferServer = !isPrivate;
          if (!isPrivate) {
            // also guard against common public mainnet host
            if (ep.includes('api.mainnet-beta.solana.com') || ep.includes('mainnet-beta')) {
              try { if (typeof window !== 'undefined') window.localStorage?.setItem('devlation_force_server_rpc', 'true'); } catch (e) {}
            }
          }
        }
      } catch (e) {}
      // honor forceServer override
      if (forceServer) preferServer = true;
  // DEBUG: report which pubkey we're fetching for and whether we prefer server
  try { console.debug('[fetchTokens] fetching tokens for', targetPubKey.toBase58(), { preferServer }); } catch (e) {}
      // Try cache first
      try {
        const key = targetPubKey.toBase58();
        const cached = tokenListCache.get(key);
        if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) {
          if (mountedRef.current) setTokensOwned(cached.tokens);
          return;
        }
      } catch (e) {}

      // Safe server fetch helper with timeout to avoid unhandled network errors
      const safeFetchJSON = async (path: string, timeout = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          try {
            const res = await fetch(path, { signal: controller.signal });
            clearTimeout(id);
            const text = await res.text().catch(() => null);
            let parsed = null;
            try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
            return { ok: res.ok, status: res.status, body: parsed };
          } catch (fetchErr) {
            clearTimeout(id);
            return { ok: false, status: null, body: null, error: String(fetchErr) } as any;
          }
        } finally { clearTimeout(id); }
      };

      if (preferServer) {
        try {
          const res = await safeFetchJSON(`/api/solana-tokens?publicKey=${targetPubKey.toBase58()}`);
          try { console.debug('[fetchTokens] server /api/solana-tokens response', { status: res.status, body: res.body }); } catch (e) {}
          if (res.ok) {
            if (Array.isArray(res.body?.tokens)) {
              if (mountedRef.current) setTokensOwned(res.body.tokens);
              try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: res.body.tokens }); } catch (e) {}
              return;
            }
            if (Array.isArray(res.body)) {
              if (mountedRef.current) setTokensOwned(res.body);
              try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: res.body }); } catch (e) {}
              return;
            }
            // If server returned an empty object or missing tokens, treat as empty list
            if (res.body && typeof res.body === 'object' && (!res.body.tokens || (Array.isArray(res.body.tokens) && res.body.tokens.length === 0))) {
              if (mountedRef.current) setTokensOwned([]);
              try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: [] }); } catch (e) {}
              return;
            }
            // Unexpected body shape
            console.warn('[fetchTokens] server API returned unexpected body', { status: res.status, body: res.body });
            if (mountedRef.current) setTokensError(res.body?.error ?? `Server API error ${res.status}`);
            // fallthrough to try client RPC
          } else {
            // Non-ok status from server
            console.warn('[fetchTokens] server API responded with error status', { status: res.status, body: res.body });
            if (mountedRef.current) setTokensError(res.body?.error ?? `Server API error ${res.status}`);
            // fallthrough to try client RPC
          }
        } catch (e) {
          console.warn('[fetchTokens] server API call threw', e);
          if (mountedRef.current) setTokensError('Tidak dapat menghubungi server API. Mencoba RPC klien.');
        }
      }

        try {
          let resp;
        try {
          resp = await connection.getParsedTokenAccountsByOwner(targetPubKey, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
        } catch (rpcErr: any) {
          // If RPC returns 403 (forbidden) from public RPC endpoints when called from the browser,
          // prefer server API for subsequent calls and avoid noisy repeated logs.
          const msg = rpcErr?.message ?? '';
          const code = rpcErr?.code ?? rpcErr?.status ?? null;
          const isForbidden = msg.includes('403') || code === 403 || (rpcErr?.response && rpcErr.response.status === 403);
          try { if (isForbidden && typeof window !== 'undefined') window.localStorage?.setItem('devlation_force_server_rpc', 'true'); } catch (e) {}
          if (!isForbidden) {
            // Log non-403 RPC errors for debugging
            // eslint-disable-next-line no-console
            console.warn('Client RPC call failed, falling back to server API:', rpcErr);
          }
          try {
            const res = await safeFetchJSON(`/api/solana-tokens?publicKey=${targetPubKey.toBase58()}`);
            try { console.debug('[fetchTokens] fallback server response', { status: res.status, body: res.body }); } catch (e) {}
            if (res.ok) {
              if (Array.isArray(res.body?.tokens)) {
                if (mountedRef.current) setTokensOwned(res.body.tokens);
                try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: res.body.tokens }); } catch (e) {}
                return;
              }
              if (Array.isArray(res.body)) {
                if (mountedRef.current) setTokensOwned(res.body);
                try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: res.body }); } catch (e) {}
                return;
              }
              // If server returned an object with no tokens ({} or missing tokens), treat as empty list rather than error.
              if (res.body && typeof res.body === 'object' && (!res.body.tokens || (Array.isArray(res.body.tokens) && res.body.tokens.length === 0))) {
                if (mountedRef.current) setTokensOwned([]);
                try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: [] }); } catch (e) {}
                return;
              }
              // Unexpected body shape - treat as non-fatal but warn and surface to UI
              console.warn('Server API returned unexpected token list body', { status: res.status, body: res.body });
              if (mountedRef.current) setTokensError(res.body?.error ?? `Server API error ${res.status}`);
              // Try a single reload to recover from transient server inconsistencies (guard via sessionStorage)
              try {
                const key = 'devlation_dashboard_reload_attempts';
                const attempts = Number(sessionStorage.getItem(key) || '0');
                if (attempts < 1) {
                  sessionStorage.setItem(key, String(attempts + 1));
                  setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 600);
                } else {
                  console.warn('Dashboard reload suppressed to avoid loop');
                }
              } catch (e) {}
              return;
            } else {
              // Non-ok HTTP status from fallback server - warn and surface to UI
              console.warn('Fallback server API returned error status', { status: res.status, body: res.body });
              if (mountedRef.current) setTokensError(res.body?.error ?? `Server API error ${res.status}`);
              // schedule one reload attempt to recover transient errors, but avoid loop
              try {
                const key = 'devlation_dashboard_reload_attempts';
                const attempts = Number(sessionStorage.getItem(key) || '0');
                if (attempts < 1) {
                  sessionStorage.setItem(key, String(attempts + 1));
                  setTimeout(() => { try { window.location.reload(); } catch (e) {} }, 600);
                } else {
                  console.warn('Dashboard reload suppressed to avoid loop');
                }
              } catch (e) {}
              return;
            }
          } catch (apiErr) {
            console.warn('Fallback server API also failed:', apiErr);
            if (mountedRef.current) setTokensError('Server API fallback failed. Check console for details.');
            return;
          }
        }

        const rawValue = (resp && (resp as any).value) || resp || [];
        try { console.debug('[fetchTokens] client RPC getParsedTokenAccountsByOwner length', rawValue.length); } catch (e) {}

        const initial = rawValue.map((acc: any) => {
          const info = acc.account.data.parsed.info;
          return {
            mint: info.mint,
            amount: info.tokenAmount?.uiAmount ?? 0,
            decimals: info.tokenAmount?.decimals ?? 0,
          };
        });

        const uniqueMints = Array.from(new Set(initial.map((t: any) => String(t.mint)).filter(Boolean))) as string[];
        const { fetchMultipleMetadata, fetchJupiterPrices } = await import('../lib/solanaMetadata');
        // Run metadata and price fetches in parallel for speed, but guard empty arrays
        const [metaMap, priceMap] = await Promise.all([
          uniqueMints.length ? fetchMultipleMetadata(uniqueMints) : Promise.resolve({} as Record<string, any>),
          uniqueMints.length ? fetchJupiterPrices(uniqueMints) : Promise.resolve({} as Record<string, any>),
        ]);

        const tokensArr = initial.map((t: any, idx: number) => {
          const meta = metaMap[t.mint] ?? null;
          const usdPrice = priceMap?.[t.mint]?.usdPrice ?? meta?.price ?? null;
          return {
            id: idx + 1,
            mint: t.mint,
            symbol: meta?.symbol ?? (t.decimals === 0 ? 'NFT' : undefined),
            name: meta?.name ?? undefined,
            amount: t.amount,
            balance: t.amount,
            decimals: typeof meta?.decimals === 'number' ? meta.decimals : t.decimals,
            mintAddress: t.mint,
            logoURI: meta?.logoURI ?? null,
            icon: undefined,
            usdPrice: typeof usdPrice === 'number' ? usdPrice : null,
            // include raw metadata so callers can inspect custom fields such as `dev.gunakan`
            meta: meta,
          };
        });

            if (mountedRef.current) setTokensOwned(tokensArr);
            try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: tokensArr }); } catch (e) {}
            // success -> clear any retry state
            try { tokenRetryRef.current.delete(targetPubKey.toBase58()); } catch (e) {}
      } catch (e) {
        // If rate-limited or forbidden, schedule a retry with exponential backoff
        const msg = String((e as any)?.message ?? e);
        const code = (e as any)?.code ?? (e as any)?.status ?? null;
        const isRateOrForbidden = msg.includes('429') || msg.toLowerCase().includes('too many requests') || msg.includes('403') || code === 429 || code === 403;
        try {
          const key = targetPubKey?.toBase58?.() ?? (pubKeyString ?? 'unknown');
          if (isRateOrForbidden) {
            const map = tokenRetryRef.current;
            const entry = map.get(key) ?? { count: 0, timer: undefined };
            if (!entry.timer && entry.count < MAX_RETRIES) {
              const delay = Math.min(16000, BASE_DELAY * Math.pow(2, entry.count));
              entry.count += 1;
              entry.timer = setTimeout(() => {
                entry.timer = undefined;
                map.set(key, entry);
                // attempt again
                try { fetchTokens(pubKeyString); } catch (err) {}
              }, delay);
              map.set(key, entry);
            } else if (entry.count >= MAX_RETRIES) {
              if (mountedRef.current) setTokensError('Too many requests. Please try again later.');
            }
            return;
          }
        } catch (inner) {}
    // non-rate errors fallthrough to show generic message
    // eslint-disable-next-line no-console
    console.warn('fetchTokens error:', e);
  if (mountedRef.current) setTokensError("Failed to fetch token data. Try refreshing or check your wallet connection.");
      }
    } finally {
      // clear inFlight and handle pending rerun
      const pending = fetchPendingRef.current ?? null;
      fetchInFlightRef.current = false;
      fetchPendingRef.current = null;
      if (pending !== null) {
        // small delay to avoid immediate flood
        setTimeout(() => fetchTokens(pending ?? undefined), 150);
      }
    }
  }, [publicKey, connection]);
  // types for runtime fields
  (fetchTokens as any).inFlight = null;
  (fetchTokens as any).pendingPubKey = null;
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const balanceRef = useRef<number | null>(null);

  const fetchBalance = useCallback(async (pubKeyString?: string) => {
    const target = pubKeyString ? new PublicKey(pubKeyString) : publicKey;
    try {
      if (!target) {
        if (mountedRef.current) setSolBalance(null);
        return;
      }
      // Try cache first
      try {
        const key = target.toBase58();
        const cached = balanceCache.get(key);
        if (cached && Date.now() - cached.ts < TOKEN_CACHE_TTL) {
          if (mountedRef.current) {
            setSolBalance(cached.sol);
            balanceRef.current = cached.sol;
          }
          return;
        }
      } catch (e) {}
      if (mountedRef.current) {
        setSolBalance(null);
        setBalanceError(null);
      }
      // safe fetch helper (non-throwing, returns status/body)
      const safeFetchJSON = async (path: string, timeout = 10000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          const res = await fetch(path, { signal: controller.signal });
          clearTimeout(id);
          const text = await res.text().catch(() => null);
          let parsed = null;
          try { parsed = text ? JSON.parse(text) : null; } catch (e) { parsed = text; }
          return { ok: res.ok, status: res.status, body: parsed };
        } finally { clearTimeout(id); }
      };

      const res = await safeFetchJSON(`/api/solana-balance?publicKey=${target.toBase58()}`);
      if (mountedRef.current) {
        if (res.ok && res.body && res.body.sol !== undefined) {
          setSolBalance(res.body.sol);
          balanceRef.current = res.body.sol;
          try { balanceCache.set(target.toBase58(), { ts: Date.now(), sol: res.body.sol }); } catch (e) {}
          try { balanceRetryRef.current.delete(target.toBase58()); } catch (e) {}
        } else {
          setSolBalance(null);
          setBalanceError(res.body?.error ?? `Server API error ${res.status ?? ''}`);
        }
      }
  } catch (e) {
      // Schedule retry on 429/403
      const msg = String((e as any)?.message ?? e);
      const code = (e as any)?.code ?? (e as any)?.status ?? null;
      const isRateOrForbidden = msg.includes('429') || msg.toLowerCase().includes('too many requests') || msg.includes('403') || code === 429 || code === 403;
      try {
        const key = target?.toBase58?.() ?? (pubKeyString ?? 'unknown');
        if (isRateOrForbidden) {
          const map = balanceRetryRef.current;
          const entry = map.get(key) ?? { count: 0, timer: undefined };
          if (!entry.timer && entry.count < MAX_RETRIES) {
            const delay = Math.min(16000, BASE_DELAY * Math.pow(2, entry.count));
            entry.count += 1;
            entry.timer = setTimeout(() => {
              entry.timer = undefined;
              map.set(key, entry);
              try { fetchBalance(pubKeyString); } catch (err) {}
            }, delay);
            map.set(key, entry);
            return;
          } else if (entry.count >= MAX_RETRIES) {
            if (mountedRef.current) setBalanceError('Too many requests. Please try again later.');
            return;
          }
        }
      } catch (inner) {}
      if (mountedRef.current) {
        setSolBalance(null);
        setBalanceError("Failed to fetch SOL balance. Try refreshing or check your wallet connection.");
      }
    }
  }, [publicKey]);

  // Call initial fetches when publicKey or connection changes
  useEffect(() => {
    fetchTokens();
    fetchBalance();
  }, [fetchTokens, fetchBalance]);

  // Cleanup any retry timers when unmounting
  useEffect(() => {
    return () => {
      try {
        for (const [, v] of tokenRetryRef.current) {
          if (v.timer) clearTimeout(v.timer as any);
        }
      } catch (e) {}
      try {
        for (const [, v] of balanceRetryRef.current) {
          if (v.timer) clearTimeout(v.timer as any);
        }
      } catch (e) {}
      try { if (txPollRef.current) clearInterval(txPollRef.current); } catch (e) {}
    };
  }, []);

  // Extra safeguard: if publicKey changes (from adapter/react) trigger immediate refresh
  useEffect(() => {
    // publicKey may be undefined/null on disconnect
    // Debounce slightly and prefer server API while switching wallets to avoid 403 from
    // browser-based RPC endpoints during extension account switches.
    (async () => {
      // small delay to allow adapter/provider to settle
      await new Promise((r) => setTimeout(r, 150));
      try { if (typeof window !== 'undefined') window.localStorage?.setItem('devlation_force_server_rpc', 'true'); } catch (e) {}
      try {
        await fetchTokens();
        await fetchBalance();
      } finally {
        try { if (typeof window !== 'undefined') window.localStorage?.removeItem('devlation_force_server_rpc'); } catch (e) {}
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  // Listen for wallet change events and immediately re-fetch with toast
  const { toast } = useToast();
  useEffect(() => {
    const handler = async (e: any) => {
      const newKey = e?.detail?.publicKey ?? null;
      if (mountedRef.current) {
        setTokensOwned([]);
        setSolBalance(null);
      }
      // show toast while we refresh
      const t = toast({ title: 'Wallet changed', description: 'Loading wallet data...', open: true });
      const pub = newKey ?? undefined;
      // small delay to let provider/adapter update React state
      await new Promise((r) => setTimeout(r, 50));
      // To avoid browser RPC 403/403 Forbidden during rapid wallet switches (extensions may block
      // in-flight RPCs), set a temporary flag so fetchTokens will prefer the server API.
      try {
        try { if (typeof window !== 'undefined') window.localStorage?.setItem('devlation_force_server_rpc', 'true'); } catch (e) {}
        await fetchTokens(pub);
        await fetchBalance(pub);
      } finally {
        // Remove the temporary flag so future normal browser RPCs can be attempted again
        try { if (typeof window !== 'undefined') window.localStorage?.removeItem('devlation_force_server_rpc'); } catch (e) {}
        // dismiss toast
        try { t.dismiss(); } catch (e) {}
      }
    };
    window.addEventListener('devlation:walletChanged', handler as EventListener);
    return () => window.removeEventListener('devlation:walletChanged', handler as EventListener);
  }, [fetchTokens, fetchBalance, toast]);

  // When the wallet adapter's publicKey changes (user switched accounts/wallets),
  // perform a safe one-time reload to ensure app state (server vs client) is consistent.
  // Debounce to avoid multiple rapid reloads and guard against reload loops.
  useEffect(() => {
    let reloadTimer: ReturnType<typeof setTimeout> | null = null;
    const onWalletChange = () => {
      try {
        // Read incoming pubkey marker; if it's same as last reloaded pubkey, skip reload
        let incomingPub: string | null = null;
        try { incomingPub = sessionStorage.getItem('devlation_wallet_pubkey'); } catch (e) {}
        // If incomingPub is empty string or null, skip reload — avoid reload loops when no wallet
        if (!incomingPub) return;
        try {
          const lastReloaded = sessionStorage.getItem('devlation_last_reloaded_pubkey');
          if (lastReloaded && incomingPub === lastReloaded) {
            return; // already reloaded for this pubkey
          }
        } catch (e) {}
        // Delay reload slightly to allow adapter/provider to settle
        reloadTimer = setTimeout(() => {
          try {
            if (typeof window !== 'undefined') {
              // mark that we reloaded for this pubkey to avoid repeated reloads
              try { if (incomingPub) sessionStorage.setItem('devlation_last_reloaded_pubkey', String(incomingPub)); } catch (e) {}
              window.location.replace(window.location.href);
            }
          } catch (e) {
            // swallow errors so UI doesn't break
          }
        }, 200);
      } catch (e) {}
    };

    // Listen to the custom event (already emitted in other code) and also to adapter events
    try { window.addEventListener('devlation:walletChanged', onWalletChange as EventListener); } catch (e) {}

    // Also listen for storage changes (support multi-tab wallet changes)
    const onStorage = (ev: StorageEvent) => {
      if (ev.key === 'devlation_wallet_pubkey') {
        onWalletChange();
      }
    };
    try { window.addEventListener('storage', onStorage); } catch (e) {}

    return () => {
      try { if (reloadTimer) clearTimeout(reloadTimer); } catch (e) {}
      try { window.removeEventListener('devlation:walletChanged', onWalletChange as EventListener); } catch (e) {}
      try { window.removeEventListener('storage', onStorage); } catch (e) {}
    };
  }, []);
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [burnModalToken, setBurnModalToken] = useState<any>(null)
  const [tokenVisibility, setTokenVisibility] = useState<Record<string, boolean>>({});
  const [showManageModal, setShowManageModal] = useState(false);

  // Solana Token List CDN
  const TOKEN_LIST_CDN = "https://raw.githubusercontent.com/solana-labs/token-list/main/src/tokens/solana.tokenlist.json";
  const [tokenMeta, setTokenMeta] = useState<Record<string, any>>({});

  useEffect(() => {
    let cancelled = false;
    const safeFetchTokenList = async () => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(TOKEN_LIST_CDN, { signal: controller.signal });
        clearTimeout(id);
        if (!res.ok) return;
        const data = await res.json().catch(() => null);
        if (cancelled) return;
        const meta: Record<string, any> = {};
        if (data && Array.isArray(data.tokens)) {
          for (const t of data.tokens) {
            meta[t.address] = t;
          }
        }
        setTokenMeta(meta);
      } catch (e) {
        // ignore network failures for token list; UI will fallback to CDN path per-token
      } finally {
        clearTimeout(id);
      }
    };
    safeFetchTokenList();
    return () => { cancelled = true; };
  }, []);

  // Map data SPL token ke format TokenList dengan logo dan symbol dari token list
  // Tambahkan SOL sebagai token pertama di list
  const solToken = publicKey && solBalance !== null ? [{
    id: 0,
    symbol: 'SOL',
    name: 'Solana',
    balance: solBalance,
    decimals: 9,
    mintAddress: 'So11111111111111111111111111111111111111112',
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    icon: '',
  }] : [];
  const tokens = [
    ...solToken,
    ...tokensOwned.map((token, idx) => {
      // Prioritaskan metadata dari response API (token), lalu dari tokenMeta (Solana Token List), lalu fallback logo
      const mint = token.mint || token.mintAddress || token.mintAddress?.toString();
      const meta = tokenMeta[mint] || {};
      const fallbackLogo = `https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/assets/mainnet/${mint}/logo.png`;

      // token.logoURI might be null (normalized), prefer any available source
  const logoURI = token.logoURI ?? token.logo ?? meta.logoURI ?? meta.logo ?? fallbackLogo;
  const balance = token.amount ?? token.balance ?? 0;
  const decimals = token.decimals ?? meta.decimals ?? 0;
  let symbol = token.symbol ?? meta.symbol ?? (decimals === 0 ? 'NFT' : undefined);
  const name = token.name ?? meta.name ?? mint;

      return {
        id: idx + 1,
        symbol,
        name,
        balance,
        decimals,
        mintAddress: mint,
        logoURI,
        icon: '',
        // preserve metadata fetched by fetchMultipleMetadata / fetchTokenMetadata
        meta: (token as any)?.meta ?? null,
      };
    })
  ];

  // Debug log tokensOwned dan tokens
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    //console.log('tokensOwned:', tokensOwned);
    // eslint-disable-next-line no-console
    //console.log('tokens (mapped):', tokens);
  }

  const filteredTokens = tokens.filter(
    (token) =>
      (token.symbol?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (token.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()),
  );

  // Debug log tokensOwned dan tokens (setelah semua variabel dideklarasikan)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    //console.log('tokensOwned:', tokensOwned);
    // eslint-disable-next-line no-console
    //console.log('tokens (mapped):', tokens);
  }

  const router = useRouter();
  const handleBurnClick = (token: any) => {
    setBurnModalToken(token);
  };

  const handleBurnCancel = () => {
    setBurnModalToken(null);
  };

  const handleBurnConfirm = (amount: number, method: 'instruction' | 'send' = 'instruction', image?: string) => {
    async function burnToken() {
      if (!burnModalToken || !publicKey || !amount || !connection) return;
      // Inform user if they chose Send-to-Death — currently we perform the same burn instruction
      if (method === 'send') {
        try {
          toast({ title: 'Send to Death selected', description: 'Sending to a dead address currently performs on-chain burn for safety.' });
        } catch (e) {}
      }
      // Aktifkan mode TX agar provider pakai endpoint TX
      if (typeof window !== 'undefined') (window as any).txMode = true;
      // Helpers declared at function scope so outer catch/finally can access them
      const isUserRejection = (maybeErr: any) => {
        try {
          if (!maybeErr) return false;
          const msg = typeof maybeErr === 'string' ? maybeErr : (maybeErr?.message ?? (maybeErr?.toString && maybeErr.toString()) ?? '');
          const name = String(maybeErr?.name ?? '').toLowerCase();
          const code = maybeErr?.code ?? maybeErr?.error?.code ?? maybeErr?.status ?? null;
          const s = String(msg || '').toLowerCase();
          if (s.includes('rejected') || s.includes('user rejected') || s.includes('user rejected the request') || s.includes('user canceled') || s.includes('user cancelled') || s.includes('cancelled') || s.includes('cancelled by user')) return true;
          if (name.includes('walletsigntransactionerror') || name.includes('userrejectedrequest') || name.includes('walleterror') || name.includes('walletcancel') || name.includes('walletcancelled') || name.includes('userrejected')) return true;
          if (code === 4001 || code === 1 || String(code).toLowerCase().includes('user_rejected') || String(code).toLowerCase().includes('userrejected') || String(code).toLowerCase().includes('rejected')) return true;
          return false;
        } catch (e) { return false; }
      };

      const safeCall = async (fn: () => any): Promise<{ ok: true; value: any } | { ok: false; err: any }> => {
        try {
          const res = fn();
          if (res && typeof res.then === 'function') {
            try {
              const v = await res;
              return { ok: true as const, value: v };
            } catch (err: any) {
              return { ok: false as const, err };
            }
          }
          return { ok: true as const, value: res };
        } catch (err: any) {
          return { ok: false as const, err };
        }
      };

      const getErrMessage = (e: any) => {
        try {
          if (!e && e !== 0) return '';
          if (typeof e === 'string') return e;
          if (typeof e === 'number') return String(e);
          if (e instanceof Error && e.message) return String(e.message);
          if (e && typeof e.message === 'string') return e.message;
          if (e && typeof e.toString === 'function') return e.toString();
          try { return JSON.stringify(e); } catch (je) { return String(e); }
        } catch (outer) { return String(e); }
      };
      try {
        const mint = new PublicKey(burnModalToken.mintAddress);
        const owner = publicKey;
        const decimals = burnModalToken.decimals ?? 0;
        // Cari ATA (Associated Token Account)
        const ata = await getAssociatedTokenAddress(mint, owner);
        // Convert amount to base units
        const units = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)));
        let tx: Transaction;
        if (method === 'send') {
          // Send to death wallet address
          const deathAddr = new PublicKey('1nc1nerator11111111111111111111111111111111');
          const destAta = await getAssociatedTokenAddress(mint, deathAddr);
          const instructions = [] as any[];
          // If destination ATA doesn't exist, create it (payer = owner)
          try {
            const info = await connection.getAccountInfo(destAta);
            if (!info) {
              instructions.push(createAssociatedTokenAccountInstruction(owner, destAta, deathAddr, mint));
            }
          } catch (e) {
            // if RPC fails, still attempt transfer; ATA creation may fail in some edge cases
            try { instructions.push(createAssociatedTokenAccountInstruction(owner, destAta, deathAddr, mint)); } catch (ee) {}
          }
          // Transfer tokens to dest ATA
          instructions.push(createTransferInstruction(ata, destAta, owner, units));
          tx = new Transaction();
          for (const ix of instructions) tx.add(ix);
        } else {
          // Burn via token program
          const burnIx = createBurnInstruction(
            ata,
            mint,
            owner,
            units
          );
          tx = new Transaction().add(burnIx);
        }
        // Prepare transaction using server-sourced recent blockhash to avoid wallet RPC 403
        try {
          const r = await fetch('/api/tx/recent-blockhash');
          const j = await r.json();
          if (j?.blockhash) {
            tx.recentBlockhash = j.blockhash;
          }
        } catch (e) { /* ignore and allow wallet to fill */ }
        // set fee payer
        try { tx.feePayer = publicKey as any; } catch (e) {}

  // Ask wallet to sign the transaction (signTransaction provided by wallet adapter)
        let signedTx;
        try {
          // Some adapters expose signTransaction; prefer signTransaction over sendTransaction
          if ((window as any).solana && (window as any).solana.signTransaction) {
            // fallback for non-adapter flows
          }
          // use wallet adapter's signTransaction if available
          // `sendTransaction` is left as fallback but we prefer sign -> server broadcast
          const walletAdapter: any = (window as any)._walletAdapter || null;
          if (typeof (window as any).signTransaction === 'function') {
            // noop: some environments expose global signTransaction
          }
        } catch (e) {}


        // Some wallet adapters may emit unhandled rejections or even synchronous errors
        // that bypass local try/catch; install temporary global handlers to convert
        // those into a toast and avoid the dev overlay. We keep them for a short
        // grace period after signing to catch delayed rejections.
        // Stronger temporary handlers: install capture-phase listeners AND
        // temporarily override window's onerror/onunhandledrejection properties.
        // This increases the chance we intercept wallet adapter emissions before
        // Next's dev overlay consumes them.
        const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
          try {
            const reason: any = (ev && (ev as any).reason) || null;
            try { console.debug('[dev-debug] unhandledrejection reason:', reason); } catch (e) {}
            if (isUserRejection(reason)) {
              try { ev.preventDefault(); } catch (e) {}
              try { ev.stopImmediatePropagation?.(); } catch (e) {}
              try { ev.stopPropagation?.(); } catch (e) {}
              try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            }
          } catch (e) {}
        };

        const onWindowError = (ev: ErrorEvent) => {
          try {
            const err: any = (ev && (ev as any).error) || null;
            try { console.debug('[dev-debug] window.error event:', { err, message: ev?.message, filename: ev?.filename, lineno: ev?.lineno, colno: ev?.colno }); } catch (e) {}
            if (isUserRejection(err ?? ev?.message)) {
              try { ev.preventDefault(); } catch (e) {}
              try { ev.stopImmediatePropagation?.(); } catch (e) {}
              try { ev.stopPropagation?.(); } catch (e) {}
              try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            }
          } catch (e) {}
        };

        // Save previous property handlers so we can restore them
        const prevOnUnhandledRejection = (window as any).onunhandledrejection;
        const prevOnError = (window as any).onerror;

        const propUnhandled = (ev: any) => {
          try {
            const reason = ev?.reason ?? null;
            if (isUserRejection(reason)) {
              try { ev.preventDefault(); } catch (e) {}
              try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
              return true;
            }
          } catch (e) {}
          try { if (typeof prevOnUnhandledRejection === 'function') return prevOnUnhandledRejection(ev); } catch (e) {}
          return false;
        };

        const propError = (message: any, source?: string, lineno?: number, colno?: number, error?: any) => {
          try {
            if (isUserRejection(error ?? message)) {
              try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
              return true;
            }
          } catch (e) {}
          try { if (typeof prevOnError === 'function') return prevOnError(message, source, lineno, colno, error); } catch (e) {}
          return false;
        };

        try {
          try { window.addEventListener('unhandledrejection', onUnhandledRejection as any, { capture: true }); } catch (e) {}
          try { window.addEventListener('error', onWindowError as any, { capture: true }); } catch (e) {}
          try { (window as any).onunhandledrejection = propUnhandled; } catch (e) {}
          try { (window as any).onerror = propError; } catch (e) {}
          const doSign: any = signTransaction;
          if (typeof doSign !== 'function') {
            try { toast({ title: 'Wallet not supported', description: 'Your wallet does not provide `signTransaction`. Use a wallet adapter that supports signTransaction.' }); } catch (e) {}
            return;
          }
          try {
            // Use safeCall to ensure no unhandled rejections escape from the
            // wallet adapter's signTransaction implementation.
            const signOutcome = await safeCall(() => doSign(tx as any));
            if (!signOutcome.ok) {
              const signErr = signOutcome.err;
              try { console.debug('[dev-debug] signTransaction threw (wrapped):', signErr); } catch (e) {}
              if (isUserRejection(signErr)) {
                try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
                return;
              }
              const msg = getErrMessage(signErr) || String(signErr);
              try { toast({ title: 'Failed to sign', description: msg || 'An error occurred while signing the transaction.' }); } catch (e) {}
              return;
            }
            signedTx = signOutcome.value;
            try { console.debug('[dev-debug] signTransaction resolved (wrapped), signedTx:', signedTx); } catch (e) {}
          } catch (outerSignErr) {
            try { console.debug('[dev-debug] signTransaction outer threw:', outerSignErr); } catch (e) {}
            // defensive fallback
            if (isUserRejection(outerSignErr)) {
              try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
              return;
            }
            try { toast({ title: 'Failed to sign', description: String(outerSignErr) }); } catch (e) {}
            return;
          }
        } finally {
          // Keep the listeners alive for a short grace period to catch delayed
          // unhandled rejections some adapters emit after the signing call.
          try {
            // extend grace period for adapters that emit delayed rejections
            setTimeout(() => {
              try { window.removeEventListener('unhandledrejection', onUnhandledRejection as any); } catch (e) {}
              try { window.removeEventListener('error', onWindowError as any); } catch (e) {}
            }, 2500);
          } catch (e) {
            try { window.removeEventListener('unhandledrejection', onUnhandledRejection as any); } catch (ee) {}
            try { window.removeEventListener('error', onWindowError as any); } catch (ee) {}
          }
        }

        let txid: string | null = null;
        if (signedTx && signedTx.serialize) {
          const raw = signedTx.serialize();
          // browser-safe base64 encode
          const uint8 = new Uint8Array(raw);
          let binary = '';
          for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i]);
          let b64 = typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(uint8).toString('base64');
          // send to server for broadcast and logging
          // try broadcast, allow one automatic retry when blockhash expired
          let attempts = 0;
          let jr: any = null;
          while (attempts < 2) {
            attempts += 1;
            let res: Response | null = null;
            try {
              res = await fetch('/api/tx/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedTxBase64: b64, pubkey: publicKey?.toBase58(), mint: burnModalToken.mintAddress, metadata: burnModalToken?.meta ?? {} }) });
            } catch (netErr) {
              try { toast({ title: 'Network error', description: 'Failed to reach server to broadcast transaction.' }); } catch (e) {}
              return;
            }
            try { jr = await res.json(); } catch (e) { jr = null; }
            if (res && res.ok) break;
            // if server says blockhash expired, try re-obtaining blockhash and re-sign once
            if (res.status === 409 && jr?.error === 'blockhash_not_found' && attempts < 2) {
              try {
                toast({ title: 'Blockhash expired', description: 'Attempting to refresh blockhash and retry. Please confirm the signature again.' });
                const r2 = await fetch('/api/tx/recent-blockhash');
                const j2 = await r2.json();
                if (j2?.blockhash) tx.recentBlockhash = j2.blockhash;
                // ask wallet to sign again (guarded)
                try {
                  const doSignAgain: any = signTransaction;
                  if (typeof doSignAgain !== 'function') {
                    try { toast({ title: 'Wallet not supported', description: 'Your wallet does not provide `signTransaction` for re-sign. Use a wallet adapter that supports signTransaction.' }); } catch (e) {}
                    break;
                  }
                  try {
                    // Same robust wrapper for re-sign
                    let signOutcome2: { ok: true; value: any } | { ok: false; err: any };
                    try {
                      signOutcome2 = await safeCall(() => doSignAgain(tx as any));
                    } catch (e) {
                      signOutcome2 = { ok: false as const, err: e };
                    }
                    if (!signOutcome2.ok) {
                      const signErr2 = signOutcome2.err;
                      const msg2 = getErrMessage(signErr2) || String(signErr2);
                      const name2 = String((signErr2 && signErr2.name) ?? '').toLowerCase();
                      const isUserRejected2 = msg2.toLowerCase().includes('rejected') || msg2.toLowerCase().includes('user rejected') || name2.includes('walletsigntransactionerror') || (signErr2 && (signErr2.name === 'WalletSignTransactionError' || signErr2?.code === 4001));
                      if (isUserRejected2) {
                        try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
                        break;
                      }
                      try { toast({ title: 'Failed to sign', description: msg2 || 'An error occurred while signing the transaction.' }); } catch (e) {}
                      break;
                    }
                    signedTx = signOutcome2.value;
                  } catch (outer2) {
                    try { toast({ title: 'Failed to sign', description: String(outer2) }); } catch (e) {}
                    break;
                  }
                } catch (e) {
                  try { toast({ title: 'Failed to sign', description: String(e) }); } catch (ee) {}
                  break;
                }
                const raw2 = signedTx.serialize();
                const uint82 = new Uint8Array(raw2);
                let binary2 = '';
                for (let i = 0; i < uint82.length; i++) binary2 += String.fromCharCode(uint82[i]);
                const b642 = typeof window !== 'undefined' ? window.btoa(binary2) : Buffer.from(uint82).toString('base64');
                b64 = b642; // replace payload and retry
                continue;
              } catch (re) {
                // if re-sign fails, break and surface error
                break;
              }
            }
            break;
          }
          if (!jr || !jr.txid) {
            try { toast({ title: 'Broadcast failed', description: String(jr?.detail ?? jr?.error ?? 'Broadcast failed') }); } catch (e) {}
            return;
          }
          const txidFromServer = jr.txid;
          txid = txidFromServer;
        } else {
          // We do NOT fallback to sendTransaction to avoid browser RPC calls which may be forbidden.
          try { toast({ title: 'Wallet not supported', description: 'Your wallet does not support `signTransaction`. Use a wallet adapter that supports signTransaction so transactions can be signed locally.' }); } catch (e) {}
          return;
        }
        // update UI status
        setTxStatus({ txid: txid ?? 'unknown', status: 'pending', method });
        txAttemptsRef.current = 0;
        // start polling
        try { if (txPollRef.current) clearInterval(txPollRef.current); } catch (e) {}
        txPollRef.current = setInterval(async () => {
          try {
            txAttemptsRef.current += 1;
            // use connection.getSignatureStatus or getSignatureStatuses
            // `getSignatureStatuses` returns confirmation info
            const resp = await (connection as any).getSignatureStatuses([txid]);
            const info = resp && resp.value && resp.value[0];
            if (info) {
              const confirmed = info.confirmationStatus === 'confirmed' || info.confirmationStatus === 'finalized' || info.err === null;
                if (confirmed) {
                setTxStatus({ txid: txid ?? 'unknown', status: 'confirmed', method });
                if (txPollRef.current) { clearInterval(txPollRef.current); txPollRef.current = null; }
                return;
              }
              if (info.err) {
                setTxStatus({ txid: txid ?? 'unknown', status: 'failed', message: JSON.stringify(info.err), method });
                if (txPollRef.current) { clearInterval(txPollRef.current); txPollRef.current = null; }
                return;
              }
            }
            if (txAttemptsRef.current >= TX_POLL_MAX) {
              setTxStatus({ txid: txid ?? 'unknown', status: 'failed', message: 'Timeout waiting for confirmation', method });
              if (txPollRef.current) { clearInterval(txPollRef.current); txPollRef.current = null; }
            }
          } catch (e) {
            // ignore polling errors
          }
        }, TX_POLL_INTERVAL) as unknown as ReturnType<typeof setInterval>;
        try {
          const burnRec: any = { txid: txid ?? 'unknown', mint: burnModalToken.mintAddress, amount, symbol: burnModalToken.symbol, metadata: burnModalToken.meta ?? {} };
          // include logo/icon if available or from provided image
          if (image) burnRec.logoURI = image;
          if ((burnModalToken as any)?.logoURI) burnRec.logoURI = (burnModalToken as any).logoURI;
          if ((burnModalToken as any)?.icon) burnRec.icon = (burnModalToken as any).icon;
          try { sessionStorage.setItem('devlation.lastBurn', JSON.stringify(burnRec)); } catch (e) {}
        } catch (e) {}
        toast({ title: 'Burn submitted', description: `Tx ${txid}` });
        try { router.push('/success'); } catch (e) { try { window.location.href = '/success'; } catch (e) {} }
      } catch (err: any) {
        const message = (() => {
          try {
            if (!err && err !== 0) return '';
            if (typeof err === 'string') return err;
            if (typeof err === 'number') return String(err);
            if (err instanceof Error && err.message) return String(err.message);
            if (err && typeof err.message === 'string') return err.message;
            if (err && typeof err.toString === 'function') return err.toString();
            try { return JSON.stringify(err); } catch (je) { return String(err); }
          } catch (outer) { return String(err); }
        })();
        // surface blockhash special case
          if (message && message.toLowerCase().includes('blockhash')) {
          toast({ title: 'Burn failed: Blockhash expired', description: 'Please re-open the modal and try again.' });
        } else {
          toast({ title: 'Burn failed', description: message });
        }
  console.warn('Burn error:', err);
      } finally {
        // Kembalikan mode ke normal
        if (typeof window !== 'undefined') delete (window as any).txMode;
        setBurnModalToken(null);
      }
    }
    // Return the promise so caller (BurnModal) can await and show loading state
    return burnToken();
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Transaction status banner */}
      {txStatus && (
        <div className="max-w-7xl mx-auto px-6 py-2">
          <div className={`rounded-lg p-3 border ${txStatus.status === 'pending' ? 'bg-yellow-600/10 border-yellow-400' : txStatus.status === 'confirmed' ? 'bg-green-600/10 border-green-400' : 'bg-red-600/10 border-red-400'}`}> 
            <div className="flex items-center justify-between">
              <div className="text-sm">
                <strong className="mr-2">Tx {txStatus.status.toUpperCase()}:</strong>
                <a href={`https://explorer.solana.com/tx/${txStatus.txid}`} target="_blank" rel="noreferrer" className="underline">{txStatus.txid.slice(0,8)}...{txStatus.txid.slice(-8)}</a>
                {txStatus.message ? <div className="text-xs text-muted-foreground mt-1">{txStatus.message}</div> : null}
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs underline" onClick={() => { try { setTxStatus(null); if (txPollRef.current) { clearInterval(txPollRef.current); txPollRef.current = null; } } catch(e){} }}>Dismiss</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {burnModalToken && (
        <BurnModal
          token={burnModalToken}
          onConfirm={handleBurnConfirm}
          onCancel={handleBurnCancel}
        />
      )}
      <header className="border-b border-border/40 backdrop-blur-xl sticky top-0 z-40 bg-background/80">
  <div className="max-w-7xl mx-auto px-6 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Home button removed as requested */} 
            <img
              src="/devflation.png"
              alt="Devflation Logo"
              className="h-12 w-auto sm:h-12 ml-1"
              style={{ maxWidth: '120px', objectFit: 'contain' }}
            /> 
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/burn-history")}
              className="px-4 py-2.5 rounded-lg border border-border/40 text-foreground font-medium hover:bg-card/50 smooth-transition text-sm"
            >
              History
            </button>
            <button
              onClick={() => router.push("/public-burn-history")}
              className="px-4 py-2.5 rounded-lg border border-border/40 text-foreground font-medium hover:bg-card/50 smooth-transition text-sm"
            >
              Blok
            </button>
            <button
              onClick={() => router.push("/reward")}
              className="px-4 py-2.5 rounded-lg border border-[#14F195] text-[#14F195] font-medium hover:bg-[#14F195]/10 smooth-transition text-sm"
            >
              Reward
            </button>
            {mounted ? (
              <div
                className="flex items-center gap-3 px-4 py-2.5 rounded-lg backdrop-blur-xl border border-white/10"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
              >
                <span className="text-xs text-muted-foreground font-medium">Connected:</span>
                <span className="font-mono text-sm text-[#9945FF] font-semibold">
                  {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "-"}
                </span>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-sm font-medium">
                  ◎ {balanceError ? <span className="text-red-500">{balanceError}</span> : solBalance === null && publicKey ? <span className="animate-pulse">Loading...</span> : (solBalance !== null && !isNaN(solBalance)) ? parseFloat(solBalance.toString()).toFixed(6) : "-"} SOL
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-white/5 text-xs text-muted-foreground">
                <span>Not connected</span>
              </div>
            )}
          </div>
        </div>
      </header>
      {/* Debug panel removed to avoid layout disruption */}
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ...existing grid/token UI... */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Token List */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card/40 text-foreground placeholder:text-muted-foreground focus:outline-none smooth-transition"
                  style={{ backgroundColor: "rgba(20, 20, 30, 0.18)", borderRadius: '0.75rem', boxShadow: '0 0 0 2px #9945FF' }}
                />
              </div>
              {/* Filter */}
              <TokenList tokens={filteredTokens} selectedToken={selectedToken} onSelectToken={setSelectedToken} />
            </div>
          </div>
          {/* Right Column - Token Detail */}
          <div className="lg:col-span-2">
            {selectedToken ? (
              <TokenDetail token={selectedToken} onBurnClick={handleBurnClick} />
            ) : (
              <div
                className="h-full flex items-center justify-center rounded-xl backdrop-blur-xl border border-white/10 border-border/40 min-h-96"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <div className="text-center">
                  <div className="text-5xl mb-4 opacity-60">👈</div>
                  <p className="text-muted-foreground font-medium">Select a token to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
