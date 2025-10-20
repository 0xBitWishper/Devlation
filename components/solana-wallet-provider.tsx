
import React, { FC, ReactNode, useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import "@solana/wallet-adapter-react-ui/styles.css";

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
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
