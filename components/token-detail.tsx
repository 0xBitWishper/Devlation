"use client"


import React, { useEffect, useState } from "react";
import { Copy, Flame } from "lucide-react";
// Komponen harga USDC dan indikator tren
function TokenUSDCDetail({ token }: { token: any }) {
  const [usd, setUsd] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);
  useEffect(() => {
    setUsd(null); // Reset nominal USDC setiap token berubah
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        let price: number | null = null;
        let pct: number | null = null;
        if (token.symbol === 'SOL') {
          const res = await fetch('https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
          if (!res.ok) return;
          const data = await res.json();
          price = data.market_data?.current_price?.usd ?? null;
          pct = data.market_data?.price_change_percentage_24h ?? null;
          if (!cancelled && price) setUsd((token.balance ?? 0) * price);
          if (!cancelled && pct !== null) setChange(pct);
        } else {
          // Debug log
          if (typeof window !== 'undefined') {
            // eslint-disable-next-line no-console
            console.log('[TokenUSDCDetail] mintAddress:', token.mintAddress, 'balance:', token.balance);
          }
          const res = await fetch(`https://price.jup.ag/v4/price?ids=${token.mintAddress}`);
          let priceFetched = 0;
          if (res.ok) {
            const data = await res.json();
            priceFetched = data.data?.[token.mintAddress]?.price ?? 0;
            if (typeof window !== 'undefined') {
              // eslint-disable-next-line no-console
              console.log('[TokenUSDCDetail] Jupiter price:', priceFetched);
            }
          }
          if (!cancelled) setUsd((token.balance ?? 0) * priceFetched);
        }
      } catch {}
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [token.balance, token.mintAddress, token.symbol]);
  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-foreground">${usd !== null ? usd.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '--'}</span>
        {token.symbol === 'SOL' && change !== null ? (
          <>
            {change > 0 ? (
              <span className="text-green-500 flex items-center gap-0.5 text-xs">▲ {Math.abs(change).toFixed(2)}%</span>
            ) : (
              <span className="text-red-500 flex items-center gap-0.5 text-xs">▼ {Math.abs(change).toFixed(2)}%</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground text-xs">--</span>
        )}
      </div>
    </div>
  );
}

interface TokenDetailProps {
  token: any
  onBurnClick: (token: any) => void
}

export function TokenDetail({ token, onBurnClick }: TokenDetailProps) {
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
  }

  return (
    <div
      className="rounded-xl backdrop-blur-xl border border-white/10 border-border/40 p-8 space-y-6"
      style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
    >
      <div className="flex items-start justify-between pb-6 border-b border-border/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-4xl border border-accent/20 overflow-hidden">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-contain" />
            ) : (
              token.icon
            )}
          </div>
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">{token.symbol}</h2>
            <p className="text-sm text-muted-foreground font-medium">{token.name}</p>
          </div>
        </div>
      </div>

      {/* Token Info Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-card/30 border border-border/40">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Balance</p>
          <p className="text-2xl font-bold text-foreground">{token.balance.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-lg bg-card/30 border border-border/40">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Price (USDC)</p>
          <TokenUSDCDetail token={token} />
        </div>
      </div>

      {/* Mint Address */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Mint Address</p>
        <div className="flex items-center gap-2 p-4 rounded-lg bg-card/30 border border-border/40">
          <code className="flex-1 text-xs font-mono text-foreground break-all">{token.mintAddress}</code>
          <button
            onClick={() => copyToClipboard(token.mintAddress)}
            className="p-2 hover:bg-accent/20 rounded-lg smooth-transition flex-shrink-0 text-accent"
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Burn Button */}
      <button
        onClick={() => onBurnClick(token)}
        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold flex items-center justify-center gap-2 hover:from-accent/90 hover:to-accent/70 smooth-transition shadow-lg shadow-accent/20"
      >
        <Flame className="w-5 h-5" />
        Burn {token.symbol}
      </button>

      {/* Info Box */}
      <div className="p-4 rounded-lg bg-destructive/8 border border-destructive/30">
        <p className="text-xs text-destructive font-semibold mb-1">⚠️ Warning</p>
        <p className="text-xs text-destructive/80 leading-relaxed">
          Burning tokens is irreversible. Make sure you want to proceed before confirming.
        </p>
      </div>
    </div>
  )
}
