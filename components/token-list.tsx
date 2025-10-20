"use client"

import React, { useEffect, useState } from "react";
import { useWallet } from '@solana/wallet-adapter-react';
import usePrices from '../hooks/usePrices';

interface TokenListProps {
  tokens: any[]
  selectedToken: any
  onSelectToken: (token: any) => void
}

// Single, clean USD value component that queries Jupiter price API
function TokenUSDValue({ token }: { token: any }) {
  const mint = token.mintAddress ?? token.mint;
  const { prices } = usePrices(mint ? [mint] : [], { interval: 1000 });
  const info = mint ? prices[mint] : null;
  const unit = info?.usdPrice ?? token.usdPrice ?? token.price ?? null;
  const change = info?.priceChange24h ?? token.priceChange24h ?? token.priceChange ?? null;
  if (unit === null || unit === undefined) return <div className="text-xs text-muted-foreground">--</div>;
  const usd = (token.balance ?? 0) * unit;
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      {change !== null && change !== undefined ? (
        change > 0 ? (
          <span className="text-green-500 flex items-center gap-0.5">▲ {Math.abs(change).toFixed(2)}%</span>
        ) : change < 0 ? (
          <span className="text-red-500 flex items-center gap-0.5">▼ {Math.abs(change).toFixed(2)}%</span>
        ) : (
          <span className="text-muted-foreground">▬ {Math.abs(change).toFixed(2)}%</span>
        )
      ) : (
        <span className="text-muted-foreground">--</span>
      )}
      <span>${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
    </div>
  );
}

export function TokenList({ tokens, selectedToken, onSelectToken }: TokenListProps) {
  const { publicKey } = useWallet();
  // DEBUG: ensure tokens prop passed to TokenList
  try { console.debug('[TokenList] tokens length', Array.isArray(tokens) ? tokens.length : 'not-array', { tokensPreview: (Array.isArray(tokens) && tokens.slice(0,5)) || tokens }); } catch (e) {}
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {tokens.map((token) => (
        <button
          key={token.id}
          onClick={() => onSelectToken(token)}
          className={`w-full p-4 rounded-xl border smooth-transition flex items-center gap-3 backdrop-blur-xl ${selectedToken?.id === token.id ? 'border-2 border-[#9945FF]' : 'border border-border/40'}`}
          style={selectedToken?.id === token.id
            ? {
                background: "linear-gradient(90deg, rgba(153,69,255,0.13) 0%, rgba(20,241,149,0.13) 100%)",
                border: "2px solid #9945FF"
              }
            : { backgroundColor: "rgba(255, 255, 255, 0.03)" }
          }
        >
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-lg flex-shrink-0 border border-accent/20 overflow-hidden">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-contain" />
            ) : (
              <span className="w-full h-full block" style={{ background: 'transparent' }}></span>
            )}
          </div>

          <div className="flex-1 text-left">
            <div className="font-semibold text-foreground text-sm truncate flex items-center gap-2">
              <span>{token.symbol ?? token.name ?? 'SPL'}</span>
              {/* DEV badge when token metadata indicates this wallet is the dev */}
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
            <div className="text-xs text-muted-foreground truncate">
              {token.name && token.name !== token.mintAddress
                ? token.name
                : (typeof token.mintAddress === 'string' && token.mintAddress.length > 10
                  ? `${token.mintAddress.slice(0, 4)}...${token.mintAddress.slice(-4)}`
                  : (token.mintAddress || 'Unknown'))}
            </div>
          </div>

          <div className="text-right">
            <div className="font-semibold text-foreground text-sm">{(token.balance ?? 0).toLocaleString()}</div>
            <TokenUSDValue token={token} />
          </div>
        </button>
      ))}
    </div>
  )
}
