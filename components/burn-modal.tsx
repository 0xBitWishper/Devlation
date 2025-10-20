"use client"

import { useState } from "react"
import { useToast } from "../hooks/use-toast"
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
  const toast = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleConfirm = () => {
    if (!isChecked) {
      toast.toast({
        title: 'Checklist belum dicentang',
        description: 'Anda harus menyetujui risiko sebelum melakukan burn token.'
      });
      return;
    }
    if (amount) {
      onConfirm(Number.parseFloat(amount));
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
  className="w-full max-w-md rounded-3xl backdrop-blur-xl border-2 p-8 space-y-6 smooth-transition shadow-2xl"
        style={{ background: "rgba(20, 20, 30, 0.55)", borderImage: "linear-gradient(90deg, #9945FF 0%, #14F195 100%) 1" }}
      >
        {/* Header */}
  <div className="flex items-center justify-between pb-4 border-b border-[#9945FF]/40">
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
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#9945FF]/30 to-[#14F195]/20 flex items-center justify-center text-5xl border-2 border-[#9945FF]">
            {token.icon}
          </div>
        </div>

        {/* Mint Address */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Mint Address</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-card/30 border-2 border-[#9945FF] focus-within:border-[#14F195]">
            <code className="flex-1 text-xs font-mono text-foreground break-all">{token.mintAddress}</code>
          </div>
        </div>

        {/* Amount Input */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Amount</p>
          {/* Input Manual Amount */}
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-card/30 border-2 border-[#9945FF] focus:border-[#14F195] text-foreground outline-none"
          />
          {/* Slider Persentase */}
          <div className="flex items-center gap-3 mt-2">
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={amount && token.balance ? Math.round((parseFloat(amount) / token.balance) * 100) : 0}
              onChange={e => {
                if (token.balance) {
                  const pct = Number(e.target.value);
                  const val = ((token.balance * pct) / 100).toFixed(token.decimals ?? 0);
                  setAmount(val);
                }
              }}
              className="flex-1 accent-[#9945FF] h-2 rounded-lg outline-none"
              style={{ background: "linear-gradient(90deg, #9945FF 0%, #14F195 100%)" }}
            />
            <span className="text-xs font-semibold text-[#14F195] min-w-[36px] text-right">{amount && token.balance ? Math.round((parseFloat(amount) / token.balance) * 100) : 0}%</span>
          </div>
          {/* Tombol Persentase */}
          <div className="flex gap-2 mt-2">
            {[10, 25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                type="button"
                className="flex-1 py-1.5 rounded bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#9945FF] font-semibold hover:bg-[#9945FF]/30 transition text-xs border border-[#9945FF]"
                onClick={() => {
                  if (token.balance) {
                    const val = ((token.balance * pct) / 100).toFixed(token.decimals ?? 0);
                    setAmount(val);
                  }
                }}
              >
                {pct}%
              </button>
            ))}
          </div>
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
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onCancel}
            className="w-32 py-3 rounded-lg font-semibold border border-[#9945FF] bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#9945FF] hover:bg-[#9945FF]/30 smooth-transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="w-32 py-3 rounded-lg font-semibold border border-[#14F195] bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:opacity-90 smooth-transition"
          >
            Burn
          </button>
        </div>
      </div>
    </div>
  )
}
