"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useToast } from "../hooks/use-toast"
import { BurnModal } from "./burn-modal"
import { TokenManageModal } from "./token-manage-modal"
import { Search, Filter, Flame, Home } from "lucide-react"
import { Settings } from "lucide-react"
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

      if (preferServer) {
        try {
          const apiRes = await fetch(`/api/solana-tokens?publicKey=${targetPubKey.toBase58()}`);
          const data = await apiRes.json();
          try { console.debug('[fetchTokens] server /api/solana-tokens response', { status: apiRes.status, body: data }); } catch (e) {}
          if (Array.isArray(data.tokens)) {
            if (mountedRef.current) setTokensOwned(data.tokens);
            try { tokenListCache.set(targetPubKey.toBase58(), { ts: Date.now(), tokens: data.tokens }); } catch (e) {}
            return;
          }
        } catch (e) {
          console.warn('[fetchTokens] server API call failed, will try client RPC', e);
          // fallthrough to try client RPC below
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
            const apiRes = await fetch(`/api/solana-tokens?publicKey=${targetPubKey.toBase58()}`);
              let data: any = null;
              try { data = await apiRes.json(); } catch (e) {
                try { const txt = await apiRes.text(); console.warn('[fetchTokens] server returned non-json', txt); } catch (_) {}
              }
              try { console.debug('[fetchTokens] fallback server response', { status: apiRes.status, body: data }); } catch (e) {}
              // Accept either { tokens: [...] } or an array directly
              if (Array.isArray(data?.tokens)) {
                if (mountedRef.current) setTokensOwned(data.tokens);
                return;
              }
              if (Array.isArray(data)) {
                if (mountedRef.current) setTokensOwned(data);
                return;
              }
              // Some server responses (429/HTML) may not contain the expected shape.
              // Log and surface a friendly UI message instead of throwing a hard error.
              console.error('Server API returned invalid token list', { status: apiRes.status, body: data });
              if (mountedRef.current) setTokensError('Server API returned invalid token list. Lihat console untuk detail.');
              return;
          } catch (apiErr) {
              // eslint-disable-next-line no-console
              console.error('Fallback server API also failed:', apiErr);
              if (mountedRef.current) setTokensError('Server API fallback failed. Cek console untuk detail.');
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
              if (mountedRef.current) setTokensError('Terjadi terlalu banyak permintaan. Coba lagi nanti.');
            }
            return;
          }
        } catch (inner) {}
        // non-rate errors fallthrough to show generic message
        // eslint-disable-next-line no-console
        console.error('fetchTokens error:', e);
        if (mountedRef.current) setTokensError("Gagal mengambil data token. Coba refresh atau cek koneksi wallet.");
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
      const res = await fetch(`/api/solana-balance?publicKey=${target.toBase58()}`);
      const data = await res.json();
      if (mountedRef.current) {
        if (data.sol !== undefined) {
          setSolBalance(data.sol);
          balanceRef.current = data.sol;
          try { balanceCache.set(target.toBase58(), { ts: Date.now(), sol: data.sol }); } catch (e) {}
          // success -> clear any retry state
          try { balanceRetryRef.current.delete(target.toBase58()); } catch (e) {}
        } else {
          setSolBalance(null);
          setBalanceError("Gagal mengambil saldo SOL. Coba refresh atau cek koneksi wallet.");
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
            if (mountedRef.current) setBalanceError('Terjadi terlalu banyak permintaan. Coba lagi nanti.');
            return;
          }
        }
      } catch (inner) {}
      if (mountedRef.current) {
        setSolBalance(null);
        setBalanceError("Gagal mengambil saldo SOL. Coba refresh atau cek koneksi wallet.");
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
    fetch(TOKEN_LIST_CDN)
      .then((res) => res.json())
      .then((data) => {
        const meta: Record<string, any> = {};
        if (data && Array.isArray(data.tokens)) {
          for (const t of data.tokens) {
            meta[t.address] = t;
          }
        }
        setTokenMeta(meta);
      });
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
  const symbol = token.symbol ?? meta.symbol ?? (decimals === 0 ? 'NFT' : undefined);
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

    // Build token list for manage modal (must be after tokens is assigned)
    const manageTokens = tokens.map(t => ({
      symbol: t.symbol,
      name: t.name,
      logoURI: t.logoURI,
      mintAddress: t.mintAddress,
      visible: tokenVisibility[t.symbol] !== false // default true
    }));

    const handleToggleToken = (symbol: string) => {
      setTokenVisibility(prev => ({ ...prev, [symbol]: !(prev[symbol] !== false) }));
    };

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

  const handleBurnConfirm = (amount: number, method: 'instruction' | 'send' = 'instruction') => {
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

        // Attempt to sign with wallet adapter. If adapter doesn't provide signTransaction
        // or user rejects the signature, show a friendly toast and abort gracefully.
        try {
          const doSign: any = signTransaction;
          if (typeof doSign !== 'function') {
            try { toast({ title: 'Wallet tidak didukung', description: 'Wallet Anda tidak menyediakan `signTransaction`. Gunakan wallet adapter yang mendukung signTransaction.' }); } catch (e) {}
            return;
          }
          try {
            signedTx = await doSign(tx as any);
          } catch (signErr: any) {
            const msg = String((signErr && (signErr.message || signErr?.toString())) ?? signErr);
            const name = String((signErr && signErr.name) ?? '').toLowerCase();
            if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('user rejected') || name.includes('walletsigntransactionerror')) {
              try { toast({ title: 'Tanda tangan dibatalkan', description: 'Anda membatalkan permintaan tanda tangan.' }); } catch (e) {}
              return;
            }
            try { toast({ title: 'Gagal menandatangani', description: msg || 'Terjadi kesalahan saat menandatangani transaksi.' }); } catch (e) {}
            return;
          }
        } catch (e) {
          try { toast({ title: 'Gagal menandatangani', description: String(e) }); } catch (ee) {}
          return;
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
            const res = await fetch('/api/tx/broadcast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signedTxBase64: b64, pubkey: publicKey?.toBase58(), mint: burnModalToken.mintAddress, metadata: burnModalToken?.meta ?? {} }) });
            jr = await res.json();
            if (res.ok) break;
            // if server says blockhash expired, try re-obtaining blockhash and re-sign once
            if (res.status === 409 && jr?.error === 'blockhash_not_found' && attempts < 2) {
              try {
                toast({ title: 'Blockhash kadaluarsa', description: 'Mencoba perbarui blockhash dan ulangi. Mohon konfirmasi tanda tangan lagi.' });
                const r2 = await fetch('/api/tx/recent-blockhash');
                const j2 = await r2.json();
                if (j2?.blockhash) tx.recentBlockhash = j2.blockhash;
                // ask wallet to sign again (guarded)
                try {
                  const doSignAgain: any = signTransaction;
                  if (typeof doSignAgain !== 'function') {
                    try { toast({ title: 'Wallet tidak didukung', description: 'Wallet Anda tidak menyediakan `signTransaction` untuk re-sign. Gunakan wallet adapter yang mendukung signTransaction.' }); } catch (e) {}
                    break;
                  }
                  try {
                    signedTx = await doSignAgain(tx as any);
                  } catch (signErr2: any) {
                    const msg2 = String((signErr2 && (signErr2.message || signErr2?.toString())) ?? signErr2);
                    const name2 = String((signErr2 && signErr2.name) ?? '').toLowerCase();
                    if (msg2.toLowerCase().includes('rejected') || msg2.toLowerCase().includes('user rejected') || name2.includes('walletsigntransactionerror')) {
                      try { toast({ title: 'Tanda tangan dibatalkan', description: 'Anda membatalkan permintaan tanda tangan.' }); } catch (e) {}
                      break;
                    }
                    try { toast({ title: 'Gagal menandatangani', description: msg2 || 'Terjadi kesalahan saat menandatangani transaksi.' }); } catch (e) {}
                    break;
                  }
                } catch (e) {
                  try { toast({ title: 'Gagal menandatangani', description: String(e) }); } catch (ee) {}
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
            try { toast({ title: 'Broadcast gagal', description: String(jr?.detail ?? jr?.error ?? 'Broadcast failed') }); } catch (e) {}
            return;
          }
          const txidFromServer = jr.txid;
          txid = txidFromServer;
        } else {
          // We do NOT fallback to sendTransaction to avoid browser RPC calls which may be forbidden.
          try { toast({ title: 'Wallet tidak mendukung', description: 'Wallet tidak mendukung `signTransaction`. Gunakan wallet adapter yang mendukung signTransaction agar transaksi dapat ditandatangani secara lokal.' }); } catch (e) {}
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
          const burnRec = { txid: txid ?? 'unknown', mint: burnModalToken.mintAddress, amount, symbol: burnModalToken.symbol, metadata: burnModalToken.meta ?? {} };
          try { sessionStorage.setItem('devlation.lastBurn', JSON.stringify(burnRec)); } catch (e) {}
        } catch (e) {}
        toast({ title: 'Burn submitted', description: `Tx ${txid}` });
        try { router.push('/success'); } catch (e) { try { window.location.href = '/success'; } catch (e) {} }
      } catch (err: any) {
        const message = err?.message || String(err);
        // surface blockhash special case
        if (message && message.toLowerCase().includes('blockhash')) {
          toast({ title: 'Burn gagal: Blockhash kadaluarsa', description: 'Silakan buka modal dan coba lagi.' });
        } else {
          toast({ title: 'Burn gagal', description: message });
        }
        console.error('Burn error:', err);
      } finally {
        // Kembalikan mode ke normal
        if (typeof window !== 'undefined') delete (window as any).txMode;
        setBurnModalToken(null);
      }
    }
    burnToken();
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
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-16 flex items-center justify-center">
              <img src="/devflation.png" alt="Devflation Logo" className="h-10 w-auto max-w-xs object-contain" />
            </div>
          </div>
          {!isMobile && (
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
                Public
              </button>
              <button
                onClick={() => router.push("/reward")}
                className="px-4 py-2.5 rounded-lg border border-[#14F195] text-[#14F195] font-medium hover:bg-[#14F195]/10 smooth-transition text-sm"
              >
                Reward
              </button>
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
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ...existing grid/token UI... */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Token List */}
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9945FF]" />
                <input
                  type="text"
                  placeholder="Search tokens..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-card/40 text-foreground placeholder:text-muted-foreground focus:outline-none smooth-transition border-2 border-[#9945FF] rounded-xl"
                  style={{ backgroundColor: "rgba(20, 20, 30, 0.18)" }}
                />
              </div>
              {/* Filter */}
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full min-w-[140px] bg-card/40 border-2 border-[#9945FF] focus:ring-[#9945FF]/40 focus:border-[#9945FF]/40 text-foreground rounded-lg shadow-sm flex items-center gap-2">
                    <span className="flex items-center">
                      <Filter className="w-4 h-4 text-[#9945FF] mr-2" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-card/90 border-2 border-[#9945FF]/30 text-foreground rounded-lg shadow-lg">
                    <SelectItem value="all">Filter: All</SelectItem>
                    <SelectItem value="burnable">Burnable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Manage Tokens Button */}
              <button
                type="button"
                className="w-full mt-3 py-2 rounded-lg border-2 border-[#9945FF] text-[#9945FF] font-semibold bg-card/40 hover:bg-[#9945FF]/10 transition flex items-center justify-center gap-2"
                onClick={() => setShowManageModal(true)}
              >
                <Settings className="w-5 h-5" />
                Manage Tokens
              </button>
              {/* Token List */}
              <TokenList tokens={filteredTokens.filter(t => tokenVisibility[t.symbol] !== false)} selectedToken={selectedToken} onSelectToken={setSelectedToken} />
      {showManageModal && (
        <TokenManageModal
          tokens={manageTokens}
          onClose={() => setShowManageModal(false)}
          onToggle={handleToggleToken}
        />
      )}

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
