"use client"

import { Flame, Zap, Shield, ArrowRight, Copy as CopyIcon, HelpCircle } from "lucide-react"
import { Download } from "lucide-react"
import { useState as useReactState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"
import LogoSlider from "./logo-slider"
import { useEffect, useState } from "react"
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
    <div className="flex-1 flex items-center gap-2 bg-background/70 border border-border/40 rounded-lg px-3 py-2">
  <span className="font-mono text-xs sm:text-sm text-[#9945FF] break-all select-all">
        {address}
      </span>
      <button
  className="ml-2 p-2 rounded hover:bg-[#9945FF]/20 text-[#9945FF] transition flex items-center justify-center"
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
        try {
          const res = await fetch(`/api/solana-balance?publicKey=${publicKey.toBase58()}`);
          const data = await res.json();
          if (!cancelled) {
            if (data.sol !== undefined) setSolBalance(data.sol);
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
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 overflow-hidden flex flex-col">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
  <div className="absolute top-20 right-10 w-72 h-72 bg-[#9945FF]/10 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-[#14F195]/10 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

  <div className="relative z-10 flex-1">
        {/* Header */}
        <header className="border-b border-border/40 backdrop-blur-xl bg-background/80">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
          <div className="h-16 flex items-center justify-center">
            <img src="/devlation.png" alt="Devlation Logo" className="h-10 w-auto max-w-xs object-contain" />
          </div>
            </div>
            {connected && (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg backdrop-blur-xl border border-white/10" style={{ backgroundColor: "rgba(255, 255, 255, 0.03)" }}>
                <span className="text-xs text-muted-foreground font-medium">Connected:</span>
                <span className="font-mono text-sm text-[#9945FF] font-semibold">
                  {publicKey ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}` : "-"}
                </span>
                <span className="text-xs text-muted-foreground">|</span>
                <span className="text-sm font-medium">
                  ◎ {solBalance === null && publicKey ? <span className="animate-pulse">Loading...</span> : (solBalance !== null && !isNaN(solBalance)) ? parseFloat(solBalance.toString()).toFixed(6) : "-"} SOL
                </span>
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
                <h2 className="text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                  Burn Your Solana Tokens
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
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
                  className="px-8 py-4 rounded-lg border-2 border-accent text-accent font-semibold flex items-center gap-2 bg-transparent hover:bg-accent/90 hover:text-background hover:border-accent transition-all duration-200 w-full sm:w-auto justify-center shadow-sm"
                  style={{ minWidth: 140 }}
                >
                  BUY $DMT
                </a>
                <a
                  href="/docs/project-docs.pdf"
                  download
                  className="px-4 py-4 rounded-lg border-2 border-accent text-accent bg-transparent hover:bg-accent/90 hover:text-background hover:border-accent transition-all duration-200 flex items-center justify-center shadow-sm"
                  style={{ minWidth: 48, minHeight: 48 }}
                  aria-label="Download Docs PDF"
                  title="Download Docs PDF"
                >
                  <Download className="w-6 h-6" />
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
                    {/* Partikel api di seluruh card */}
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
                            className="absolute rounded-full bg-gradient-to-br from-orange-500 to-yellow-300 animate-pulse"
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
                    <div className="w-60 h-60 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 flex items-center justify-center mx-auto border border-accent/20 animate-pulse overflow-hidden z-10">
                      <img src="/devlation_circle.png" alt="Devlation Logo" className="w-512 h-512 object-contain animate-pulse animate-bounce" style={{ animationDuration: '2.5s' }} />
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
            <div className="w-full rounded-2xl border border-accent/20 bg-card/60 backdrop-blur-xl shadow-lg p-6 flex flex-col gap-4">
              <h3 className="text-lg font-bold text-foreground mb-1">Official Contract Address</h3>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <CopyableAddress />
                <a
                  href="https://solscan.io/address/9xQeWvG816bUx9EPfB6p8b6E3bQ1r6Q1Q1Q1Q1Q1Q1Q1"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-accent/90 hover:bg-accent text-background font-semibold text-xs shadow transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75V6A2.25 2.25 0 0 0 15 3.75h-6A2.25 2.25 0 0 0 6.75 6v12A2.25 2.25 0 0 0 9 20.25h6A2.25 2.25 0 0 0 17.25 18v-.75M15.75 8.25 20.25 3.75m0 0v4.5m0-4.5h-4.5" />
                  </svg>
                  View on Solscan
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-1">This is the only official contract address. Always double-check before interacting.</p>
            </div>
            <div className="w-full rounded-2xl bg-card/60 backdrop-blur-xl shadow-lg p-6 flex flex-col gap-4 mt-4">
              <div className="-mx-6">
                <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                  <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Integrated Market
                </h3>
                <p className="text-muted-foreground mb-8 text-base">Integrated with top launchpads and market platforms for seamless token growth.</p>
              </div>
              <LogoSlider />
            </div>
          </section>


          {/* Roadmap Section */}
  <section className="w-full max-w-7xl mx-auto mt-20 mb-10">
            <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <svg className="w-7 h-7 text-accent" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              Roadmap
            </h3>
            <p className="text-muted-foreground mb-8 text-base">Clear milestones from foundation to expansion. Timelines are estimates and may evolve as we ship.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Phase 1 */}
              <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col min-h-[220px]">
                <div className="flex items-center mb-1">
                  <span className="text-accent font-bold text-base">Phase 1</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-accent font-bold text-base">October</span>
                    <span className="text-accent font-bold text-base">2025</span>
                  </span>
                </div>
                <span className="text-muted-foreground text-xs mb-2 block">Foundation Build</span>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Frontend Development (Next.js + Tailwind)</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Wallet Connection (Connect Wallet UI)</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Phantom SDK Integration</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Solflare SDK Integration</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Basic Burn Feature — Manual Burn Tokens</li>
                </ul>
              </div>
              {/* Phase 2 */}
              <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col min-h-[220px]">
                <div className="flex items-center mb-1">
                  <span className="text-accent font-bold text-base">Phase 2</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-accent font-bold text-base">November</span>
                    <span className="text-accent font-bold text-base">2025</span>
                  </span>
                </div>
                <span className="text-muted-foreground text-xs mb-2 block">Automation &amp; Notifications</span>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Advanced Burn Tokens (price-based condition)</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Auto Burn Tokens (time/fee-based system)</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Telegram Notification Bot for burn alerts</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Fee Distribution Mechanism (Ops Dev, Burn Pool, Reward)</li>
                </ul>
              </div>
              {/* Phase 3 */}
              <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col min-h-[220px]">
                <div className="flex items-center mb-1">
                  <span className="text-accent font-bold text-base">Phase 3</span>
                  <span className="ml-auto flex items-center gap-2">
                    <span className="text-accent font-bold text-base">December</span>
                    <span className="text-accent font-bold text-base">2025</span>
                  </span>
                </div>
                <span className="text-muted-foreground text-xs mb-2 block">Expansion &amp; Utility Layer</span>
                <ul className="mt-2 space-y-2">
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>VIP Signal System (premium analytics &amp; dev insights)</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Community integration with X / Telegram</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>API For Develeopers</li>
                  <li className="flex items-start gap-2 text-foreground"><svg className="w-5 h-5 text-accent mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>Further ecosystem utilities</li>
                </ul>
              </div>
            </div>
          </section>
  
    {/* How to Use Section */}
    <section className="w-full max-w-7xl mx-auto mt-10 mb-20">
      <h3 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
        <HelpCircle className="w-7 h-7 text-accent" />
        How to Use
      </h3>
      <p className="text-muted-foreground mb-8 text-base">Follow these simple steps to burn your Solana tokens securely and instantly.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Step 1 */}
        <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-accent" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Connect Wallet</h4>
          <p className="text-muted-foreground text-sm">Connect your Solana wallet (Phantom, Solflare, etc) to get started.</p>
        </div>
        {/* Step 2 */}
        <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Flame className="w-8 h-8 text-accent" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Select Token</h4>
          <p className="text-muted-foreground text-sm">Choose the SPL token you want to burn from your wallet list.</p>
        </div>
        {/* Step 3 */}
        <div className="rounded-2xl border border-border bg-background/80 p-6 shadow flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <Zap className="w-8 h-8 text-accent" />
          </div>
          <h4 className="font-semibold text-lg text-foreground mb-2">Burn Instantly</h4>
          <p className="text-muted-foreground text-sm">Confirm and burn your tokens in one secure transaction.</p>
        </div>
      </div>
    </section>
        </main>
      </div>
      {/* Footer */}
      <footer className="w-full border-t border-border/30 bg-background/80 backdrop-blur-xl py-8 mt-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <img src="/devlation.png" alt="Devlation Logo" className="h-6 w-auto" />
            <span>© {new Date().getFullYear()} Devlation. All rights reserved.</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="https://twitter.com/devlation" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">X.com</a>
            <a href="https://github.com/devlation" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">GitHub</a>
            <a href="https://x.com/devlation" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">X Community</a>
            <a href="https://t.me/devlation" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">Telegram</a>
            <a href="https://discord.gg/devlation" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-sm">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
