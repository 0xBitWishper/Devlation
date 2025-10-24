"use client";

// StatCard component with up/down indicator
function StatCard(props: { label: string; value: string | number; change: number }) {
  const { label, value, change } = props;
  const isUp = change > 0;
  const isDown = change < 0;
  return (
    <div className="rounded-lg border border-[#333] bg-[#18181b] flex flex-col justify-center min-h-[40px] p-2">
      <div className="text-[#AAAAAA] text-[11px] mb-0.5">{label}</div>
      <div className="flex items-center gap-1">
        <span className="text-sm md:text-base font-bold text-white tracking-tight">{value}</span>
        {isUp && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="inline-block"><path d="M10 15V5M10 5l-5 5M10 5l5 5" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
        {isDown && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" className="inline-block"><path d="M10 5v10M10 15l-5-5M10 15l5-5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        )}
      </div>
    </div>
  );
}
// import { BurnRecord } from "../../../types/burn";
import { TokenBurnHistory } from "../../../components/block-transaction";
import { BurnRecord } from "../../../types/burn";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TokenDetail } from "../../../components/token-detail";
import React from "react";

export default function BlokDetailPage({ params }: { params: { mint: string } } | { params: Promise<{ mint: string }> }) {
  const router = useRouter();
  // Next.js 14+ param migration: unwrap if params is a Promise
  const unwrappedParams = typeof (params as any)?.then === 'function' ? React.use(params as Promise<{ mint: string }>) : params as { mint: string };
  const mint = typeof unwrappedParams.mint === "string" ? unwrappedParams.mint : Array.isArray(unwrappedParams.mint) ? unwrappedParams.mint[0] : "";
  // Dummy data for token burns (same as blok/page.tsx)
  const records: BurnRecord[] = [
    {
      id: '1',
      tokenSymbol: 'DFT',
      tokenName: 'Devflation Token',
      amount: 100000,
      txSignature: '5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB',
      timestamp: Date.now() - 86400000 * 2,
      icon: '🔥',
      mint: 'DFT11111111111111111111111111111111111111111',
    },
    {
      id: '2',
      tokenSymbol: 'SOL',
      tokenName: 'Solana',
      amount: 500,
      txSignature: '3Jd8K2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB5Rk',
      timestamp: Date.now() - 86400000 * 5,
      icon: '🪙',
      mint: 'So11111111111111111111111111111111111111112',
    },
    {
      id: '3',
      tokenSymbol: 'USDC',
      tokenName: 'USD Coin',
      amount: 25000,
      txSignature: '7yZ9aB5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX',
      timestamp: Date.now() - 86400000 * 10,
      icon: '💵',
      mint: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
    },
  ];

  const detailRecords = records.map((r) =>
    r.mint === 'DFT11111111111111111111111111111111111111111'
      ? {
          ...r,
          logoURI: '',
          dev: '0xBitWishper',
          circSupply: 1000000,
          totalSupply: 10000000,
          fdv: 13456000,
          mcap: 13456000,
          usdPrice: 0.25,
          liquidity: 120000,
          twitter: 'https://twitter.com/devflation',
          telegram: 'https://t.me/devflation',
          website: 'https://devflation.com',
          lastBurn: 1000000,
          vol24h: 1456000,
          burnHistory: [
            {
              date: 'October 12, 2025',
              burnWallet: 'Qxr79...9868',
              burnWalletType: 'Creator',
              burnSupply: 1000000,
              totalSupply: 1000000000,
              tx: 'Y687w...as6dawX',
              status: 'Success',
            },
            {
              date: 'October 11, 2025',
              burnWallet: 'Qxr79...9868',
              burnWalletType: 'Creator',
              burnSupply: 1000,
              totalSupply: 1000000000,
              tx: 'X673w...as6dawX',
              status: 'Success',
            },
          ],
    }
  : r
  );


  const filtered = detailRecords.filter(r => r.mint === mint);
  if (filtered.length === 1) {
    // Layout seragam dengan halaman blok/public-burn-history
    const token = filtered[0];
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
        {/* Header persis BurnHistory */}
        <header className="backdrop-blur-xl sticky top-0 z-40 bg-background/80">
          <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-4 flex-shrink-0">
              <button onClick={() => router.push('/block-transaction')} className="p-2 hover:bg-card/50 rounded-lg smooth-transition">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-accent/20 overflow-hidden">
                  <img src="/devflation_logo.png" alt="Devflation Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Block Transaction</h1>
                  <p className="text-xs text-muted-foreground">View all your token burns</p>
                </div>
              </div>
            </div>
            {/* Right: Search dan total burns (hanya jika bukan detail) */}
            {/* Tidak ada search di detail mode, hanya total burns */}
            <div className="text-right sm:ml-4">
              <p className="text-sm font-semibold text-foreground">3</p>
              <p className="text-xs text-muted-foreground">Total Burns</p>
            </div>
          </div>
        </header>
        {/* Fees Pool Progress Bar persis BurnHistory */}
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="w-full flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground tracking-wide">Fees Pool</span>
              <span className="text-sm font-bold text-[#9945FF]">0.43 / 1 SOL</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0">
              <span className="font-medium text-foreground">Fees</span> will be used to <span className="font-semibold text-[#9945FF]">buy</span>, then <span className="font-semibold text-[#14F195]">burn</span> the <span className="font-bold text-[#9945FF]">$DEVF</span> token.
            </p>
            <div className="w-full bg-border/60 rounded-xl shadow-inner h-4 flex items-center overflow-hidden border border-border/30 mt-1 relative">
              <div className="h-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-xl transition-all duration-500" style={{ width: '40%' }} />
              <div className="absolute left-0 top-0 h-full" style={{ width: '40%' }}>
                <div className="h-full w-16 bg-gradient-to-r from-transparent via-[#14F195]/60 to-transparent opacity-80 animate-[moveLight_2s_linear_infinite] rounded-xl" />
              </div>
              <style jsx>{`
                @keyframes moveLight {
                  0% { left: 0; }
                  100% { left: calc(100% - 4rem); }
                }
                .animate-[moveLight_2s_linear_infinite] {
                  position: absolute;
                  left: 0;
                  top: 0;
                  animation: moveLight 2s linear infinite;
                }
              `}</style>
            </div>
          </div>
        </div>
        {/* Main Card */}
        <main className="w-full max-w-7xl mx-auto flex flex-col items-start justify-start mt-8 px-6">
          <div className="w-full rounded-2xl border border-[#333] bg-[#111]/80 p-8 flex flex-col md:flex-row gap-8 shadow-xl" style={{ minHeight: 220 }}>
            {/* Left */}
            <div className="flex flex-col items-start min-w-[220px] max-w-[220px] gap-4">
              <div className="w-[100px] h-[100px] rounded-lg bg-[#e5e5e5] border border-[#333] flex items-center justify-center text-4xl text-[#bbb]" />
              <div className="text-left w-full">
                <div className="text-base font-bold text-white">Name</div>
                <div className="text-sm text-[#AAAAAA]">Symbol</div>
                {/* Social links for DFT only, below symbol */}
                {token.mint === 'DFT11111111111111111111111111111111111111111' && (() => {
                  const dft = token as typeof token & {
                    twitter: string;
                    telegram: string;
                    website: string;
                  };
                  return (
                    <div className="flex flex-row items-center gap-2 mt-4 pl-0">
                      {/* X Button */}
                      <a href={dft.twitter} target="_blank" rel="noopener noreferrer" title="X.com"
                        className="hover:opacity-80 transition-all duration-150">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#fff] opacity-80"><path d="M17.5 3h3.5l-7.5 8.5 8.5 9.5h-6l-5-5.5-5.5 5.5h-3.5l8-8.5-8.5-9.5h6l4.5 5 5-5z" fill="currentColor"/></svg>
                      </a>
                      {/* Telegram Button */}
                      <a href={dft.telegram} target="_blank" rel="noopener noreferrer" title="Telegram"
                        className="hover:opacity-80 transition-all duration-150">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#fff] opacity-80"><path d="M9.036 16.569l-.398 5.617c.57 0 .816-.244 1.112-.537l2.664-2.537 5.522 4.033c1.012.557 1.73.264 1.984-.936l3.6-16.8c.328-1.52-.552-2.12-1.536-1.76l-21.6 8.32c-1.48.592-1.464 1.44-.256 1.824l5.522 1.728 12.8-8.064c.6-.384 1.152-.176.704.208l-10.368 9.44z" fill="currentColor"/></svg>
                      </a>
                      {/* Website Button (only one) */}
                      <a href={dft.website} target="_blank" rel="noopener noreferrer" title="Website"
                        className="hover:opacity-80 transition-all duration-150">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-[#fff] opacity-80"><path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 2c1.657 0 3 4.03 3 8s-1.343 8-3 8-3-4.03-3-8 1.343-8 3-8zm-7.938 8c.2-1.72 1.02-3.26 2.188-4.406C7.07 8.07 8.42 9.5 8.92 12H4.062zm0 2H8.92c-.5 2.5-1.85 3.93-3.67 4.406A7.963 7.963 0 0 1 4.062 14zm13.018 4.406C16.93 15.93 15.58 14.5 15.08 12h4.858a7.963 7.963 0 0 1-2.858 4.406zM15.08 12c-.5-2.5-1.85-3.93-3.67-4.406A7.963 7.963 0 0 1 19.938 12H15.08zm-3.08 6c1.657 0 3-4.03 3-8s-1.343-8-3-8-3 4.03-3 8 1.343 8 3 8z" fill="currentColor"/></svg>
                      </a>
                    </div>
                  );
                })()}
              </div>
            </div>
            {/* Right: Card Data Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* 1 */}
                <div className="rounded-lg border border-[#333] bg-[#18181b] flex flex-col justify-center min-h-[40px] p-2">
                  <div className="text-[#AAAAAA] text-[11px] mb-0.5">Last Burn</div>
                  <div className="text-sm md:text-base font-bold text-white tracking-tight">1.000.000</div>
                </div>
                {/* 2 */}
                <div className="rounded-lg border border-[#333] bg-[#18181b] flex flex-col justify-center min-h-[40px] p-2">
                  <div className="text-[#AAAAAA] text-[11px] mb-0.5">Total Burn</div>
                  <div className="text-sm md:text-base font-bold text-white tracking-tight">2.000.000</div>
                </div>
                {/* 3 */}
                <StatCard label="Vol 24h" value="$1456K" change={+1.2} />
                {/* 4 */}
                <StatCard label="Market Cap" value="$13456K" change={-0.8} />
                {/* 5 */}
                <StatCard label="Price USD" value="$0.0123" change={+0.5} />
                {/* 6 */}
                <StatCard label="Price SOL" value="0.00012" change={-0.2} />
                {/* 7 */}
                <StatCard label="Holder" value="1,234" change={+0.3} />
                {/* 8 */}
                <StatCard label="Vol Buy 5M" value="$12,345" change={+2.1} />
                {/* 9 */}
                <StatCard label="Vol Sell 5M" value="$8,765" change={-1.4} />
                {/* 10 */}
                <StatCard label="Price Change 24H" value="+12.34%" change={+12.34} />
                {/* 11 */}
                <StatCard label="FDV" value="$25,000,000" change={+0.7} />
                {/* 12 */}
                <StatCard label="Liquidity" value="$1,200,000" change={-0.5} />
              </div>
            </div>
          </div>
        </main>
        {/* Banner Card Only */}
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row gap-4 mt-8 px-6">
          <div className="flex-1">
            <BannerSlide />
          </div>
        </div>
        {/* Burn History Table */}
        <div className="w-full max-w-7xl mx-auto mt-8 px-6">
          {token.mint === 'DFT11111111111111111111111111111111111111111' && Array.isArray((token as any).burnHistory) ? (
            <div className="overflow-x-auto rounded-xl border border-white/20 bg-[#111]/80">
              <table className="min-w-full text-sm text-left">
                <thead>
                  <tr className="text-white">
                    <th className="px-4 py-3 border-b border-white/20">Date</th>
                    <th className="px-4 py-3 border-b border-white/20">Burn Wallet</th>
                    <th className="px-4 py-3 border-b border-white/20">Burn Supply</th>
                    <th className="px-4 py-3 border-b border-white/20">Total Supply</th>
                    <th className="px-4 py-3 border-b border-white/20">Txns</th>
                    <th className="px-4 py-3 border-b border-white/20">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(token as any).burnHistory.map((b: any, i: number) => (
                    <tr key={i} className="text-white/90">
                      <td className="px-4 py-2 whitespace-nowrap">{b.date}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {b.burnWallet} {b.burnWalletType && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-green-500 text-xs text-black font-semibold align-middle">{b.burnWalletType}</span>
                        )}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">{Number(b.burnSupply).toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">{Number(b.totalSupply).toLocaleString()}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {b.tx}
                        <span className="ml-1">→</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className="px-3 py-1 rounded bg-green-600 text-xs text-white font-bold">{b.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <TokenBurnHistory records={[token]} onBack={() => router.push("/block-transaction")} />
          )}
        </div>
      </div>
    );
  }
  return <TokenBurnHistory records={filtered} onBack={() => router.push("/block-transaction")} />;
}

// BannerSlide component (simple carousel)
function BannerSlide() {
  const banners = [
    '/1200x80/banner1-block-transaction.jpg',
    '/1200x80/banner2-block-transaction.jpg',
    '/1200x80/banner3-block-transaction.jpg',
  ];
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const timer = setInterval(() => setIdx(i => (i + 1) % banners.length), 4000);
    return () => clearInterval(timer);
  }, [banners.length]);
  return (
    <div className="rounded-2xl border border-[#333] bg-black p-0 flex items-center justify-between min-h-[56px] shadow-lg transition-all duration-500 overflow-hidden relative">
      <img
        src={banners[idx]}
        alt={`Banner ${idx+1}`}
        className="w-full h-[56px] md:h-[80px] object-cover rounded-2xl"
        style={{maxWidth:'100%'}}
      />
      <div className="flex gap-1 ml-4 absolute bottom-2 right-4 z-10">
        {banners.map((_, i) => (
          <button
            key={i}
            className={`w-2 h-2 rounded-full ${i === idx ? 'bg-white' : 'bg-white/40'} border border-white/30 transition-all`}
            onClick={() => setIdx(i)}
            aria-label={`Go to slide ${i+1}`}
          />
        ))}
      </div>
    </div>
  );
}
