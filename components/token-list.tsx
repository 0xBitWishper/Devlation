"use client"

import React, { useEffect, useState } from "react";

interface TokenListProps {
  tokens: any[]
  selectedToken: any
  onSelectToken: (token: any) => void
}

// Single, clean USD value component that queries Jupiter price API
function TokenUSDValue({ token }: { token: any }) {
  const [usd, setUsd] = useState<number | null>(null);
  const [change, setChange] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    const fetchPrice = async () => {
      try {
        let price: number | null = null;
        let pct: number | null = null;
        if (token.symbol === 'SOL') {
          // Fetch SOL price and 24h change from CoinGecko
          const res = await fetch('https://api.coingecko.com/api/v3/coins/solana?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false');
          if (!res.ok) return;
          const data = await res.json();
          price = data.market_data?.current_price?.usd ?? null;
          pct = data.market_data?.price_change_percentage_24h ?? null;
        } else {
          // SPL token: Jupiter (no 24h change)
          const res = await fetch(`https://price.jup.ag/v4/price?ids=${token.mintAddress}`);
          if (!res.ok) return;
          const data = await res.json();
          price = data.data?.[token.mintAddress]?.price ?? null;
        }
        if (!cancelled && price) setUsd((token.balance ?? 0) * price);
        if (!cancelled && pct !== null) setChange(pct);
      } catch (e) {
        // silent
      }
    };
    fetchPrice();
    const interval = setInterval(fetchPrice, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [token.balance, token.mintAddress, token.symbol]);

  if (usd === null) return <div className="text-xs text-muted-foreground">--</div>;
  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      {token.symbol === 'SOL' && change !== null ? (
        <>
          {change > 0 ? (
            <span className="text-green-500 flex items-center gap-0.5">▲ {Math.abs(change).toFixed(2)}%</span>
          ) : (
            <span className="text-red-500 flex items-center gap-0.5">▼ {Math.abs(change).toFixed(2)}%</span>
          )}
        </>
      ) : (
        <span className="text-muted-foreground">--</span>
      )}
  <span>${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
    </div>
  );
}

export function TokenList({ tokens, selectedToken, onSelectToken }: TokenListProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
      {tokens.map((token) => (
        <button
          key={token.id}
          onClick={() => onSelectToken(token)}
          className={`w-full p-4 rounded-xl border smooth-transition flex items-center gap-3 backdrop-blur-xl ${selectedToken?.id === token.id ? '' : 'border-border/40'}`}
          style={selectedToken?.id === token.id
            ? {
                background: "linear-gradient(90deg, rgba(153,69,255,0.18) 0%, rgba(20,241,149,0.18) 100%)",
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
              {token.symbol}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {token.name && token.name !== token.mintAddress
                ? token.name
                : (typeof token.mintAddress === 'string' && token.mintAddress.length > 10
                  ? `${token.mintAddress.slice(0, 4)}...${token.mintAddress.slice(-4)}`
                  : token.mintAddress)}
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
