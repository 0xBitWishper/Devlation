"use client"

import { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

// Polls the wallet connection state until the user connects.
// Non-destructive: it does not call connect() or select wallets automatically.
// It only observes and exposes a persistent check so other parts of the app can
// rely on an implementation that keeps re-checking until `connected === true`.
export default function useEnsureWalletConnected(intervalMs = 1000) {
  const { connected, wallet } = useWallet();
  const inFlight = useRef(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    // If connected, stop any polling
    if (connected) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
      return;
    }

    // Start polling if not already started
    if (!intervalRef.current) {
      intervalRef.current = window.setInterval(async () => {
        if (inFlight.current) return;
        inFlight.current = true;
        try {
          // A lightweight check: read adapter state if available. This is intentionally
          // non-invasive (we don't call connect()). We just touch the adapter to ensure
          // any lazy state is surfaced and rely on `connected` reactive value.
          // Some adapters surface properties like `connected` or `publicKey` on the adapter.
          // Access them here so any lazy getter runs.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const adapter: any = wallet?.adapter;
          if (adapter) {
            // Access a couple of properties to trigger lazy state if present
            // (no-op if undefined)
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            adapter.connected;
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            adapter.publicKey;
          }

          // Nothing else to do here; `connected` is the source of truth. The interval
          // will clear itself in the effect when connected becomes true.
        } catch (e) {
          // Keep polling on error
          // console.debug('wallet check error', e)
        } finally {
          inFlight.current = false;
        }
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as unknown as number);
        intervalRef.current = null;
      }
    };
    // We only want to restart the effect when wallet instance changes or intervalMs/connected
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, connected, intervalMs]);

  return { checking: !connected };
}
