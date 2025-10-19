

"use client";
import "./globals.css";

import { SolanaWalletProvider } from "../components/solana-wallet-provider"
import { ThemeProvider } from "../components/theme-provider"
import { Outfit } from "next/font/google"

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
})


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }}>
      <head />
      <body className={`${outfit.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
          <SolanaWalletProvider>
            {children}
          </SolanaWalletProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
 
