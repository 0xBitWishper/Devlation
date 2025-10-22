"use client"

import { CheckCircle2, ExternalLink, Share2 } from "lucide-react"
import QRCode from "qrcode.react"
import { useEffect, useState } from "react"
import { shareOnX } from "./share-canvas"

interface SuccessScreenProps {
  onBackToDashboard: () => void
}

export function SuccessScreen({ onBackToDashboard }: SuccessScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [isSharing, setIsSharing] = useState(false)
  const [burnInfo, setBurnInfo] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)
  const saveCanvasImage = async () => {
    setIsSaving(true);
    try {
      // Asumsikan ada canvas dengan id 'burn-canvas' (atau ganti sesuai implementasi)
      const canvas = document.getElementById('burn-canvas') as HTMLCanvasElement;
      if (canvas) {
        const link = document.createElement('a');
        link.download = 'burn-certificate.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        alert('Gambar tidak ditemukan.');
      }
    } catch (e) {
      alert('Gagal menyimpan gambar.');
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('devlation.lastBurn');
      if (raw) setBurnInfo(JSON.parse(raw));
    } catch (e) {}
  }, [])

  const handleShareOnX = async () => {
    setIsSharing(true)
    try {
      await shareOnX("WIF", "100", "5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB")
    } catch (error) {
      console.error("Error sharing on X:", error)
    } finally {
      setIsSharing(false)
    }
  }

  return (
  <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#09090f]">
    {/* Animated glowing circles background */}
    <div className="pointer-events-none absolute inset-0 z-0">
  {/* Ungu besar tengah overlap card */}
  <div className="absolute left-1/2 top-[52%] -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-[#9945FF]/15 rounded-full blur-[140px] animate-pulse-slow" style={{animationDelay:'0.5s', opacity:0.32, zIndex:2}} />
  {/* Hijau besar kanan atas */}
  <div className="absolute right-[6%] top-[8%] w-[420px] h-[420px] bg-[#14F195]/18 rounded-full blur-3xl animate-pulse-slow" style={{animationDelay:'0s', opacity:0.42}} />
  {/* Ungu sedang kiri bawah */}
  <div className="absolute left-[8%] bottom-[12%] w-[360px] h-[360px] bg-[#9945FF]/20 rounded-full blur-2xl animate-pulse-slow" style={{animationDelay:'1.7s', opacity:0.38}} />
  {/* Hijau kecil kanan bawah overlap card */}
  <div className="absolute right-[18%] bottom-[8%] w-[180px] h-[180px] bg-[#14F195]/22 rounded-full blur-xl animate-pulse-slow" style={{animationDelay:'2.2s', opacity:0.55, zIndex:3}} />
    </div>
      {/* Card Popup Centered */}
  <div className="w-full max-w-2xl flex flex-col items-center justify-center z-10">
  <div className="relative w-full rounded-lg shadow-2xl flex flex-col items-center justify-center border border-white/80" style={{ aspectRatio: '2/1', maxWidth: 700, minHeight: 380 }}>
          {/* Card background image di paling bawah, fill penuh */}
          <img src="/certificate/certificate.png" alt="Certificate Background" className="absolute inset-0 w-full h-full object-cover z-0" />
      {/* Card Content */}
      <div className="absolute inset-0 flex flex-col h-full w-full z-10">
            {/* Header: Verified Burn Certificate */}
            <div className="flex items-center justify-between px-6 pt-8 pb-2">
              <div className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg ml-4" style={{background: 'linear-gradient(135deg, #14F195 0%, #9945FF 100%)'}}>
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                      <linearGradient id="solanaCircle" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                        <stop stopColor="#14F195"/>
                        <stop offset="1" stopColor="#9945FF"/>
                      </linearGradient>
                      <filter id="shadow" x="-2" y="-2" width="32" height="32" filterUnits="userSpaceOnUse">
                        <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.18"/>
                      </filter>
                    </defs>
                    <circle cx="14" cy="14" r="13" fill="url(#solanaCircle)" filter="url(#shadow)"/>
                    <path d="M8 14.5L12.5 19L20 11" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </span>
                <div className="text-left ml-0.5">
                  <div className="text-lg font-extrabold text-white leading-tight mb-0.5">Verified Burn Certificate</div>
                  <div className="text-xs text-white/80 font-medium -mt-1">These tokens are permanently removed from circulation</div>
                </div>
              </div>
              <img src="/devflation.png" alt="Devflation" className="h-7 w-auto ml-auto mr-6" />
            </div>
            {/* Main Content Row */}
            <div className="flex flex-1 flex-row items-center w-full px-6 pb-2 pt-1 relative">
              {/* Token logo + symbol */}
              <div className="flex flex-col items-center justify-center flex-shrink-0" style={{ minWidth: 120 }}>
                <div className="w-40 h-40 rounded-3xl overflow-hidden bg-white/10 flex items-center justify-center border border-white/10 ml-3 -mt-4">
                  <img src={burnInfo?.logoUrl ? burnInfo.logoUrl : "/token/pupup.png"} alt={burnInfo?.symbol || "Token"} className="w-full h-full object-cover" />
                </div>
                <div className="mt-2 text-lg font-bold text-white tracking-wide">{burnInfo?.symbol ? `$${burnInfo.symbol}` : "$TOKEN"}</div>
              </div>
              {/* Center: Burn Success, nominal, date (vertical like sample) */}
              <div className="flex-1 flex flex-col items-start justify-center text-left">
                <div className="mt-[-44px] mb-0.5 ml-16">
                  <div className="text-5xl font-extrabold text-white leading-tight whitespace-nowrap mt-[-5px]">Burn Success</div>
                    <div className="text-4xl font-mono text-white leading-tight mb-1 mt-1">{burnInfo?.amount ? burnInfo.amount.toLocaleString("en-US") : "1.000.000"}</div>
                  <div className="text-base text-white/80 mb-1">Date {burnInfo?.date || new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                </div>
              </div>
              {/* QR code kanan bawah */}
              <div className="flex flex-col items-end justify-end flex-shrink-0 w-28 h-full relative">
                <div className="absolute bottom-5 right-9 flex items-center justify-center bg-white rounded-sm p-1.5" style={{ width: 66, height: 66 }}>
                  {burnInfo?.txid ? (
                    <QRCode
                      value={`https://solscan.io/tx/${burnInfo.txid}`}
                      size={56}
                      bgColor="#fff"
                      fgColor="#000"
                      level="M"
                      includeMargin={false}
                    />
                  ) : (
                    <div className="w-12 h-12 bg-white/20 rounded flex items-center justify-center text-xs text-white/60">QR</div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Txn sekarang di dalam card, pojok kiri bawah */}
          <div className="absolute left-0 bottom-2 mb-5 ml-9 text-[9px] text-white font-mono truncate text-left z-20">Txn : {burnInfo?.txid ?? "—"}</div>
        </div>
  {/* Buttons di bawah card */}
  <div className="w-full flex flex-row gap-4 mt-8 justify-center">
          <a href={`https://solscan.io/tx/${burnInfo?.txid}`} target="_blank" rel="noreferrer" className="flex-1 py-3 rounded-lg bg-[#9945FF] text-white font-semibold text-base shadow hover:bg-[#9945FF]/90 transition-all flex items-center justify-center">
            View on SolScan
          </a>
          <button
            onClick={handleShareOnX}
            disabled={isSharing}
            className="flex-1 py-3 rounded-lg border border-white/30 text-white font-semibold text-base bg-transparent hover:bg-white/10 transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Share on X
          </button>
        </div>
        {/* Tombol sejajar: Back to Dashboard & Save Image */}
  <div className="w-full flex flex-row gap-4 mt-8 justify-center">
          <button
            onClick={onBackToDashboard}
            className="flex-1 py-3 rounded-lg border border-white/30 text-white font-semibold text-base bg-transparent hover:bg-white/10 transition-all"
          >
            Back to Dashboard
          </button>
          <button
            onClick={saveCanvasImage}
            disabled={isSaving}
            className="flex-1 py-3 rounded-lg border border-white/30 text-white font-semibold text-base bg-transparent hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Image'}
          </button>
        </div>
      </div>
    </div>
  )
}
