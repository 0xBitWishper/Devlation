"use client"

import { CheckCircle2, ExternalLink, Share2 } from "lucide-react"
import { useEffect, useState } from "react"
import { shareOnX } from "./share-canvas"

interface SuccessScreenProps {
  onBackToDashboard: () => void
}

export function SuccessScreen({ onBackToDashboard }: SuccessScreenProps) {
  const [showConfetti, setShowConfetti] = useState(true)
  const [isSharing, setIsSharing] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowConfetti(false), 3000)
    return () => clearTimeout(timer)
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center p-4">
      {/* Confetti particles */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-accent rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-10px`,
                animation: `fall ${2 + Math.random() * 1}s linear forwards`,
                opacity: Math.random() * 0.7 + 0.3,
              }}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fall {
          to {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }
      `}</style>

      <div
        className="w-full max-w-md rounded-xl backdrop-blur-xl border border-white/10 border-border/40 p-8 space-y-6 text-center shadow-2xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      >
        {/* Check Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-green-500/15 flex items-center justify-center border border-green-500/30">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        {/* Headline */}
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">Burn Submitted</h1>
          <p className="text-sm text-muted-foreground font-medium">Transaction submitted to Solana network</p>
        </div>

        {/* Transaction Details */}
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-card/30 border border-border/40">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Transaction Signature</p>
            <p className="text-xs font-mono text-foreground break-all">
              5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB
            </p>
          </div>

          <div className="p-4 rounded-lg bg-card/30 border border-border/40">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Activity</p>
            <p className="text-sm font-semibold text-foreground">Burned 100 WIF</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 pt-2">
          <button className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-accent to-accent/80 text-accent-foreground font-semibold hover:from-accent/90 hover:to-accent/70 smooth-transition shadow-lg shadow-accent/20 flex items-center justify-center gap-2">
            <ExternalLink className="w-4 h-4" />
            View on Explorer
          </button>

          <button
            onClick={handleShareOnX}
            disabled={isSharing}
            className="w-full py-3 px-4 rounded-lg bg-black text-white font-semibold hover:bg-gray-900 smooth-transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Share2 className="w-4 h-4" />
            {isSharing ? "Generating..." : "Share on X"}
          </button>

          <button
            onClick={onBackToDashboard}
            className="w-full py-3 px-4 rounded-lg border border-border/40 text-foreground font-semibold hover:bg-card/50 smooth-transition"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
