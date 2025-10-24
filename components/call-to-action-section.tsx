import React from "react";

export default function CallToActionSection() {
  return (
  <section className="w-full py-1 px-2 sm:px-0 mb-0">
      <div className="max-w-7xl mx-auto">
  <div className="rounded-2xl border border-border bg-white/10 backdrop-blur-xl shadow-2xl p-8 md:p-12 flex flex-col items-start justify-center" style={{background: 'rgba(20, 20, 30, 0.18)'}}>
          <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-3 tracking-tight text-left">
            Ready to Join the Devflation Movement?
          </h2>
          <p className="text-muted-foreground text-lg md:text-xl mb-8 max-w-2xl text-left">
            Be part of the revolution. Buy $DEVF or join our X Community to stay updated and connect with other builders and holders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-start">
            <a
              href="https://raydium.io/swap/?inputCurrency=sol&outputCurrency=DWVF_MINT_ADDRESS"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-lg bg-gradient-to-r from-[#9945FF] to-[#14F195] text-white font-semibold text-lg shadow-lg hover:from-[#9945FF]/90 hover:to-[#14F195]/90 transition"
            >
              Buy $DEVF
            </a>
            <a
              href="https://x.com/devflation"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-lg border border-[#9945FF] text-[#9945FF] font-semibold text-lg bg-background hover:bg-[#9945FF]/10 transition shadow-lg"
            >
              Join X Community
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
