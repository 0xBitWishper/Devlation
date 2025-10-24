"use client"

// Reward page main component
// dummyRecords timestamps are generated client-side to avoid SSR/CSR hydration mismatches
const dummyRecordsBase = [
  {
    id: "1",
    tokenSymbol: "SOL",
    tokenName: "Solana",
    amount: 100,
    txSignature: "5f8d2a1b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z",
    ageMs: 24 * 60 * 60 * 1000, // 24h ago
    icon: "🟣"
  },
  {
    id: "2",
    tokenSymbol: "USDC",
    tokenName: "USD Coin",
    amount: 250,
    txSignature: "1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3w4x5y6z7a8b",
    ageMs: 12 * 60 * 60 * 1000, // 12h ago
    icon: "💵"
  },
  {
    id: "3",
    tokenSymbol: "BONK",
    tokenName: "Bonk",
    amount: 5000,
    txSignature: "9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2i1h0g9f8e7d6c5b4a3z2y",
    ageMs: 6 * 60 * 60 * 1000, // 6h ago
    icon: "🐶"
  }
]

import { ArrowLeft, Calendar, Flame, ExternalLink, Gift } from "lucide-react"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "./ui/dialog"
import { useIsMobile } from "./ui/use-mobile"

interface RewardRecord {
  id: string
  tokenSymbol: string
  tokenName: string
  amount: number
  txSignature: string
  timestamp: number
  icon: string
}

interface RewardProps {
  records?: RewardRecord[];
  onBack: () => void;
}


export function RewardPage({ records, onBack }: RewardProps) {
  const isMobile = useIsMobile();
  // compute client-side records (timestamps) to avoid SSR mismatches
  const [clientRecords, setClientRecords] = useState<RewardRecord[] | null>(null);
  const [open, setOpen] = useState(false)
  const [isWinner, setIsWinner] = useState(false)
  const [claimed, setClaimed] = useState(false)
  // Use dummyRecords if records not provided; build timestamps on client
  useEffect(() => {
    if (!records) {
      const now = Date.now();
      const built = dummyRecordsBase.map((d) => ({
        id: d.id,
        tokenSymbol: d.tokenSymbol,
        tokenName: d.tokenName,
        amount: d.amount,
        txSignature: d.txSignature,
        timestamp: now - (d.ageMs ?? 0),
        icon: d.icon,
      }));
      setClientRecords(built);
    } else {
      setClientRecords(records);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records]);
  // Filter only records from last 24 hours
  const now = Date.now();
  const effectiveRecords = clientRecords ?? [];
  let recentRecords = effectiveRecords.filter((r) => now - r.timestamp <= 24 * 60 * 60 * 1000);
  // If no recent records, show one dummy fallback
  if (recentRecords.length === 0) {
    recentRecords = [
      {
        id: "fallback",
        tokenSymbol: "SOL",
        tokenName: "Solana",
        amount: 10,
        txSignature: "dummyfallbacktx",
        timestamp: now,
        icon: "🟣"
      }
    ];
  }
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatTxSignature = (sig: string) => {
    return `${sig.slice(0, 8)}...${sig.slice(-8)}`
  }

  const totalCount = (clientRecords ?? records ?? []).length;

  const handleClaim = () => {
    // 30% chance to win
    const win = Math.random() < 0.3
    setIsWinner(win)
    setOpen(true)
    setClaimed(true)
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="backdrop-blur-xl sticky top-0 z-40 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={onBack} className="p-2 hover:bg-card/50 rounded-lg smooth-transition">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-accent/20 overflow-hidden">
                <img src="/devflation_logo.png" alt="Devlation Logo" className="w-8 h-8 object-contain" />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Reward</h1>
                  <p className="text-xs text-muted-foreground">Claim your dev loyalty reward</p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{totalCount}</p>
            <p className="text-xs text-muted-foreground">Total Rewards</p>
          </div>
        </div>
      </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <button
          className={`w-full rounded-xl border-none py-1.5 px-3 mb-6 text-center font-bold shadow-lg smooth-transition flex items-center justify-center gap-2 relative overflow-hidden
            ${claimed ? 'bg-gray-400 text-white opacity-60 cursor-not-allowed' : 'bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:opacity-90'}`}
          onClick={!claimed ? handleClaim : undefined}
          disabled={claimed}
        >
          {claimed ? (
            <span className="flex items-center gap-2">
              Claimed
            </span>
          ) : (
            <>
              Claim Your Reward
              {/* Animated light effect when not yet claimed */}
              <span className="absolute left-0 top-0 h-full w-full pointer-events-none">
                <span className="block h-full w-20 bg-gradient-to-r from-transparent via-white/60 to-transparent opacity-70 animate-[moveLightBtn_2s_linear_infinite] rounded-xl" />
              </span>
              <style jsx>{`
                @keyframes moveLightBtn {
                  0% { left: 0; }
                  100% { left: calc(100% - 5rem); }
                }
                .animate-\[moveLightBtn_2s_linear_infinite\] {
                  position: absolute;
                  left: 0;
                  top: 0;
                  animation: moveLightBtn 2s linear infinite;
                }
              `}</style>
            </>
          )}
        </button>
        {/* Reward History Section */}
  <div className="mt-0">
          <h2 className="text-base font-bold mb-1 text-foreground">Reward History</h2>
          <p className="text-xs text-muted-foreground mb-3">See your reward claim activity below</p>
          {/* Reward History Card Data Hidden Temporarily */}
          {/*
          <div className="grid gap-3">
            <div className="flex items-center px-4 pb-2 pt-1">
              <div className="w-1/3 text-xs text-muted-foreground font-semibold">Date</div>
              <div className="w-1/3 text-xs text-muted-foreground font-semibold text-center">Amount</div>
              <div className="w-1/3 text-xs text-muted-foreground font-semibold text-right">Status</div>
            </div>
            <div className="flex items-center border border-[#9945FF] rounded-lg px-4 py-2 bg-background/80">
              <div className="w-1/3 text-xs font-normal text-muted-foreground">20 Oct 2025</div>
              <div className="w-1/3 text-center text-xs font-normal">-</div>
              <div className="w-1/3 text-right text-xs font-normal text-green-500">Claimed</div>
            </div>
            <div className="flex items-center border border-[#14F195] rounded-lg px-4 py-2 bg-background/80">
              <div className="w-1/3 text-xs font-normal text-muted-foreground">21 Oct 2025</div>
              <div className="w-1/3 text-center text-xs font-normal">0.1 SOL</div>
              <div className="w-1/3 text-right text-xs font-normal text-green-500">Claimed</div>
            </div>
          </div>
          */}
        </div>
      </main>
      
      {/* Popup Dialog Reward */}
      <Dialog open={open} onOpenChange={setOpen}>
  <DialogContent showCloseButton className={isMobile ? "fixed bottom-0 left-0 right-0 w-full max-w-lg mx-auto rounded-t-2xl animate-[slideUp_0.3s_ease] h-[80vh] max-h-[95vh] min-h-[60vh]" : undefined}>
          {isMobile && (
            <style jsx>{`
              @keyframes slideUp {
                0% { transform: translateY(100%); }
                100% { transform: translateY(0); }
              }
              .animate-\[slideUp_0.3s_ease\] {
                animation: slideUp 0.3s ease;
              }
            `}</style>
          )}
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2 text-2xl font-bold">
              {isWinner ? <Gift className="w-8 h-8 text-[#14F195] animate-bounce" /> : <Flame className="w-8 h-8 text-[#9945FF] animate-pulse" />}
              {isWinner ? "Congratulations!" : "Not Lucky Yet"}
            </DialogTitle>
            <DialogDescription className="text-center text-lg mt-2">
              {isWinner ? (
                <>
                  You have won <span className="font-bold text-[#14F195]">0.1 SOL</span> 🎉<br />
                  <button className="mt-4 px-6 py-2 rounded-lg bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white font-bold shadow-lg hover:opacity-90 smooth-transition">Claim Now</button>
                </>
              ) : (
                <>
                  <span className="text-sm">Any developer who burns tokens has a chance to win this reward.</span><br />
                  <span className="text-sm">Try again after burning tokens!</span><br />
                  <span className="text-xs text-muted-foreground">Try again tomorrow.</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  )
}
