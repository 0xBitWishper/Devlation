"use client"

import { useEffect, useState } from "react"
import { useToast } from "../hooks/use-toast"
import { useIsMobile } from "./ui/use-mobile"
import { X } from "lucide-react"

interface BurnModalProps {
  token: any
  onConfirm: (amount: number) => void
  onCancel: () => void
}

export function BurnModal({ token, onConfirm, onCancel }: BurnModalProps) {
  const isMobile = useIsMobile();
  const [amount, setAmount] = useState("")
  const [isChecked, setIsChecked] = useState(false)
  const [copied, setCopied] = useState(false)
  const toast = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Enrich token metadata when modal mounts (logoURI / name / symbol)
  // This duplicates the small enrichment from token-detail but ensures the modal
  // shows the icon immediately even if parent hasn't enriched yet.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!token.logoURI || !token.name || !token.symbol) {
          const { fetchTokenMetadata } = await import('../lib/solanaMetadata');
          const meta = await fetchTokenMetadata(token.mintAddress ?? token.mint);
          if (!cancelled && meta) {
            if (!token.logoURI && meta.logoURI) token.logoURI = meta.logoURI;
            if ((!token.name || token.name === token.mintAddress) && meta.name) token.name = meta.name;
            if ((!token.symbol) && meta.symbol) token.symbol = meta.symbol;
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, [token.mintAddress]);

  const handleConfirm = () => {
    if (!isChecked) {
      toast.toast({
        title: 'Checklist belum dicentang',
        description: 'Anda harus menyetujui risiko sebelum melakukan burn token.'
      });
      return;
    }
    const amt = Number.parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) {
      toast.toast({
        title: 'Masukkan jumlah yang valid',
        description: 'Jumlah burn harus lebih dari 0.'
      });
      return;
    }
    onConfirm(amt);
  }

  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${isMobile ? '' : 'flex items-center justify-center'} p-4`}>
      <div
        className={
          isMobile
            ? "w-full max-w-lg mx-auto rounded-t-3xl backdrop-blur-xl border-2 p-8 space-y-6 smooth-transition shadow-2xl overflow-hidden fixed bottom-0 left-0 right-0 animate-[slideUp_0.3s_ease] h-[80vh] max-h-[95vh] min-h-[60vh]"
            : "w-full max-w-md rounded-3xl backdrop-blur-xl border-2 p-8 space-y-6 smooth-transition shadow-2xl overflow-hidden"
        }
        style={{ background: "rgba(20, 20, 30, 0.55)" }}
      >
        {/* Animasi slide up untuk bottom sheet */}
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
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#9945FF]/40">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Burn {token.symbol}</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-[#9945FF]/20 rounded-lg smooth-transition text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Token Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-[#9945FF]/30 to-[#14F195]/20 flex items-center justify-center text-5xl border-2 border-[#9945FF] overflow-hidden">
            {token.logoURI ? (
              <img src={token.logoURI} alt={token.symbol} className="w-full h-full object-contain" />
            ) : token.icon ? (
              <img src={token.icon} alt={token.symbol} className="w-full h-full object-contain" />
            ) : (
              <div className="text-4xl font-bold text-foreground">{token.symbol || '?'}</div>
            )}
          </div>
        </div>

        {/* Mint Address */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">Mint Address</p>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] focus:border-[#14F195] text-foreground outline-none">
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
            className="w-full p-3 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] focus:border-[#14F195] text-foreground outline-none"
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
                className="flex-1 py-1.5 rounded bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#14F195] font-semibold hover:bg-[#14F195]/30 transition text-xs border border-[#9945FF]"
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
            className="mr-2 accent-orange-500"
          />
          <p className="text-xs text-muted-foreground font-medium">I understand the risks</p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-4 mt-6">
          <button
            onClick={onCancel}
            className="w-32 py-3 rounded-lg font-semibold border border-[#9945FF] bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#14F195] hover:bg-[#14F195]/30 smooth-transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isChecked || !amount || isNaN(Number(amount)) || Number(amount) <= 0}
            className={`w-32 py-3 rounded-lg font-semibold border border-[#9945FF] bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:opacity-90 smooth-transition ${(!isChecked || !amount || isNaN(Number(amount)) || Number(amount) <= 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Burn
          </button>
        </div>
      </div>
    </div>
  )
}
