"use client"

import { useState } from "react"
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
import { PublicKey, Transaction } from "@solana/web3.js"
import { getAssociatedTokenAddress, createBurnInstruction } from "@solana/spl-token"
import { useEffect, useRef } from "react"

interface DashboardProps {
  onBurnClick: (token: any) => void
  onHistoryClick: () => void
}

export function Dashboard({ onBurnClick, onHistoryClick }: DashboardProps) {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [tokensOwned, setTokensOwned] = useState<any[]>([]);
  const [tokensError, setTokensError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setTokensOwned([]);
    setTokensError(null);
    async function fetchTokens() {
      if (publicKey) {
        try {
          const res = await fetch(`/api/solana-tokens?publicKey=${publicKey.toBase58()}`);
          const data = await res.json();
          if (!cancelled) {
            if (Array.isArray(data.tokens)) {
              setTokensOwned(data.tokens);
            } else {
              setTokensError("Gagal mengambil data token. Coba refresh atau cek koneksi wallet.");
            }
          }
        } catch (e) {
          if (!cancelled) setTokensError("Gagal mengambil data token. Coba refresh atau cek koneksi wallet.");
        }
      } else {
        setTokensOwned([]);
      }
    }
    fetchTokens();
    return () => { cancelled = true; };
  }, [publicKey]);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const balanceRef = useRef<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSolBalance(null); // Reset to loading state
    setBalanceError(null);
    async function fetchBalance() {
      if (publicKey) {
        try {
          const res = await fetch(`/api/solana-balance?publicKey=${publicKey.toBase58()}`);
          const data = await res.json();
          if (!cancelled) {
            if (data.sol !== undefined) {
              setSolBalance(data.sol);
              balanceRef.current = data.sol;
            } else {
              setSolBalance(null);
              setBalanceError("Gagal mengambil saldo SOL. Coba refresh atau cek koneksi wallet.");
            }
          }
        } catch (e) {
          if (!cancelled) {
            setSolBalance(null);
            setBalanceError("Gagal mengambil saldo SOL. Coba refresh atau cek koneksi wallet.");
          }
        }
      } else {
        setSolBalance(null);
      }
    }
    fetchBalance();
    return () => { cancelled = true; };
  }, [publicKey]);
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [burnModalToken, setBurnModalToken] = useState<any>(null)

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
      const meta = tokenMeta[token.mint] || {};
      const fallbackLogo = `https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/assets/mainnet/${token.mint}/logo.png`;
      return {
        id: idx + 1,
        symbol: token.symbol || meta.symbol || token.mint?.slice(0, 4) || 'SPL',
        name: token.name || meta.name || token.mint,
        balance: token.amount,
        decimals: token.decimals,
        mintAddress: token.mint,
        logoURI: token.logoURI || meta.logoURI || fallbackLogo,
        icon: '',
      };
    })
  ];

  // Debug log tokensOwned dan tokens
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('tokensOwned:', tokensOwned);
    // eslint-disable-next-line no-console
    console.log('tokens (mapped):', tokens);
  }

  const filteredTokens = tokens.filter(
    (token) =>
      (token.symbol?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (token.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()),
  );

  // Debug log tokensOwned dan tokens (setelah semua variabel dideklarasikan)
  if (typeof window !== 'undefined') {
    // eslint-disable-next-line no-console
    console.log('tokensOwned:', tokensOwned);
    // eslint-disable-next-line no-console
    console.log('tokens (mapped):', tokens);
  }

  const router = useRouter();
  const handleBurnClick = (token: any) => {
    setBurnModalToken(token);
  };

  const handleBurnCancel = () => {
    setBurnModalToken(null);
  };

  const handleBurnConfirm = (amount: number) => {
    async function burnToken() {
      if (!burnModalToken || !publicKey || !amount || !connection) return;
      // Aktifkan mode TX agar provider pakai endpoint TX
      if (typeof window !== 'undefined') (window as any).txMode = true;
      try {
        const mint = new PublicKey(burnModalToken.mintAddress);
        const owner = publicKey;
        const decimals = burnModalToken.decimals ?? 0;
        // Cari ATA (Associated Token Account)
        const ata = await getAssociatedTokenAddress(mint, owner);
        // Buat instruksi burn
        const burnIx = createBurnInstruction(
          ata,
          mint,
          owner,
          amount * Math.pow(10, decimals)
        );
        // Buat transaksi
        const tx = new Transaction().add(burnIx);
        // Kirim transaksi menggunakan wallet adapter
        const txid = await sendTransaction(tx, connection);
        window.alert('Burn berhasil!\nTx: ' + txid);
      } catch (err: any) {
        window.alert('Burn gagal: ' + (err?.message || err));
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
            {/* Home button removed as requested */}
            <button
              onClick={() => router.push("/")}
              className="w-11 h-11 rounded-xl bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)]/30 flex items-center justify-center border-2 border-[#9945FF] focus:outline-none"
              title="Go to Landing Page"
            >
              <Flame className="w-6 h-6 text-[#9945FF]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Devlation</h1>
              <p className="text-xs text-muted-foreground">Burn Any Tokens on Solana Network</p>
            </div>
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
              <div className="flex items-center gap-2">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full min-w-[140px] bg-card/40 border-2 border-[#9945FF] focus:ring-[#9945FF]/40 focus:border-[#9945FF]/40 text-foreground rounded-lg shadow-sm flex items-center gap-2">
                    <span className="flex items-center">
                      <Filter className="w-4 h-4 text-muted-foreground mr-2" />
                      <SelectValue />
                    </span>
                  </SelectTrigger>
                  <SelectContent className="bg-card/90 border-2 border-[#9945FF]/30 text-foreground rounded-lg shadow-lg">
                    <SelectItem value="all">Filter: All</SelectItem>
                    <SelectItem value="burnable">Burnable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Token List */}
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
