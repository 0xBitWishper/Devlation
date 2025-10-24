"use client"

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// When wallet/publicKey changes, clear stale client-side data and notify app.
export default function useWalletChangeCleanup() {
  const { publicKey, wallet } = useWallet();
  const prev = useRef<string | null>(null);
  const initializedRef = useRef(false);

  // central cleanup routine used by both event listeners and publicKey watcher
  function doCleanup(newPubKey: string | null) {
    // If nothing changed, do nothing
    if (prev.current === newPubKey) {
      return;
    }

    // Clear known persisted flags
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem('devlation_force_server_rpc');
      }
    } catch (e) {
      // ignore
    }

    // Notify listeners
    try {
      const ev = new CustomEvent('devlation:walletChanged', { detail: { publicKey: newPubKey } });
      window.dispatchEvent(ev);
    } catch (e) {
      // ignore
    }
    // Also write a storage key so other tabs can detect wallet change via 'storage' event
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        try { sessionStorage.setItem('devlation_wallet_pubkey', String(newPubKey ?? '')); } catch (e) {}
      }
    } catch (e) {}

    prev.current = newPubKey;
  }

  useEffect(() => {
    const curr = publicKey ? publicKey.toBase58() : null;
    // On first mount, initialize prev.current but do not dispatch events.
    // Subsequent changes will trigger cleanup.
    if (!initializedRef.current) {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const stored = sessionStorage.getItem('devlation_wallet_pubkey');
          prev.current = stored !== null ? (stored === '' ? null : stored) : curr;
        } else {
          prev.current = curr;
        }
      } catch (e) {
        prev.current = curr;
      }
      initializedRef.current = true;
      return;
    }

    doCleanup(curr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicKey]);

  useEffect(() => {
    // subscribe to adapter-level events when available (more immediate for extension account switch)
    // adapter may be the wallet adapter instance; some adapters expose `on`/`off`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adapter: any = (wallet as any)?.adapter ?? (wallet as any);
    if (!adapter || typeof window === 'undefined') return;

    const handleConnect = () => {
      try {
        const p = adapter.publicKey ? (adapter.publicKey?.toBase58 ? adapter.publicKey.toBase58() : adapter.publicKey) : null;
        doCleanup(p);
      } catch (e) {}
    };
    const handleDisconnect = () => doCleanup(null);
    const handleAccountChanged = (newKey: any) => {
      try {
        const key = newKey && typeof newKey === 'object' && newKey.toBase58 ? newKey.toBase58() : newKey ?? null;
        doCleanup(key);
      } catch (e) {
        doCleanup(null);
      }
    };

    // Try common event names
    try {
      if (typeof adapter.on === 'function') {
        adapter.on('connect', handleConnect);
        adapter.on('disconnect', handleDisconnect);
        adapter.on('accountChanged', handleAccountChanged);
        adapter.on('accountChanged', handleAccountChanged); // some adapters may emit this
      }
      // Many wallet adapters also expose provider (e.g., window.solana)
      // Listen to provider events as fallback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider: any = (adapter as any)?.provider ?? (window as any)?.solana;
      if (provider && typeof provider.on === 'function') {
        provider.on('connect', handleConnect);
        provider.on('disconnect', handleDisconnect);
        provider.on('accountChanged', handleAccountChanged);
      }
    } catch (e) {
      // ignore subscription errors
    }

    return () => {
      try {
        if (typeof adapter.off === 'function') {
          adapter.off('connect', handleConnect);
          adapter.off('disconnect', handleDisconnect);
          adapter.off('accountChanged', handleAccountChanged);
        }
        const provider: any = (adapter as any)?.provider ?? (window as any)?.solana;
        if (provider && typeof provider.removeListener === 'function') {
          provider.removeListener('connect', handleConnect);
          provider.removeListener('disconnect', handleDisconnect);
          provider.removeListener('accountChanged', handleAccountChanged);
        }
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet]);
}
