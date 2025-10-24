"use client"

// Animated typing effect for hero title

function AnimatedHeroTitle() {
  const words = ["Burn It.", "Prove It.", "Track It."];
  const [currentWord, setCurrentWord] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const [isErasing, setIsErasing] = useState(false);

  useEffect(() => {
    let timeout: any;
    if (isTyping) {
      if (displayed.length < words[currentWord].length) {
        timeout = setTimeout(() => {
          setDisplayed(words[currentWord].slice(0, displayed.length + 1));
        }, 80);
      } else {
        timeout = setTimeout(() => {
          setIsTyping(false);
          setIsErasing(true);
        }, 900);
      }
    } else if (isErasing) {
      if (displayed.length > 0) {
        timeout = setTimeout(() => {
          setDisplayed(displayed.slice(0, -1));
        }, 40);
      } else {
        setIsErasing(false);
        setIsTyping(true);
        setCurrentWord((prev) => (prev + 1) % words.length);
      }
    }
    return () => clearTimeout(timeout);
  }, [displayed, isTyping, isErasing, currentWord, words]);

  return (
    <h2 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight min-h-[72px]">
      <span className="whitespace-pre">{displayed}</span>
      <span className="inline-block w-2 h-10 bg-[#9945FF] animate-blink align-middle ml-1" />
      <style jsx>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        .animate-blink { animation: blink 1s steps(2, start) infinite; }
      `}</style>
    </h2>
  );
}
import { Flame, Zap, Shield, ArrowRight, Copy as CopyIcon, HelpCircle, Download, Book } from "lucide-react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useRouter } from "next/navigation";
import LogoSlider from "./logo-slider";
import PartnershipSection from "./partnership-section";
import CallToActionSection from "./call-to-action-section";
import { useEffect, useState } from "react";
// Logo links from env
const logoLinks: Record<string, string> = {
  bags: process.env.NEXT_PUBLIC_LAUNCHPAD_BAGS_URL || '',
  belive: process.env.NEXT_PUBLIC_LAUNCHPAD_BELIVE_URL || '',
  bonk: process.env.NEXT_PUBLIC_LAUNCHPAD_BONK_URL || '',
  boop: process.env.NEXT_PUBLIC_LAUNCHPAD_BOOP_URL || '',
    heven: process.env.NEXT_PUBLIC_LAUNCHPAD_HEVEN_URL || '',
    jup: process.env.NEXT_PUBLIC_LAUNCHPAD_JUP_URL || '',
    meteora: process.env.NEXT_PUBLIC_LAUNCHPAD_METEORA_URL || '',
    moonit: process.env.NEXT_PUBLIC_LAUNCHPAD_MOONIT_URL || '',
    orca: process.env.NEXT_PUBLIC_LAUNCHPAD_ORCA_URL || '',
    pumpfun: process.env.NEXT_PUBLIC_LAUNCHPAD_PUMPFUN_URL || '',
    raydium: process.env.NEXT_PUBLIC_LAUNCHPAD_RAYDIUM_URL || '',
  };
// Copy notification popup
function CopyNotificationWrapper() {
  const [show, setShow] = useState(false);
  // Expose global for child
  useEffect(() => {
    (window as any).showCopyNotif = () => {
      setShow(true);
      setTimeout(() => setShow(false), 1800);
    };
    return () => { (window as any).showCopyNotif = undefined; };
  }, []);
  return show ? (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50">
  <div className="px-4 py-2 rounded-lg bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)] text-background font-semibold shadow-lg animate-fade-in">
        Address copied!
      </div>
    </div>
  ) : null;
}

function CopyableAddress() {
  const address = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxpump';
  return (
    <div className="flex-1 flex items-center gap-2 bg-background/70 border border-border/40 rounded-lg px-3 h-10">
  <span className="font-mono text-xs sm:text-sm text-[#9945FF] break-all select-all">
        {address}
      </span>
      <button
  className="ml-2 p-2 rounded hover:bg-[#9945FF]/20 text-[#14F195] transition flex items-center justify-center"
        onClick={() => {
          navigator.clipboard.writeText(address);
          if (typeof window !== 'undefined' && (window as any).showCopyNotif) (window as any).showCopyNotif();
        }}
        title="Copy Address"
        aria-label="Copy Address"
      >
        <CopyIcon className="w-5 h-5" />
      </button>
    </div>
  );
}

interface LandingPageProps {
  onGetStarted: () => void
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const { connected, publicKey } = useWallet();
  const { connection } = useConnection();
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  const router = useRouter();
  const handleConnect = () => router.push("/connect-wallet");
  const handleGetStarted = () => router.push("/dashboard");

  useEffect(() => {
    let cancelled = false;
    async function fetchBalance() {
      if (publicKey && connection) {
        const safeFetchJSON = async (path: string, timeout = 8000) => {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          try {
            try {
              const res = await fetch(path, { signal: controller.signal });
              clearTimeout(id);
              const txt = await res.text().catch(() => null);
              let parsed = null;
              try { parsed = txt ? JSON.parse(txt) : null } catch (e) { parsed = txt; }
              return { ok: res.ok, status: res.status, body: parsed };
            } catch (fetchErr) {
              clearTimeout(id);
              return { ok: false, status: null, body: null, error: String(fetchErr) } as any;
            }
          } finally { clearTimeout(id); }
        };
        try {
          const res = await safeFetchJSON(`/api/solana-balance?publicKey=${publicKey.toBase58()}`);
          if (!cancelled) {
            if (res.ok && res.body && res.body.sol !== undefined) setSolBalance(res.body.sol);
            else setSolBalance(null);
          }
        } catch {
          if (!cancelled) setSolBalance(null);
        }
      } else {
        setSolBalance(null);
      }
    }
    fetchBalance();
    return () => { cancelled = true; };
  }, [publicKey, connection]);


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 overflow-hidden flex flex-col relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {/* Atas */}
        <div className="absolute top-20 right-10 w-72 h-72 bg-[#9945FF]/25 rounded-full blur-3xl animate-pulse" />
        {/* Tengah kiri */}
        <div className="absolute left-[25%] top-[38%] -translate-x-1/2 -translate-y-1/2 w-[340px] h-[180px] bg-[#9945FF]/35 rounded-full blur-[100px] animate-pulse" style={{animationDelay:'1.2s', opacity:0.82}} />
        {/* Tengah kanan */}
        <div className="absolute left-[70%] top-[45%] -translate-x-1/2 -translate-y-1/2 w-[320px] h-[160px] bg-[#14F195]/35 rounded-full blur-[90px] animate-pulse" style={{animationDelay:'1.4s', opacity:0.75}} />
        {/* Tengah bawah */}
        <div className="absolute left-[50%] top-[70%] -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-[#9945FF]/25 rounded-full blur-[110px] animate-pulse" style={{animationDelay:'1.7s', opacity:0.7}} />
  {/* Bawah kiri */}
  <div className="absolute left-10 bottom-[-60px] w-[320px] h-[160px] bg-[#14F195]/20 rounded-full blur-[90px] animate-pulse" style={{animationDelay:'2s', opacity:0.6}} />
  {/* Bawah tengah (sekarang ungu, lebih naik & agak kanan) */}
  <div className="absolute left-[58%] -translate-x-1/2 bottom-[180px] w-[260px] h-[130px] bg-[#9945FF]/30 rounded-full blur-[80px] animate-pulse" style={{animationDelay:'2.3s', opacity:0.7}} />
  {/* Bawah kanan */}
  <div className="absolute right-10 bottom-[-60px] w-[220px] h-[120px] bg-[#9945FF]/20 rounded-full blur-[70px] animate-pulse" style={{animationDelay:'2.5s', opacity:0.6}} />
      </div>

  <div className="relative z-10 flex-1">
        {/* Header */}
  <header className="relative backdrop-blur-xl bg-background/80">
    <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between flex-wrap">
      <div className="flex items-center gap-3">
        <div className="h-16 flex items-center justify-center">
          <img src="/devflation.png" alt="Devflation Logo" className="h-10 w-auto max-w-xs object-contain" />
        </div>
      </div>
      {connected && (
        <div
          className="flex items-center gap-3 px-3 py-2 rounded-lg backdrop-blur-xl border border-white/10"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}
        >
          <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Connected:</span>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-mono text-xs sm:text-sm text-[#9945FF] font-semibold">
              {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "-"}
            </span>
            <span className="text-xs text-muted-foreground hidden sm:inline">|</span>
            <span className="text-xs sm:text-sm font-medium">
              ◎ {solBalance === null && publicKey ? <span className="animate-pulse">Loading...</span> : (solBalance !== null && !isNaN(solBalance)) ? parseFloat(solBalance.toString()).toFixed(6) : "-"} SOL
            </span>
          </div>
        </div>
      )}
    </div>
  </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Column - Content */}
            <div className="space-y-8">
              <div className="space-y-4">
                <AnimatedHeroTitle />
                <p className="text-base text-muted-foreground leading-relaxed">
                  Securely and permanently remove tokens from circulation. Reduce supply, increase scarcity, and
                  strengthen your project's tokenomics.
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] flex items-center justify-center flex-shrink-0 mt-1">
                    <Zap className="w-6 h-6 text-[#9945FF]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Instant Burning</h3>
                    <p className="text-muted-foreground">Burn tokens in seconds with a single transaction</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] flex items-center justify-center flex-shrink-0 mt-1">
                    <Shield className="w-6 h-6 text-[#9945FF]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Secure & Safe</h3>
                    <p className="text-muted-foreground">Non-custodial burning directly from your wallet</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] flex items-center justify-center flex-shrink-0 mt-1">
                    <Flame className="w-6 h-6 text-[#9945FF]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">Permanent Removal</h3>
                    <p className="text-muted-foreground">Tokens are permanently removed from circulation</p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
                {connected ? (
                  <button
                    onClick={handleGetStarted}
                    className="group px-8 py-4 rounded-lg bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)] text-background font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-[#9945FF]/20 transition-all duration-300 w-full sm:w-auto justify-center"
                  >
                    Get Started
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    className="group px-8 py-4 rounded-lg bg-[linear-gradient(90deg,#9945FF_0%,#14F195_100%)] text-background font-semibold flex items-center gap-2 hover:shadow-lg hover:shadow-[#9945FF]/20 transition-all duration-300 w-full sm:w-auto justify-center"
                  >
                    Connect Wallet
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
                <a
                  href="https://jup.ag/swap/SOL-DMT"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-8 py-4 rounded-lg border-2 border-[#9945FF] text-[#9945FF] font-semibold flex items-center gap-2 bg-transparent hover:bg-[#9945FF]/90 hover:text-background hover:border-[#9945FF] transition-all duration-200 w-full sm:w-auto justify-center shadow-sm"
                  style={{ minWidth: 140 }}
                >
                  BUY $DEVF
                </a>
                <a
                  href="https://whitepaper.devflation.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-4 rounded-lg border-2 border-[#9945FF] text-[#9945FF] bg-transparent hover:bg-[#9945FF]/90 hover:text-background hover:border-[#9945FF] transition-all duration-200 flex items-center justify-center shadow-sm"
                  style={{ minWidth: 48, minHeight: 48 }}
                  aria-label="Whitepaper"
                  title="Whitepaper"
                >
                  <Book className="w-6 h-6" />
                  <span className="ml-2 text-base font-semibold block sm:hidden">Whitepaper</span>
                </a>
              </div>
            </div>

            {/* Right Column - Visual */}
            <div className="relative h-96 lg:h-full min-h-96">
              <div
                className="absolute inset-0 rounded-2xl backdrop-blur-xl border border-white/10 overflow-hidden"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-6 relative w-full h-full flex flex-col items-center justify-center">
                    {/* Flame particles across the card */}
                    <div className="absolute inset-0 pointer-events-none z-0">
                      {[...Array(8)].map((_, i) => {
                        const angle = Math.random() * 2 * Math.PI;
                        const radius = 80 + Math.random() * 30; // px, lebih jauh dari logo
                        const centerX = 50; // %
                        const centerY = 50; // %
                        const size = 18 + Math.random() * 18;
                        const blur = 4 + Math.random() * 10;
                        const opacity = 0.35 + Math.random() * 0.4;
                        const left = centerX + Math.cos(angle) * (radius / 120) * 50;
                        const top = centerY + Math.sin(angle) * (radius / 120) * 50;
                        return (
                          <div
                            key={i}
                            className="absolute rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] animate-pulse"
                            style={{
                              width: `${size}px`,
                              height: `${size}px`,
                              left: `${left}%`,
                              top: `${top}%`,
                              filter: `blur(${blur}px)`,
                              opacity,
                              animationDuration: `${2 + Math.random() * 2}s`,
                              animationName: 'particle-flame',
                              zIndex: 0,
                            }}
                          />
                        );
                      })}
                      <style>{`
                        @keyframes particle-flame {
                          0% { opacity: 0.7; transform: translateY(0) scale(1); }
                          40% { opacity: 0.5; transform: translateY(-18px) scale(1.1); }
                          60% { opacity: 0.3; transform: translateY(-24px) scale(0.95); }
                          100% { opacity: 0.7; transform: translateY(0) scale(1); }
                        }
                      `}</style>
                    </div>
                    <div className="w-60 h-60 rounded-full bg-gradient-to-br from-[#9945FF]/30 to-[#14F195]/10 flex items-center justify-center mx-auto border border-[#9945FF]/20 animate-pulse overflow-hidden z-10">
                      <img src="/devflation_circle.png" alt="Devflation Logo" className="w-512 h-512 object-contain animate-pulse animate-bounce" style={{ animationDuration: '2.5s' }} />
                    </div>
                    <div className="z-10">
                      {/* Text dihilangkan sesuai permintaan user */}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Official Contract Address Section */}
          <CopyNotificationWrapper />
          <section className="w-full mx-auto mt-12 mb-20 px-0">
            <div
                  className="w-full rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col gap-4 relative overflow-hidden"
                  style={{ background: 'rgba(24,24,27,0.35)' }}
                >
                {/* No shimmer or highlight animation on card background */}
              <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2 relative z-10">Official Contract Address</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 relative z-10">
                <CopyableAddress />
                {/* Mobile: flex-row for buttons, Desktop: only Solscan */}
                <div className="flex flex-row gap-2 w-full sm:w-auto">
                  <a
                    href="https://solscan.io/address/9xQeWvG816bUx9EPfB6p8b6E3bQ1r6Q1Q1Q1Q1"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 rounded-lg bg-[#9945FF] hover:bg-[#14F195] text-background font-semibold text-sm shadow transition h-10 overflow-hidden relative w-full sm:w-auto"
                  >
                    {/* Animated highlight overlay */}
                    <span className="absolute -left-20 top-0 h-full w-24 pointer-events-none card-highlight-anim" style={{ zIndex: 1 }} />
                    <span className="relative flex items-center z-10">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75V6A2.25 2.25 0 0 0 15 3.75h-6A2.25 2.25 0 0 0 6.75 6v12A2.25 2.25 0 0 0 9 20.25h6A2.25 2.25 0 0 0 17.25 18v-.75M15.75 8.25 20.25 3.75m0 0v4.5m0-4.5h-4.5" />
                      </svg>
                      <span className="leading-none ml-1">View on Solscan</span>
                    </span>
                  </a>
                  {/* Mobile only: Buy on pump.fun, same style/size as Solscan */}
                  <a
                    href={logoLinks.pumpfun || "https://pump.fun/"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 rounded-lg bg-[#14F195] text-background font-semibold text-sm shadow transition h-10 overflow-hidden relative w-full sm:w-auto block sm:hidden"
                    style={{ minWidth: 0 }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                       <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75V6A2.25 2.25 0 0 0 15 3.75h-6A2.25 2.25 0 0 0 6.75 6v12A2.25 2.25 0 0 0 9 20.25h6A2.25 2.25 0 0 0 17.25 18v-.75M15.75 8.25 20.25 3.75m0 0v4.5m0-4.5h-4.5" />
                    </svg>
                    <span className="leading-none ml-1">Pump.fun</span>
                  </a>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1 relative z-10">This is the only official contract address. Always double-check before interacting.</p>
              <style>{`
                @keyframes card-highlight {
                  0% { transform: translate3d(-220%, 0, 0); opacity: 0; }
                  25% { transform: translate3d(-40%, -4px, 0); opacity: 0.45; }
                  50% { transform: translate3d(120%, -6px, 0); opacity: 0.75; }
                  75% { transform: translate3d(200%, -2px, 0); opacity: 0.35; }
                  100% { transform: translate3d(320%, 0, 0); opacity: 0; }
                }
                .card-highlight-anim {
                  background: linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0) 100%);
                  filter: blur(12px);
                  will-change: transform, opacity, filter;
                  backface-visibility: hidden;
                  transform: translateZ(0);
                  animation: card-highlight 6s linear infinite;
                  animation-play-state: running;
                }
              `}</style>
            </div>
            
            <div className="w-full flex flex-col gap-4 mt-4">
              <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2 mt-8">
                <svg className="w-7 h-7 text-[#9945FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                Integrated Market
              </h3>
              <p className="text-muted-foreground mb-8 text-base">Integrated with top launchpads and market platforms for seamless token growth.</p>
              <div className="overflow-hidden w-full py-4">
                <div className="marquee-track flex items-center gap-8 whitespace-nowrap">
                  {[
                    'bags.png', 'belive.png', 'bonk.png', 'boop.png', 'heven.png', 'jup.png',
                    'meteora.png', 'moonit.png', 'orca.png', 'pumpfun.png', 'raydium.png',
                  ].map((logo) => {
                    const name = logo.replace('.png', '');
                    const link = logoLinks[name];
                    const img = (
                      <img
                        key={logo}
                        src={`/logo_lauchpad/${logo}`}
                        alt={name}
                        className="logo-marquee-img drop-shadow-lg grayscale hover:grayscale-0 transition-all duration-300 inline-block"
                      />
                    );
                    return link ? (
                      <a key={logo} href={link} target="_blank" rel="noopener noreferrer">{img}</a>
                    ) : img;
                  })}
                  {/* Duplicate for seamless loop */}
                  {[
                    'bags.png', 'belive.png', 'bonk.png', 'boop.png', 'heven.png', 'jup.png',
                    'meteora.png', 'moonit.png', 'orca.png', 'pumpfun.png', 'raydium.png',
                  ].map((logo) => {
                    const name = logo.replace('.png', '');
                    const link = logoLinks[name];
                    const img = (
                      <img
                        key={logo + '-2'}
                        src={`/logo_lauchpad/${logo}`}
                        alt={name}
                        className="logo-marquee-img drop-shadow-lg grayscale hover:grayscale-0 transition-all duration-300 inline-block"
                      />
                    );
                    return link ? (
                      <a key={logo + '-2'} href={link} target="_blank" rel="noopener noreferrer">{img}</a>
                    ) : img;
                  })}
                </div>
                <style>{`
                  .logo-marquee-img {
                    width: 72px;
                    height: 72px;
                    object-fit: contain;
                    display: inline-block;
                  }
                `}</style>
                <style>{`
                  .marquee-track {
                    display: flex;
                    width: max-content;
                    animation: marquee 38s linear infinite;
                  }
                  @keyframes marquee {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                  }
                `}</style>
              </div>

            </div>
          </section>

          {/* CEX Logo Section */}
          <section className="w-full flex flex-col gap-2 mt-0 pt-10" style={{marginTop: '-80px'}}>
            <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <svg className="w-7 h-7 text-[#9945FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Soon Listed CEX
            </h3>
            <p className="text-muted-foreground mb-8 text-base">Centralized exchanges planned for upcoming Devflation listings.</p>
            <div className="overflow-hidden w-full py-2">
              <div className="cex-marquee-track flex items-center gap-8 whitespace-nowrap pl-2 pr-2">
                {[
                  'bitfinex.png', 'bitget.png', 'bitmart.png', 'bybit.png', 'gateio.png',
                  'kraken.png', 'kucoin.png', 'lbank.png', 'mexc.png', 'okx.png',
                ].map((logo, i) => (
                  <img
                    key={logo + '-1'}
                    src={`/exchange/${logo}`}
                    alt={logo.replace('.png', '')}
                    className="cex-logo-marquee-img drop-shadow-lg grayscale hover:grayscale-0 transition-all duration-300 inline-block"
                  />
                ))}
                {[
                  'bitfinex.png', 'bitget.png', 'bitmart.png', 'bybit.png', 'gateio.png',
                  'kraken.png', 'kucoin.png', 'lbank.png', 'mexc.png', 'okx.png',
                ].map((logo, i) => (
                  <img
                    key={logo + '-2'}
                    src={`/exchange/${logo}`}
                    alt={logo.replace('.png', '')}
                    className="cex-logo-marquee-img drop-shadow-lg grayscale hover:grayscale-0 transition-all duration-300 inline-block"
                  />
                ))}
                {[
                  'bitfinex.png', 'bitget.png', 'bitmart.png', 'bybit.png', 'gateio.png',
                  'kraken.png', 'kucoin.png', 'lbank.png', 'mexc.png', 'okx.png',
                ].map((logo, i) => (
                  <img
                    key={logo + '-3'}
                    src={`/exchange/${logo}`}
                    alt={logo.replace('.png', '')}
                    className="cex-logo-marquee-img drop-shadow-lg grayscale hover:grayscale-0 transition-all duration-300 inline-block"
                  />
                ))}
              </div>
              <style>{`
                .cex-logo-marquee-img {
                  width: 72px;
                  height: 72px;
                  object-fit: contain;
                  display: inline-block;
                }
              `}</style>
              <style>{`
                .cex-marquee-track {
                  display: flex;
                  width: max-content;
                  animation: cex-marquee-right 38s linear infinite;
                }
                @keyframes cex-marquee-right {
                  0% { transform: translateX(-50%); }
                  100% { transform: translateX(0); }
                }
              `}</style>
            </div>
          </section>
    {/* How to Use Section */}
  <section className="w-full max-w-7xl mx-auto mt-10 mb-20 pt-10">
      <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
        <HelpCircle className="w-7 h-7 text-[#9945FF]" />
        How to Use
      </h3>
      <p className="text-muted-foreground mb-8 text-base">Follow these simple steps to burn your Solana tokens securely and instantly.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Step 1 */}
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col items-center text-center glass-card-howto" style={{ background: 'rgba(24,24,27,0.35)' }}>
          <div className="w-14 h-14 rounded-full bg-[#9945FF]/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-[#9945FF]" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Connect Wallet</h4>
          <p className="text-muted-foreground text-sm">Connect your Solana wallet (Phantom, Solflare, etc) to get started.</p>
        </div>
        {/* Step 2 */}
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col items-center text-center glass-card-howto" style={{ background: 'rgba(24,24,27,0.35)' }}>
          <div className="w-14 h-14 rounded-full bg-[#9945FF]/10 flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 text-[#9945FF]" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Select Token</h4>
          <p className="text-muted-foreground text-sm">Choose the SPL token you want to burn from your wallet list.</p>
        </div>
        {/* Step 3 */}
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col items-center text-center glass-card-howto" style={{ background: 'rgba(24,24,27,0.35)' }}>
          <div className="w-14 h-14 rounded-full bg-[#9945FF]/10 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-[#9945FF]" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Burn Instantly</h4>
          <p className="text-muted-foreground text-sm">Confirm and burn your tokens in one secure transaction.</p>
        </div>
      </div>
      <style>{`
        .glass-card-howto {
          box-shadow: none;
          border-radius: 1.25rem;
          /* border: none;  HAPUS agar border Tailwind muncul */
          backdrop-filter: blur(18px);
        }
      `}</style>
    </section>

          {/* Roadmap Section */}
  <section className="w-full max-w-7xl mx-auto mt-20 mb-10">
    <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
      <svg className="w-7 h-7 text-[#9945FF]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
      Roadmap
    </h3>
  <p className="text-muted-foreground mb-8 text-base">Development Milestones of Devflation: From Foundation to Ecosystem Expansion</p>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col glass-card-roadmap" style={{ background: 'rgba(24,24,27,0.35)' }}>
        <span className="text-[#9945FF] font-bold text-lg mb-2">Q4 2025 — Foundation Build</span>
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Launch MVP Platform (Manual Burn Feature)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Wallet Connection (Phantom & Solflare)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Basic Burn Dashboard & Analytics</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Telegram Burn Notification Bot</li>
        </ul>
      </div>
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col glass-card-roadmap" style={{ background: 'rgba(24,24,27,0.35)' }}>
        <span className="text-[#9945FF] font-bold text-lg mb-2">Q1 2026 — Automation & CEX Tier 3 Listing</span>
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Auto Burn System (time & fee-based)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>X.com Burn Notification</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Fee Distribution Mechanism (Ops, Pool, Reward)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Listing on Tier 3 CEX</li>
        </ul>
      </div>
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col glass-card-roadmap" style={{ background: 'rgba(24,24,27,0.35)' }}>
        <span className="text-[#9945FF] font-bold text-lg mb-2">Q2 2026 — Utility Expansion & CEX Tier 2–1 Listing</span>
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>VIP Signal System (Premium Analytics)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>API & SDK for Developers</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Community Integration (X / Telegram)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Listing on Tier 2 & Tier 1 CEX</li>
        </ul>
      </div>
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col glass-card-roadmap" style={{ background: 'rgba(24,24,27,0.35)' }}>
        <span className="text-[#9945FF] font-bold text-lg mb-2">Q3 2026 — Cross-Chain Expansion</span>
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Dev Reward Pool v2</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Multi-Chain Support (Base, BNB, Arbitrum)</li>
        </ul>
      </div>
  <div className="rounded-2xl border border-white/20 backdrop-blur-xl shadow-none p-6 flex flex-col glass-card-roadmap" style={{ background: 'rgba(24,24,27,0.35)' }}>
    <style>{`
      .glass-card-roadmap {
        box-shadow: none;
        border-radius: 1.25rem;
        /* border: none;  HAPUS agar border Tailwind muncul */
        backdrop-filter: blur(18px);
      }
    `}</style>
        <span className="text-[#9945FF] font-bold text-lg mb-2">Q4 2026 — Ecosystem Growth</span>
        <ul className="mt-2 space-y-2">
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Launchpad Integration (Magic Eden, PinkSale)</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Devflation Analytics v2 Dashboard</li>
          <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-[#9945FF] mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke="#9945FF" strokeWidth="2" fill="none"/><circle cx="12" cy="12" r="4" fill="none"/></svg>Token Utility Upgrade & Ecosystem Partnerships</li>
        </ul>
      </div>
    </div>
  </section>

  {/* Partnership Section */}

  <PartnershipSection />
  <CallToActionSection />
        </main>
      </div>
      {/* Footer */}
      <footer className="w-full border-t border-border/30 bg-background/80 backdrop-blur-xl py-8 mt-4 relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center sm:justify-between gap-2">
          {/* Mobile: center logo and stack text, Desktop: horizontal */}
          <div className="flex flex-col items-center w-full sm:w-auto">
            <img src="/devflation.png" alt="Devflation Logo" className="h-8 w-auto mb-1 sm:mb-0" />
            <span className="text-muted-foreground text-sm text-center block sm:hidden">© 2025 Devflation. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4 mb-2 sm:mb-0">
            <a href="https://x.com/Devflation" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline text-sm">X.com</a>
            <a href="https://github.com/users/0xBitWishper/projects/3/views/1" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline text-sm">GitHub</a>
            <a href="https://t.me/devflation" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline text-sm">Telegram</a>
            <a href="https://discord.gg/3s5RjJk3jS" target="_blank" rel="noopener noreferrer" className="text-[#9945FF] hover:underline text-sm">Discord</a>
          </div>
          <span className="text-muted-foreground text-sm text-center hidden sm:block">© 2025 Devflation. All rights reserved.</span>
        </div>
      </footer>
    </div>
  )
}
