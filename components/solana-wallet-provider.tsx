
import React, { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";
import useEnsureWalletConnected from "../hooks/useEnsureWalletConnected";
import useWalletChangeCleanup from "../hooks/useWalletChangeCleanup";
import { useEffect } from "react";
import { useToast, toast } from "../hooks/use-toast";

// Module-level early guard (client-only): install conservative overrides for
// window.onunhandledrejection and window.onerror as soon as this module loads
// in the browser. This helps intercept wallet adapters that emit global
// errors/rejections synchronously or before React effects run (which is
// important to prevent Next.js dev overlay from picking them up).
if (typeof window !== 'undefined') {
  try {
    // Wrap console.error to avoid Next.js dev overlay being triggered by
    // wallet adapters that log/throw 'WalletSignTransactionError' or other
    // user-rejected messages. We filter obvious user-rejection messages and
    // suppress them from console.error while still delegating other errors
    // to the original handler.
    try {
      const origConsoleError = console.error.bind(console);
      const isUserRejectionMsg = (args: any[]) => {
        try {
          if (!args || !args.length) return false;
          const joined = args.map(a => {
            try { return typeof a === 'string' ? a : (a && a.message) ? String(a.message) : (a && a.name) ? String(a.name) : JSON.stringify(a); } catch (e) { return String(a); }
          }).join(' ').toLowerCase();
          if (joined.includes('walletsigntransactionerror') || joined.includes('user rejected') || joined.includes('user rejected the request') || joined.includes('signature cancelled') || joined.includes('user_rejected') || joined.includes('userrejected')) return true;
          return false;
        } catch (e) { return false; }
      };
      console.error = (...args: any[]) => {
        try {
          if (isUserRejectionMsg(args)) {
            // swallow obvious user rejection logs to avoid dev overlay spam
            return;
          }
        } catch (e) {}
        try { origConsoleError(...args); } catch (e) {}
      };
    } catch (e) {}
    const isUserRejectionEarly = (maybeErr: any) => {
      try {
        if (!maybeErr) return false;
        const msg = typeof maybeErr === 'string' ? maybeErr : (maybeErr?.message ?? (maybeErr?.toString && maybeErr.toString()) ?? '');
        const name = String(maybeErr?.name ?? '').toLowerCase();
        const code = maybeErr?.code ?? maybeErr?.error?.code ?? maybeErr?.status ?? null;
        const s = String(msg || '').toLowerCase();
        if (s.includes('rejected') || s.includes('user rejected') || s.includes('user canceled') || s.includes('user cancelled') || s.includes('cancelled')) return true;
        if (name.includes('walletsigntransactionerror') || name.includes('userrejected')) return true;
        if (code === 4001 || String(code).toLowerCase().includes('user_rejected') || String(code).toLowerCase().includes('userrejected')) return true;
        return false;
      } catch (e) { return false; }
    };

    const prevOnUnhandled = (window as any).onunhandledrejection;
    const prevOnErr = (window as any).onerror;

    try {
      (window as any).onunhandledrejection = function(ev: any) {
        try {
          const reason = ev?.reason ?? null;
          if (isUserRejectionEarly(reason)) {
            try { ev.preventDefault?.(); } catch (e) {}
            try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            return true; // signal handled
          }
        } catch (e) {}
        try { if (typeof prevOnUnhandled === 'function') return prevOnUnhandled(ev); } catch (e) {}
        return false;
      };
    } catch (e) {}

    try {
      (window as any).onerror = function(message: any, source?: string, lineno?: number, colno?: number, error?: any) {
        try {
          if (isUserRejectionEarly(error ?? message)) {
            try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            return true;
          }
        } catch (e) {}
        try { if (typeof prevOnErr === 'function') return prevOnErr(message, source, lineno, colno, error); } catch (e) {}
        return false;
      };
    } catch (e) {}
  } catch (e) {}
}

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Ambil endpoint dari environment variable
  // Jika ada txMode di window, pakai endpoint TX
    const endpoint = (typeof window !== 'undefined' && (window as any).txMode)
      ? (process as any).env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT_TX || "https://rpc.hellomoon.io"
      : (process as any).env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        {/* Lightweight checker: will poll wallet adapter state until connected */}
        <EnsureWalletChecker />
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const EnsureWalletChecker: FC = () => {
  const { toast } = useToast();

  useEffect(() => {
    const isUserRejection = (maybeErr: any) => {
      try {
        if (!maybeErr) return false;
        const msg = typeof maybeErr === 'string' ? maybeErr : (maybeErr?.message ?? (maybeErr?.toString && maybeErr.toString()) ?? '');
        const name = String(maybeErr?.name ?? '').toLowerCase();
        const code = maybeErr?.code ?? maybeErr?.error?.code ?? maybeErr?.status ?? null;
        const s = String(msg || '').toLowerCase();
        if (s.includes('rejected') || s.includes('user rejected') || s.includes('user canceled') || s.includes('user cancelled') || s.includes('cancelled')) return true;
        if (name.includes('walletsigntransactionerror') || name.includes('userrejected')) return true;
        if (code === 4001 || String(code).toLowerCase().includes('user_rejected') || String(code).toLowerCase().includes('userrejected')) return true;
        return false;
      } catch (e) { return false; }
    };

    const onError = (ev: ErrorEvent) => {
      try {
        const err: any = (ev && (ev as any).error) || ev?.message || null;
        if (isUserRejection(err)) {
          try { ev.preventDefault?.(); } catch (e) {}
          try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
          return;
        }
        try { console.error('Global error captured:', ev.error || ev.message, ev); } catch (e) {}
        try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('devlation_last_error', String(ev.error || ev.message)); } catch (e) {}
      } catch (e) {}
    };

    const onRejection = (ev: PromiseRejectionEvent) => {
      try {
        const reason: any = (ev && (ev as any).reason) || null;
        if (isUserRejection(reason)) {
          try { ev.preventDefault?.(); } catch (e) {}
          try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
          return;
        }
        try { console.error('Unhandled rejection captured:', ev.reason, ev); } catch (e) {}
        try { if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem('devlation_last_error', String(ev.reason)); } catch (e) {}
      } catch (e) {}
    };

    try { window.addEventListener('error', onError, { capture: true }); } catch (e) {}
    try { window.addEventListener('unhandledrejection', onRejection as EventListener, { capture: true } as any); } catch (e) {}

    const prevOnUnhandledRejection = (window as any).onunhandledrejection;
    const prevOnError = (window as any).onerror;

    try {
      (window as any).onunhandledrejection = function(ev: any) {
        try {
          const reason = ev?.reason ?? null;
          if (isUserRejection(reason)) {
            try { ev.preventDefault?.(); } catch (e) {}
            try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            return;
          }
        } catch (e) {}
        try { if (typeof prevOnUnhandledRejection === 'function') prevOnUnhandledRejection(ev); } catch (e) {}
      };
    } catch (e) {}

    try {
      (window as any).onerror = function(message: any, source?: string, lineno?: number, colno?: number, error?: any) {
        try {
          if (isUserRejection(error ?? message)) {
            try { toast({ title: 'Signature cancelled', description: 'You cancelled the signature request.' }); } catch (e) {}
            return;
          }
        } catch (e) {}
        try { if (typeof prevOnError === 'function') prevOnError(message, source, lineno, colno, error); } catch (e) {}
      };
    } catch (e) {}

    return () => {
      try { window.removeEventListener('error', onError, { capture: true } as any); } catch (e) {}
      try { window.removeEventListener('unhandledrejection', onRejection as EventListener, { capture: true } as any); } catch (e) {}
      try { (window as any).onunhandledrejection = prevOnUnhandledRejection; } catch (e) {}
      try { (window as any).onerror = prevOnError; } catch (e) {}
    };
  }, [toast]);

  return null;
};
