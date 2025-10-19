"use client"

import { useState } from "react"
import { Dashboard } from "@/components/dashboard"
import { BurnModal } from "@/components/burn-modal"
import { SuccessScreen } from "@/components/success-screen"
import { LandingPage } from "@/components/landing-page"
import { ConnectWallet } from "@/components/connect-wallet"
import { BurnHistory } from "@/components/burn-history"

type Screen = "landing" | "connect-wallet" | "dashboard" | "burn" | "success" | "history"

interface BurnRecord {
  id: string
  tokenSymbol: string
  tokenName: string
  amount: number
  txSignature: string
  timestamp: number
  icon: string
}

export default function Home() {
  const [currentScreen, setCurrentScreen] = useState<Screen>("landing")
  const [selectedToken, setSelectedToken] = useState<any>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [burnHistory, setBurnHistory] = useState<BurnRecord[]>([])

  const handleGetStarted = () => {
    setCurrentScreen("connect-wallet")
  }

  const handleWalletConnect = () => {
    setIsWalletConnected(true)
    setCurrentScreen("dashboard")
  }

  const handleBurnClick = (token: any) => {
    setSelectedToken(token)
    setCurrentScreen("burn")
  }

  const handleConfirmBurn = (amount: number) => {
    if (selectedToken) {
      const newRecord: BurnRecord = {
        id: Date.now().toString(),
        tokenSymbol: selectedToken.symbol,
        tokenName: selectedToken.name,
        amount: amount,
        txSignature: "5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB",
        timestamp: Date.now(),
        icon: selectedToken.icon,
      }
      setBurnHistory([newRecord, ...burnHistory])
    }
    setCurrentScreen("success")
  }

  const handleBackToDashboard = () => {
    setCurrentScreen("dashboard")
    setSelectedToken(null)
  }

  const handleDisconnectWallet = () => {
    setIsWalletConnected(false)
    setCurrentScreen("landing")
    setSelectedToken(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {currentScreen === "landing" && <LandingPage onGetStarted={handleGetStarted} />}
      {currentScreen === "connect-wallet" && (
        <ConnectWallet onConnect={handleWalletConnect} onBack={() => setCurrentScreen("landing")} />
      )}
      {currentScreen === "dashboard" && (
        <Dashboard onBurnClick={handleBurnClick} onHistoryClick={() => setCurrentScreen("history")} />
      )}
      {currentScreen === "burn" && selectedToken && (
        <BurnModal token={selectedToken} onConfirm={handleConfirmBurn} onCancel={() => setCurrentScreen("dashboard")} />
      )}
      {currentScreen === "success" && <SuccessScreen onBackToDashboard={handleBackToDashboard} />}
      {currentScreen === "history" && (
        <BurnHistory records={burnHistory} onBack={() => setCurrentScreen("dashboard")} />
      )}
    </div>
  )
}
