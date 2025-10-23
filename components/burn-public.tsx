"use client"


import { BurnRecord } from "../types/burn"

interface BurnHistoryProps {
  records: BurnRecord[]
  onBack: () => void
}

export function BurnHistory({ records, onBack }: BurnHistoryProps) {
  const [search, setSearch] = useState("");

  const filteredRecords = records.filter(
    (r) => {
      const q = search.toLowerCase();
      return (
        r.tokenSymbol.toLowerCase().includes(q) ||
        r.tokenName.toLowerCase().includes(q) ||
        (r.mint && r.mint.toLowerCase().includes(q))
      );
    }
  );

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95">
      {/* Header */}
      <header className="backdrop-blur-xl sticky top-0 z-40 bg-background/80">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left: Logo & Title */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button onClick={onBack} className="p-2 hover:bg-card/50 rounded-lg smooth-transition">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center border border-accent/20 overflow-hidden">
                <img src="/devflation_logo.png" alt="Devflation Logo" className="w-8 h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground tracking-tight">Blok</h1>
                <p className="text-xs text-muted-foreground">View all your token burns</p>
              </div>
            </div>
          </div>
          {/* Right: Search and total burns */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto md:justify-end mt-3 md:mt-0">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search token..."
              className="px-3 py-2 rounded-lg border border-border bg-background/60 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-[#9945FF] transition w-full sm:w-64"
              style={{ minWidth: 0 }}
            />
            <div className="text-right sm:ml-4">
              <p className="text-sm font-semibold text-foreground">{filteredRecords.length}</p>
              <p className="text-xs text-muted-foreground">Total Burns</p>
            </div>
          </div>
        </div>
      </header>

      {/* Fees Pool Progress Bar - Keterangan di bawah header */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="w-full flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground tracking-wide">Fees Pool</span>
            <span className="text-sm font-bold text-[#9945FF]">0.43 / 1 SOL</span>
          </div>
            <p className="text-xs text-muted-foreground leading-relaxed mt-0">
              <span className="font-medium text-foreground">Fees</span> will be used to <span className="font-semibold text-[#9945FF]">buy</span>, then <span className="font-semibold text-[#14F195]">burn</span> the <span className="font-bold text-[#9945FF]">$DFT</span> token.
            </p>
          <div className="w-full bg-border/60 rounded-xl shadow-inner h-4 flex items-center overflow-hidden border border-border/30 mt-1 relative">
            {/* Progress fill */}
            <div className="h-full bg-gradient-to-r from-[#9945FF] to-[#14F195] rounded-xl transition-all duration-500" style={{ width: '40%' }} />
            {/* Animated light effect */}
            <div className="absolute left-0 top-0 h-full" style={{ width: '40%' }}>
              <div className="h-full w-16 bg-gradient-to-r from-transparent via-[#14F195]/60 to-transparent opacity-80 animate-[moveLight_2s_linear_infinite] rounded-xl" />
            </div>
            <style jsx>{`
              @keyframes moveLight {
                0% { left: 0; }
                100% { left: calc(100% - 4rem); }
              }
              .animate-\[moveLight_2s_linear_infinite\] {
                position: absolute;
                left: 0;
                top: 0;
                animation: moveLight 2s linear infinite;
              }
            `}</style>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {filteredRecords.length === 0 ? (
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
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-lg backdrop-blur-xl border border-white/10 border-border/40 p-4 hover:bg-card/30 smooth-transition"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Token Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-xl border border-accent/20">
                      {record.icon}
                    </div>

                    {/* Token Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-foreground">{record.tokenSymbol}</p>
                        <span className="text-xs text-muted-foreground">({record.tokenName})</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(record.timestamp)}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{record.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">{record.tokenSymbol}</p>
                    </div>

                    {/* TX Signature */}
                    <div className="text-right hidden sm:block">
                      <p className="font-mono text-xs text-accent mb-1">{formatTxSignature(record.txSignature)}</p>
                      <button className="text-xs text-muted-foreground hover:text-foreground smooth-transition flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        View
                      </button>
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
