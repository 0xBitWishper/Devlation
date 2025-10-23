"use client"

import { useEffect, useState, useRef } from "react"
import { useToast } from "../hooks/use-toast"
import { useIsMobile } from "./ui/use-mobile"
import { useWallet } from '@solana/wallet-adapter-react';
import { X } from "lucide-react"
import { Spinner } from "./ui/spinner"

interface BurnModalProps {
  token: any
  // method: 'instruction' = burn via SPL Burn instruction, 'send' = send to death wallet address
  onConfirm: (amount: number, method?: 'instruction' | 'send', image?: string) => Promise<void> | void
  onCancel: () => void
  isDev?: boolean
}

export function BurnModal({ token, onConfirm, onCancel, isDev }: BurnModalProps) {
  const [amount, setAmount] = useState("")
  const [isChecked, setIsChecked] = useState(false)
  const [method, setMethod] = useState<'instruction' | 'send'>('instruction')
  const [copied, setCopied] = useState(false)
  const [metaReady, setMetaReady] = useState<boolean>(Boolean((token as any)?.meta));
  const [isProcessing, setIsProcessing] = useState(false)
  const toast = useToast();
  const { publicKey } = useWallet();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const modalRef = useRef<HTMLDivElement | null>(null);
  const amountInputRef = useRef<HTMLInputElement | null>(null);

  // Enrich token metadata when modal mounts (logoURI / name / symbol)
  // This duplicates the small enrichment from token-detail but ensures the modal
  // shows the icon immediately even if parent hasn't enriched yet.
  useEffect(() => {
    let cancelled = false;
  // Lock body scroll while modal is open
    const prevOverflow = typeof document !== 'undefined' ? document.body.style.overflow : undefined;
    try { if (typeof document !== 'undefined') document.body.style.overflow = 'hidden'; } catch (e) {}
    (async () => {
      try {
        if (!token.logoURI || !token.name || !token.symbol) {
          const { fetchTokenMetadata } = await import('../lib/solanaMetadata');
          const meta = await fetchTokenMetadata(token.mintAddress ?? token.mint);
          if (!cancelled && meta) {
            // attach meta and normalize dev field
            try { (token as any).meta = meta; } catch (e) {}
            // signal metadata is now available to the UI
            try { setMetaReady(true); } catch (e) {}
            if (!token.logoURI && meta.logoURI) token.logoURI = meta.logoURI;
            if ((!token.name || token.name === token.mintAddress) && meta.name) token.name = meta.name;
            if ((!token.symbol) && meta.symbol) token.symbol = meta.symbol;
          }
        }
      } catch (e) {
        // ignore
      }
    })();
    return () => { cancelled = true; try { if (typeof document !== 'undefined' && prevOverflow !== undefined) document.body.style.overflow = prevOverflow; } catch (e) {} };
  }, [token.mintAddress]);

  // Focus management: initial focus to amount input, trap Tab inside modal, Escape to close
  useEffect(() => {
    const root = modalRef.current;
    if (!root) return;
    const focusableSelector = 'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(root.querySelectorAll<HTMLElement>(focusableSelector)).filter(n => !n.hasAttribute('disabled'));
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    // prefer amount input
    try { amountInputRef.current?.focus(); } catch (e) {}
    try { if (!document.activeElement || document.activeElement === document.body) first?.focus(); } catch (e) {}

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
        return;
      }
      if (e.key === 'Tab') {
        if (nodes.length === 0) {
          e.preventDefault();
          return;
        }
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  
  const normalize = (v: any) => (typeof v === 'string' ? v.trim() : (v ? String(v).trim() : ''));
  const derivedIsDev = (() => {
    try {
      const pk = publicKey ? publicKey.toBase58() : '';
      if (!pk) return false;
      const raw = (token as any)?.meta?.dev;
      if (!raw) return false;
      if (typeof raw === 'string') {
        if (normalize(raw) === pk) return true;
      }
      const candidates = [
        (raw as any)?.gunakan,
        (raw as any)?.address,
        (raw as any)?.owner,
        (raw as any)?.wallet,
      ];
      for (const c of candidates) {
        if (typeof c === 'string' && normalize(c) === pk) return true;
      }
      try { if (JSON.stringify(raw).includes(pk)) return true; } catch (e) {}
      return false;
    } catch (e) { return false; }
  })();

  // Debug: log metadata and derived status to help runtime troubleshooting
  useEffect(() => {
    try {
      console.debug('[BurnModal] token.meta', (token as any)?.meta, 'derivedIsDev', derivedIsDev, 'metaReady', metaReady);
    } catch (e) {}
  }, [ (token as any)?.meta, derivedIsDev, metaReady ]);
  // ensure method defaults according to derivedIsDev
  useEffect(() => {
    if (derivedIsDev) setMethod('instruction');
    else setMethod('send');
  }, [derivedIsDev]);

  const handleConfirm = async () => {
    if (!isChecked) {
      toast.toast({
        title: 'Checklist not checked',
        description: 'You must acknowledge the risks before burning tokens.'
      });
      return;
    }
    const amt = amount ? Number.parseFloat(amount) : 0;
    // determine image to pass to parent so success screen can show it
    const image = (token as any)?.logoURI ?? (token as any)?.icon ?? (token as any)?.meta?.logoURI ?? undefined;
    try {
      setIsProcessing(true);
      // allow parent to be async and await it so modal can show progress
      await onConfirm(amt, method, image as any);
    } catch (e) {
      // parent may throw; surface a toast
      try { toast.toast({ title: 'Burn failed', description: String(e) }); } catch (ee) {}
    } finally {
      // if modal remains mounted, stop processing indicator (if parent closes modal this is noop)
      try { setIsProcessing(false); } catch (e) {}
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        ref={modalRef}
        onClick={(e) => {
          // if clicking on backdrop (not inside modal content), close only when not processing
          if (e.target === e.currentTarget && !isProcessing) onCancel();
        }}
        tabIndex={-1}
        className="w-full max-w-md rounded-3xl backdrop-blur-xl border-2 p-0 smooth-transition shadow-2xl max-h-[90vh] flex flex-col"
        style={{ background: "rgba(20, 20, 30, 0.55)", borderImage: "linear-gradient(90deg, #9945FF 0%, #14F195 100%) 1" }}
      >
        {/* Header */}
  <div className="flex items-center justify-between pb-4 border-b border-[#9945FF]/40">
          <h2 className="text-2xl font-bold text-foreground tracking-tight">Burn {token.symbol}</h2>
          <button
            onClick={() => { if (!isProcessing) onCancel(); }}
            disabled={isProcessing}
            className="p-2 hover:bg-[#9945FF]/20 rounded-lg smooth-transition text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button> 
        </div> 

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
            ref={amountInputRef}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full p-3 rounded-lg bg-[#9945FF]/10 border-2 border-[#9945FF] focus:border-[#14F195] text-foreground outline-none"
            disabled={isProcessing}
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
              disabled={isProcessing}
          />
          <p className="text-xs text-muted-foreground font-medium">I understand the risks</p>
        </div>

        {/* Method selection */}
            <div className="mt-4">
          <p className="text-sm font-medium text-muted-foreground mb-2">Burn method</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { if (derivedIsDev && !isProcessing) setMethod('instruction'); }}
              disabled={!derivedIsDev || !metaReady || isProcessing}
              className={`flex-1 p-3 rounded-lg border ${method === 'instruction' ? 'border-[#14F195] bg-[#14F195]/10' : 'border-[#9945FF] bg-transparent'} text-sm font-medium ${(!derivedIsDev || !metaReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Burn via Instruction
            </button>
            <button
              type="button"
              onClick={() => { if (!derivedIsDev && !isProcessing) setMethod('send'); }}
              disabled={derivedIsDev || !metaReady || isProcessing}
              className={`flex-1 p-3 rounded-lg border ${method === 'send' ? 'border-[#14F195] bg-[#14F195]/10' : 'border-[#9945FF] bg-transparent'} text-sm font-medium ${(derivedIsDev || !metaReady) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Send to Death Wallet
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {method === 'instruction' ? (
              <>Burn via instruction will call the token program's burn instruction to reduce total supply. This permanently destroys tokens on-chain.</>
            ) : (
              <>Send to Death Wallet transfers tokens to a centralized 'dead' address. This is irreversible but depends on the destination account behavior.</>
            )}
          </p>
          {!metaReady && (
            <p className="text-xs text-yellow-400 mt-2">Waiting for token metadata…</p>
          )}
          {method === 'send' && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground font-medium">Death Wallet Address</p>
              <div className="flex items-center gap-2 p-3 rounded-lg bg-card/30 border-2 border-[#9945FF] focus-within:border-[#14F195]">
                <code className="flex-1 text-xs font-mono text-foreground break-all">1nc1nerator11111111111111111111111111111111</code>
                <button
                  type="button"
                  onClick={() => !isProcessing && copyToClipboard('1nc1nerator11111111111111111111111111111111')}
                  className="text-xs px-2 py-1 rounded bg-[#9945FF]/10 hover:bg-[#9945FF]/20"
                  disabled={isProcessing}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
                <a
                  href={`https://explorer.solana.com/address/1nc1nerator11111111111111111111111111111111`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                >
                  Explorer
                </a>
              </div>
            </div>
          )}
        </div>

        </div>

        {/* Actions */}
        <div className="p-6 border-t border-[#9945FF]/20">
          <div className="flex justify-end gap-4">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="w-32 py-3 rounded-lg font-semibold border border-[#9945FF] bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20 text-[#14F195] hover:bg-[#14F195]/30 smooth-transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isProcessing || !isChecked || !amount || isNaN(Number(amount)) || Number(amount) <= 0}
            className={`w-32 py-3 rounded-lg font-semibold border border-[#9945FF] bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:opacity-90 smooth-transition ${(!isChecked || !amount || isNaN(Number(amount)) || Number(amount) <= 0 || isProcessing) ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isProcessing ? (
              <div className="flex items-center justify-center gap-2">
                <Spinner className="w-4 h-4 text-white animate-spin" />
                <span>Processing...</span>
              </div>
            ) : (
              'Burn'
            )}
          </button>
          </div>
        </div>
      </div>
    </div>
  )
}
