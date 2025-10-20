"use client"


import React, { useEffect, useState } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import usePrices from '../hooks/usePrices';
import { Copy, Flame } from "lucide-react";
// Komponen harga USDC dan indikator tren
function TokenUSDCDetail({ token }: { token: any }) {
  const mint = token.mintAddress ?? token.mint;
  const { prices } = usePrices(mint ? [mint] : [], { interval: 1000 });
  const p = mint ? prices[mint] : null;
  const unitPrice = p?.usdPrice ?? token.usdPrice ?? token.price ?? null;
  const change = p?.priceChange24h ?? token.priceChange24h ?? token.priceChange ?? null;
  const usd = (token.balance ?? 0) * (unitPrice ?? 0);

  return (
    <div className="flex flex-col items-start">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-foreground">{unitPrice !== null && unitPrice !== undefined ? `$${unitPrice.toLocaleString(undefined, { maximumFractionDigits: 6 })}` : '--'}</span>
        {change !== null && change !== undefined ? (
          change > 0 ? (
            <span className="text-green-500 flex items-center gap-0.5 text-xs">▲ {Math.abs(change).toFixed(2)}%</span>
          ) : (
            <span className="text-red-500 flex items-center gap-0.5 text-xs">▼ {Math.abs(change).toFixed(2)}%</span>
          )
        ) : (
          <span className="text-muted-foreground text-xs">--</span>
        )}
      </div>
      <div className="mt-1">
        <span className="text-xs text-muted-foreground">{usd ? `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })} total` : ''}</span>
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
  const { publicKey } = useWallet();

  // Enrich token metadata on mount so UI shows symbol/name/logo quickly
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Always ensure `token.meta` exists (and includes `dev`) so UI and other
        // components can rely on the same shape. Only fetch when missing or when
        // dev field isn't present.
        const needsMeta = !(token as any).meta || !((token as any).meta?.dev);
        if (needsMeta || !token.logoURI || !token.name || !token.symbol) {
          const { fetchTokenMetadata } = await import('../lib/solanaMetadata');
          const meta = await fetchTokenMetadata(token.mintAddress ?? token.mint);
          if (!cancelled && meta) {
            // attach raw meta so UI and logic can inspect meta.dev
            try { (token as any).meta = meta; } catch (e) {}
            if (!token.logoURI && meta.logoURI) token.logoURI = meta.logoURI;
            if ((!token.name || token.name === token.mintAddress) && meta.name) token.name = meta.name;
            if ((!token.symbol) && meta.symbol) token.symbol = meta.symbol;
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [token.mintAddress]);

  return (
    <div
      className="rounded-xl backdrop-blur-xl border-2 border-[#9945FF] p-8 space-y-6 shadow-2xl"
      style={{ background: "rgba(20, 20, 30, 0.45)", boxShadow: "0 8px 32px 0 rgba(153,69,255,0.25)", border: "2px solid #9945FF" }}
  // ...existing code...
    >
  <div className="flex items-start justify-between pb-6 border-b-2 border-[#9945FF]">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)]/20 flex items-center justify-center text-4xl border-2 border-[#9945FF] overflow-hidden">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-contain" />
            ) : token.icon ? (
              <img src={token.icon} alt={token.symbol} className="w-full h-full object-contain" />
            ) : (
              <div className="text-2xl font-bold text-foreground">{token.symbol || '?'}</div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold text-foreground tracking-tight">{token.symbol ?? token.name ?? 'SPL'}</h2>
              {/* Developer badge when token metadata indicates this wallet is the dev (inline with symbol) */}
              {(() => {
                try {
                  const pk = publicKey?.toBase58?.();
                  const meta = token?.meta ?? token?.metadata ?? null;
                  const devField = meta?.dev ?? null;
                  if (devField && pk && String(devField).trim() === pk) {
                    return <span className="text-xs bg-green-600/10 text-green-400 px-2 py-0.5 rounded-full">Developer</span>;
                  }
                } catch (e) {}
                return null;
              })()}
            </div>
            <p className="text-sm text-muted-foreground font-medium">{token.name ?? token.mintAddress}</p>
          </div>
        </div>
      </div>

      {/* Token Info Grid */}
      <div className="grid grid-cols-2 gap-4">
  <div className="p-4 rounded-lg bg-card/30 border-2 border-[#9945FF]">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Balance</p>
          <p className="text-2xl font-bold text-foreground">{token.balance.toLocaleString()}</p>
        </div>
  <div className="p-4 rounded-lg bg-card/30 border-2 border-[#9945FF]">
          <p className="text-xs text-muted-foreground mb-2 font-medium">Price (USDC)</p>
          <TokenUSDCDetail token={token} />
        </div>
      </div>

      {/* Mint Address */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground font-medium">Mint Address</p>
  <div className="flex items-center gap-2 p-4 rounded-lg bg-card/30 border-2 border-[#9945FF]">
          <code className="flex-1 text-xs font-mono text-foreground break-all">{token.mintAddress}</code>
          <button
            onClick={() => copyToClipboard(token.mintAddress)}
            className="p-2 hover:bg-[#9945FF]/20 rounded-lg smooth-transition flex-shrink-0 text-[#9945FF]"
            title="Copy address"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Burn Button */}
      <button
        onClick={() => onBurnClick(token)}
        className="w-full py-3 px-4 rounded-lg bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)] text-white font-semibold flex items-center justify-center gap-2 hover:opacity-90 smooth-transition shadow-lg"
      >
        <Flame className="w-5 h-5" />
        Edit Amount to Burn
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
