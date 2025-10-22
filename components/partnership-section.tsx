import React from "react";
import { Handshake } from "lucide-react";

const partnershipLogos = [
  { src: "/partnership/patrner_solana.png", alt: "Solana" },
  { src: "/partnership/patrner_solscan.png", alt: "Solscan" },
  { src: "/partnership/patrner_phantom.png", alt: "Phantom" },
  { src: "/partnership/patrner_solflare.png", alt: "Solflare" },
  { src: "/partnership/patrner_ankr.png", alt: "ANKR" },
  { src: "/partnership/patrner_quicknode.png", alt: "QuickNode" },
  { src: "/partnership/patrner_coinmarketcap.png", alt: "CoinMarketCap" },
  { src: "/partnership/patrner_coingecko.png", alt: "CoinGecko" },
  { src: "/partnership/patrner_pumpfun.png", alt: "Pump.fun" },
];

function PartnershipSection() {
  return (
    <section className="w-full py-10 px-2 sm:px-0">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-2 mb-2">
          <Handshake className="w-7 h-7 text-[#9945FF]" />
          <h2 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
            Partnership
          </h2>
        </div>
        <div className="mb-6">
          <p className="text-muted-foreground text-base md:text-lg font-medium">Our trusted partners supporting the Devflation ecosystem</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10 items-center justify-center w-full py-2">
          {partnershipLogos.map((logo, idx) => (
            <div key={idx} className="flex items-center justify-center h-24 md:h-28">
              <img
                src={logo.src}
                alt={logo.alt}
                className="h-20 md:h-24 w-auto max-w-[180px] md:max-w-[220px] object-contain"
                style={{}}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PartnershipSection;
