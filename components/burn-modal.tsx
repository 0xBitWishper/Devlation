"use client"

import { useState } from "react"
import { X } from "lucide-react"

interface BurnModalProps {
  token: any
  onConfirm: (amount: number) => void
  onCancel: () => void
}

export function BurnModal({ token, onConfirm, onCancel }: BurnModalProps) {
  const [amount, setAmount] = useState("")
  const [isChecked, setIsChecked] = useState(false)
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = () => {
    if (amount && isChecked) {
      onConfirm(Number.parseFloat(amount))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        className="w-full max-w-md rounded-xl backdrop-blur-xl border border-white/10 border-border/40 p-8 space-y-6 smooth-transition shadow-2xl"
        style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border/30">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Burn {token.symbol}</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-card/50 rounded-lg smooth-transition text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-5xl border border-accent/20">
            {token.icon}
          </div>
        </div>

        {/* Mint Address */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Mint Address</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/30 border border-border/40">
            <code className="flex-1 text-xs font-mono text-foreground break-all">{token.mintAddress}</code>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Amount</p>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-card/30 border border-border/40 text-foreground"
          />
        </div>

        {/* Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => setIsChecked(e.target.checked)}
            className="mr-2"
          />
          <p className="text-xs text-muted-foreground font-medium">I understand the risks</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="p-3 rounded-lg bg-card/30 border border-border/40 text-foreground hover:bg-card/50"
          >
            Cancel
          </button>
          <button onClick={handleConfirm} className="p-3 rounded-lg bg-accent text-white hover:bg-accent/80">
            Burn
          </button>
        </div>
      </div>
    </div>
  )
}
