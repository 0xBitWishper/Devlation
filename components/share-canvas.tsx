"use client"

import { useRef, useEffect } from "react"

interface ShareCanvasProps {
  tokenName: string
  amount: string
  transactionSignature: string
  onCanvasGenerated?: (canvas: HTMLCanvasElement) => void
}

export function ShareCanvas({ tokenName, amount, transactionSignature, onCanvasGenerated }: ShareCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = 1200
    canvas.height = 630

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#0a0e27")
    gradient.addColorStop(1, "#1a1f3a")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add decorative circles
    ctx.fillStyle = "rgba(222, 157, 35, 0.1)"
    ctx.beginPath()
    ctx.arc(150, 150, 200, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(1050, 500, 250, 0, Math.PI * 2)
    ctx.fill()

    // Main title
    ctx.font = "bold 72px Outfit, sans-serif"
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.fillText("Token Burn", canvas.width / 2, 120)

    // Subtitle
    ctx.font = "24px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.fillText("Successfully Burned on Solana", canvas.width / 2, 170)

    // Token info box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.strokeStyle = "rgba(222, 157, 35, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(150, 250, canvas.width - 300, 200, 20)
    ctx.fill()
    ctx.stroke()

    // Token name and amount
    ctx.font = "bold 48px Outfit, sans-serif"
    ctx.fillStyle = "#DE9D23"
    ctx.textAlign = "center"
    ctx.fillText(`${amount} ${tokenName}`, canvas.width / 2, 340)

    // Transaction signature label
    ctx.font = "16px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.textAlign = "center"
    ctx.fillText("Transaction Signature", canvas.width / 2, 420)

    // Transaction signature (shortened)
    ctx.font = "14px monospace"
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    const shortSig =
      transactionSignature.substring(0, 20) + "..." + transactionSignature.substring(transactionSignature.length - 20)
    ctx.fillText(shortSig, canvas.width / 2, 450)

    // Footer
    ctx.font = "18px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.textAlign = "center"
    ctx.fillText("Burned on Solana Network", canvas.width / 2, 570)

    if (onCanvasGenerated) {
      onCanvasGenerated(canvas)
    }
  }, [tokenName, amount, transactionSignature, onCanvasGenerated])

  return <canvas ref={canvasRef} className="hidden" />
}

export async function generateShareImage(
  tokenName: string,
  amount: string,
  transactionSignature: string,
): Promise<Blob> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not get canvas context")

    canvas.width = 1200
    canvas.height = 630

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, "#0a0e27")
    gradient.addColorStop(1, "#1a1f3a")
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Add decorative circles
    ctx.fillStyle = "rgba(222, 157, 35, 0.1)"
    ctx.beginPath()
    ctx.arc(150, 150, 200, 0, Math.PI * 2)
    ctx.fill()

    ctx.beginPath()
    ctx.arc(1050, 500, 250, 0, Math.PI * 2)
    ctx.fill()

    // Main title
    ctx.font = "bold 72px Outfit, sans-serif"
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "center"
    ctx.fillText("Token Burn", canvas.width / 2, 120)

    // Subtitle
    ctx.font = "24px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.7)"
    ctx.fillText("Successfully Burned on Solana", canvas.width / 2, 170)

    // Token info box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"
    ctx.strokeStyle = "rgba(222, 157, 35, 0.3)"
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(150, 250, canvas.width - 300, 200, 20)
    ctx.fill()
    ctx.stroke()

    // Token name and amount
    ctx.font = "bold 48px Outfit, sans-serif"
    ctx.fillStyle = "#DE9D23"
    ctx.textAlign = "center"
    ctx.fillText(`${amount} ${tokenName}`, canvas.width / 2, 340)

    // Transaction signature label
    ctx.font = "16px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
    ctx.textAlign = "center"
    ctx.fillText("Transaction Signature", canvas.width / 2, 420)

    // Transaction signature (shortened)
    ctx.font = "14px monospace"
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
    const shortSig =
      transactionSignature.substring(0, 20) + "..." + transactionSignature.substring(transactionSignature.length - 20)
    ctx.fillText(shortSig, canvas.width / 2, 450)

    // Footer
    ctx.font = "18px Outfit, sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.5)"
    ctx.textAlign = "center"
    ctx.fillText("Burned on Solana Network", canvas.width / 2, 570)

    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
    }, "image/png")
  })
}

export async function shareOnX(tokenName: string, amount: string, transactionSignature: string): Promise<void> {
  try {
    const imageBlob = await generateShareImage(tokenName, amount, transactionSignature)

    // Prepare share text with transaction info
    const shortSig =
      transactionSignature.substring(0, 20) + "..." + transactionSignature.substring(transactionSignature.length - 20)
    const shareText = `🔥 Just burned ${amount} ${tokenName} tokens on Solana!\n\nTxn: ${shortSig}\n\nJoin the burn movement and reduce token supply. #Solana #TokenBurn`

    // Check if Web Share API is available
    if (navigator.share && navigator.canShare) {
      const file = new File([imageBlob], "token-burn.png", { type: "image/png" })

      // Check if device can share files
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Token Burn",
          text: shareText,
          files: [file],
        })
        return
      }
    }

    // Fallback: Copy image to clipboard and open X
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": imageBlob,
        }),
      ])

      // Open X with pre-filled text
      const encodedText = encodeURIComponent(shareText)
      const xUrl = `https://x.com/intent/tweet?text=${encodedText}`
      window.open(xUrl, "_blank", "width=550,height=420")
    } catch (clipboardError) {
      // Final fallback: Just open X with text
      const encodedText = encodeURIComponent(shareText)
      const xUrl = `https://x.com/intent/tweet?text=${encodedText}`
      window.open(xUrl, "_blank", "width=550,height=420")
    }
  } catch (error) {
    console.error("Error sharing on X:", error)
    throw error
  }
}
