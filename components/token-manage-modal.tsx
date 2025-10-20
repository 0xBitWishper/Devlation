import React, { useState } from "react";
import { useIsMobile } from "./ui/use-mobile";
import { X, Eye, EyeOff, Search } from "lucide-react";

interface TokenManageModalProps {
  tokens: Array<{ symbol: string; name: string; logoURI?: string; mintAddress?: string; visible: boolean }>;
  onClose: () => void;
  onToggle: (symbol: string) => void;
}

export function TokenManageModal({ tokens, onClose, onToggle }: TokenManageModalProps) {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState("");
  const filtered = tokens.filter(
    t => t.symbol.toLowerCase().includes(search.toLowerCase()) || t.name.toLowerCase().includes(search.toLowerCase())
  );
  return (
    <div className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-50 ${isMobile ? '' : 'flex items-center justify-center'} p-4`}>
      <div className={
        isMobile
          ? "w-full max-w-lg mx-auto rounded-t-2xl bg-card/90 border-2 border-[#9945FF] p-8 space-y-6 shadow-2xl fixed bottom-0 left-0 right-0 animate-[slideUp_0.3s_ease] h-[80vh] max-h-[95vh] min-h-[60vh]"
          : "w-full max-w-xl rounded-2xl bg-card/90 border-2 border-[#9945FF] p-8 space-y-6 shadow-2xl"
      }>
        {/* Animasi slide up untuk bottom sheet */}
        {isMobile && (
          <style jsx>{`
            @keyframes slideUp {
              0% { transform: translateY(100%); }
              100% { transform: translateY(0); }
            }
            .animate-\[slideUp_0.3s_ease\] {
              animation: slideUp 0.3s ease;
            }
          `}</style>
        )}
  <div className="flex items-center justify-between pb-4 border-b border-[#9945FF]/40">
          <h2 className="text-xl font-bold text-foreground">Manage Tokens</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#9945FF]/20 rounded-lg text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9945FF]" />
          <input
            type="text"
            placeholder="Search tokens..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-card/40 text-foreground placeholder:text-muted-foreground border-2 border-[#9945FF] rounded-xl focus:outline-none"
            style={{ backgroundColor: "rgba(20, 20, 30, 0.18)" }}
          />
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No tokens found</div>
          ) : (
            filtered.map(token => (
              <div key={token.symbol} className="flex items-center justify-between p-3 rounded-lg bg-card/30 border border-[#9945FF]">
                <div className="flex items-center gap-3">
                  {token.logoURI ? (
                    <img src={token.logoURI} alt={token.symbol} className="w-8 h-8 rounded-full object-contain" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#9945FF]/20 flex items-center justify-center text-lg font-bold text-[#9945FF]">{token.symbol[0]}</div>
                  )}
                  <div>
                    <div className="font-semibold text-foreground">{token.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {token.name.length > 16
                        ? `${token.name.slice(0, 10)}...${token.name.slice(-4)}`
                        : token.name}
                    </div>
                    {/* Mint Address Short Only */}
                    {token.mintAddress && (
                      <div className="text-xs text-muted-foreground font-mono">
                        {token.mintAddress.slice(0, 4)}...{token.mintAddress.slice(-4)}
                      </div>
                    )}
                  </div>
                </div>
                {/* Switch Button */}
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={token.visible}
                    onChange={() => onToggle(token.symbol)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-6 bg-muted rounded-full peer-checked:bg-[#9945FF] transition relative">
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow peer-checked:left-5 transition-all border border-[#9945FF]"></div>
                  </div>
                </label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
