"use client"

import { Wallet, ArrowLeft, Check } from "lucide-react"
import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useRouter } from "next/navigation"

interface ConnectWalletProps {
  onConnect: () => void
  onBack: () => void
}

export function ConnectWallet({ onConnect, onBack }: ConnectWalletProps) {
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const { wallets, select, connect, disconnect, connected, connecting, publicKey, wallet } = useWallet();
  const router = useRouter();

    const walletOptions = [
      { id: "phantom", name: "Phantom", icon: "👻", description: "Most popular Solana wallet", comingSoon: false },
      { id: "solflare", name: "Solflare", icon: "🔥", description: "Web & mobile wallet", comingSoon: false },
      { id: "metamask", name: "Metamask Solana", icon: "✨", description: "Coming Soon", comingSoon: true },
    ];

  const handleConnect = async () => {
    setErrorMsg(null);
    if (!selectedWallet) return;
    // Temukan wallet adapter yang sesuai
    const found = wallets.find(w => w.adapter.name.toLowerCase() === selectedWallet);
    if (!found) return;
    select(found.adapter.name);
    // Tunggu hingga wallet adapter benar-benar terpilih
    if (!wallet || wallet.adapter.name.toLowerCase() !== selectedWallet) {
      setErrorMsg("Wallet belum dipilih. Silakan pilih wallet terlebih dahulu.");
      return;
    }
    try {
      setIsConnecting(true);
      await connect();
      setIsConnecting(false);
      onConnect();
  // Redirect ke halaman dashboard setelah connect sukses
  router.push("/dashboard");
    } catch (e: any) {
      setIsConnecting(false);
      if (e && e.name === "WalletConnectionError") {
        setErrorMsg("Koneksi wallet dibatalkan. Silakan coba lagi.");
      } else if (e && e.name === "WalletNotSelectedError") {
        setErrorMsg("Wallet belum dipilih. Silakan pilih wallet terlebih dahulu.");
      } else {
        setErrorMsg("Gagal menghubungkan wallet. Silakan coba lagi.");
      }
    }
  };

  // Redirect otomatis jika wallet sudah terhubung
  useEffect(() => {
    if (connected && publicKey) {
      router.push("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, publicKey]);

  // Otomatis disconnect jika user klik back
  useEffect(() => {
    return () => {
      if (connected) disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/95 flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-accent/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-20 left-10 w-96 h-96 bg-accent/3 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {/* Card */}
        <div
          className="rounded-2xl backdrop-blur-xl border border-white/10 p-8"
          style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center border border-[#9945FF] mx-auto mb-4">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Connect Wallet</h2>
            <p className="text-muted-foreground">Choose your preferred Solana wallet to continue</p>
          </div>

          {/* Wallet Options */}
          <div className="space-y-3 mb-8">
              {walletOptions.map((wallet) => (
                <button
                  key={wallet.id}
                  onClick={() => !wallet.comingSoon && setSelectedWallet(wallet.id)}
                  disabled={wallet.comingSoon}
                  className={`w-full p-4 rounded-lg border-2 transition-all duration-300 flex items-center justify-between group ${
                    wallet.comingSoon
                      ? "border-border/40 bg-card/20 opacity-60 cursor-not-allowed"
                      : selectedWallet === wallet.id
                        ? "border-2 border-[#9945FF] bg-gradient-to-r from-[#9945FF]/20 to-[#14F195]/20"
                        : "border-border/40 bg-card/40 hover:border-[#9945FF] hover:bg-[#9945FF]/10"
                  }`}
                >
                  <div className="flex items-center gap-3 text-left">
                    {wallet.id === "phantom" && (
                      <img src="/wallet/phantom.png" alt="Phantom" className="w-8 h-8 rounded" />
                    )}
                    {wallet.id === "metamask" && (
                      <img src="/wallet/metamask.png" alt="Metamask Solana" className="w-8 h-8 rounded" />
                    )}
                    {wallet.id === "solflare" && (
                      <img src="/wallet/solflare.png" alt="Solflare" className="w-8 h-8 rounded" />
                    )}
                    {wallet.id !== "phantom" && wallet.id !== "metamask" && wallet.id !== "solflare" && (
                      <span className="text-2xl">{wallet.icon}</span>
                    )}
                    <div>
                      <p className="font-semibold text-foreground flex items-center gap-2">
                        {wallet.name}
                        {wallet.comingSoon && (
                          <span className="ml-2 px-2 py-0.5 rounded bg-muted text-xs text-muted-foreground border border-border/40">Coming Soon</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">{wallet.description}</p>
                    </div>
                  </div>
                  {selectedWallet === wallet.id && !wallet.comingSoon && (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#9945FF] to-[#14F195] flex items-center justify-center flex-shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  )}
                </button>
              ))}
          </div>

          {/* Connect Button */}
          <button
            onClick={handleConnect}
            disabled={Boolean(
              !selectedWallet ||
              isConnecting ||
              (selectedWallet && wallet && wallet.adapter.name.toLowerCase() !== selectedWallet)
            )}
            className={`w-full py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              selectedWallet && !isConnecting
                ? "bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white hover:opacity-90"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {isConnecting || connecting ? (
              <>
                <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                Connecting...
              </>
            ) : connected && publicKey ? (
              "Connected"
            ) : (
              "Connect Wallet"
            )}
          </button>

          {/* Info & Error */}
          {errorMsg && (
            <p className="text-xs text-[#9945FF] text-center mt-4">{errorMsg}</p>
          )}
          <p className="text-xs text-muted-foreground text-center mt-6">
            {connected && publicKey
              ? `Connected: ${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
              : "Your wallet connection is secure and non-custodial. We never have access to your private keys."}
          </p>
        </div>
      </div>
    </div>
  )
}
