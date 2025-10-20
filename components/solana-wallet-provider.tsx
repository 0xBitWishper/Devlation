
import React, { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";
import useEnsureWalletConnected from "../hooks/useEnsureWalletConnected";
import useWalletChangeCleanup from "../hooks/useWalletChangeCleanup";
import { useEffect } from "react";

export const SolanaWalletProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Ambil endpoint dari environment variable
  // Jika ada txMode di window, pakai endpoint TX
  const endpoint = (typeof window !== 'undefined' && (window as any).txMode)
    ? process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT_TX || "https://rpc.hellomoon.io"
    : process.env.NEXT_PUBLIC_SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
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
  // default poll every 1s until connected
  useEnsureWalletConnected(1000);
  // cleanup on wallet changes (clear small caches and notify listeners)
  useWalletChangeCleanup();
  useEffect(() => {
    const onError = (ev: ErrorEvent) => {
      try {
        console.error('Global error captured:', ev.error || ev.message, ev);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('devlation_last_error', String(ev.error || ev.message));
        }
      } catch (e) {}
    };
    const onRejection = (ev: PromiseRejectionEvent) => {
      try {
        console.error('Unhandled rejection captured:', ev.reason, ev);
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('devlation_last_error', String(ev.reason));
        }
      } catch (e) {}
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection as EventListener);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection as EventListener);
    };
  }, []);
  return null;
};
