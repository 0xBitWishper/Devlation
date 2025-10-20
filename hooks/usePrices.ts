import { useEffect, useRef, useState } from 'react';

type PriceInfo = {
  usdPrice?: number | null;
  priceChange24h?: number | null;
}

export default function usePrices(mints: string[] = [], opts?: { interval?: number }) {
  const intervalMs = opts?.interval ?? 1000;
  const [prices, setPrices] = useState<Record<string, PriceInfo>>({});
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unique = Array.from(new Set((mints || []).filter(Boolean)));
    if (unique.length === 0) return;

    const fetchOnce = async () => {
      // don't start another request if one is still running
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        // Directly call Jupiter lite price endpoint so we can verify HTTP status
        const ids = encodeURIComponent(unique.join(','));
        const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${ids}`);
        if (!res.ok) {
          // only clear inFlight; do not update prices on non-200 response
          inFlight.current = false;
          return;
        }
        const json = await res.json();
        if (cancelled) {
          inFlight.current = false;
          return;
        }
        const out: Record<string, PriceInfo> = {};
        for (const m of unique) {
          const info = json?.[m] ?? json?.[m.toString()] ?? null;
          if (!info) {
            out[m] = { usdPrice: null, priceChange24h: null };
            continue;
          }
          const usdPrice = typeof info?.usdPrice === 'number' ? info.usdPrice : (typeof info?.price === 'number' ? info.price : null);
          const changeCandidates = [
            info?.priceChange24h,
            info?.priceChangePercent24h,
            info?.price_change_24h,
            info?.percent_change_24h,
            info?.change24h,
            info?.priceChange,
          ];
          const change = changeCandidates.find((c) => typeof c === 'number') ?? null;
          out[m] = { usdPrice: typeof usdPrice === 'number' ? usdPrice : null, priceChange24h: typeof change === 'number' ? change as number : null };
        }
        if (mounted.current && !cancelled) setPrices(out);
        inFlight.current = false;
      } catch (e) {
        inFlight.current = false;
        // ignore errors; keep previous prices
      }
    };

    // immediate fetch and interval
    fetchOnce();
    const iv = setInterval(fetchOnce, intervalMs);
    return () => { cancelled = true; clearInterval(iv); };
  }, [JSON.stringify(mints || []), intervalMs]);

  return { prices } as { prices: Record<string, PriceInfo> };
}
