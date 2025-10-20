"use client"

import { useState } from "react"
import { ArrowLeft, Calendar, Flame, ExternalLink } from "lucide-react"

interface BurnRecord {
  id: string
  tokenSymbol: string
  tokenName: string
  amount: number
  txSignature: string
  timestamp: number
  icon: string
  status?: string
}

interface BurnHistoryProps {
  records: BurnRecord[]
  onBack: () => void
}

export function BurnHistory({ records, onBack }: BurnHistoryProps) {
  const [copied, setCopied] = useState<string | null>(null);

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
    if (!sig) return '-';
    return `${sig.slice(0, 6)}...${sig.slice(-6)}`
  }

  const copy = async (val: string) => {
    try {
      await navigator.clipboard.writeText(val);
      setCopied(val);
      setTimeout(() => setCopied((c) => (c === val ? null : c)), 2000);
    } catch (e) {}
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
                  <img src="/devflation_logo.png" alt="Devflation Logo" className="w-8 h-8 object-contain" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-foreground tracking-tight">Burn Tokens</h1>
                  <p className="text-xs text-muted-foreground">View all your token burns</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{records.length}</p>
              <p className="text-xs text-muted-foreground">Total Burns</p>
            </div>
          </div>
        </header>


      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {records.length === 0 ? (
          <div
            className="rounded-xl backdrop-blur-xl border border-white/10 border-border/40 p-12 text-center"
            style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
          >
            <div className="text-5xl mb-4 opacity-60">🔥</div>
            <p className="text-muted-foreground font-medium mb-2">No burn tokens yet</p>
            <p className="text-sm text-muted-foreground">Start burning tokens to see them here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="rounded-lg backdrop-blur-xl border border-white/10 border-border/40 p-4 hover:bg-card/30 smooth-transition"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Token Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-xl border border-accent/20 overflow-hidden">
                      {record.icon && (typeof record.icon === 'string') && (record.icon.startsWith('http') || record.icon.startsWith('data:')) ? (
                        // render as image when icon is a URL or data URI
                        <img src={record.icon} alt={record.tokenSymbol || 'icon'} title={record.tokenSymbol ?? ''} loading="lazy" className="w-full h-full object-contain" />
                      ) : (
                        // fallback: render raw text (emoji or short label)
                        <div className="text-lg font-semibold">{record.icon ?? record.tokenSymbol?.[0] ?? '🔸'}</div>
                      )}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p title={record.tokenSymbol} className="font-semibold text-foreground truncate max-w-[60%]">{record.tokenSymbol}</p>
                        <span title={record.tokenName} className="text-xs text-muted-foreground truncate max-w-[40%]">({record.tokenName})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span className="truncate">{formatDate(record.timestamp)}</span>
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="w-28 text-right flex-shrink-0">
                      <p className="font-semibold text-foreground">{record.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{record.tokenSymbol}</p>
                    </div>

                    {/* Placeholder to keep spacing */}
                    
                    <div style={{ width: 8 }} />

                    {/* TX/Status Column moved to right */}
                    <div className="hidden sm:flex flex-col items-end gap-2 w-56 flex-shrink-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold ${record.status === 'confirmed' ? 'text-green-400' : record.status === 'failed' ? 'text-red-400' : 'text-yellow-300'}`}>{(record.status || 'pending').toUpperCase()}</span>
                                </div>
                                <div className="flex items-center gap-2">
                          <p title={record.txSignature} className="font-mono text-xs text-accent mb-0">{formatTxSignature(record.txSignature)}</p>
                          <button onClick={() => copy(record.txSignature)} className="text-xs px-2 py-1 rounded bg-[#9945FF]/10 hover:bg-[#9945FF]/20 transition text-[#9945FF]">
                            {copied === record.txSignature ? 'Copied' : 'Copy'}
                          </button>
                          <a href={`https://solscan.io/tx/${record.txSignature}`} target="_blank" rel="noreferrer" className="text-xs text-muted-foreground hover:text-foreground smooth-transition flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                          </a>
                                </div>
                              </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
