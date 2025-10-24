import { BurnRecord } from "../../types/burn";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";

// Dummy data, replace with real fetch if needed
const dummyRecords: BurnRecord[] = [
  {
    id: '1',
    tokenSymbol: 'DFT',
    tokenName: 'Devflation Token',
    amount: 100000,
    txSignature: '5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB',
    timestamp: Date.now() - 86400000 * 2,
    icon: '🔥',
    mint: 'DFT11111111111111111111111111111111111111111',
  },
];

export default function BlokDetailPage() {
  const router = useRouter();
  const { mint } = router.query;
  const [record, setRecord] = useState<BurnRecord | null>(null);

  useEffect(() => {
    if (typeof mint === "string") {
      const found = dummyRecords.find((r) => r.mint === mint);
      setRecord(found || null);
    }
  }, [mint]);

  if (!record) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p className="text-lg text-muted-foreground">Token not found.</p>
        <button className="mt-4 px-4 py-2 rounded bg-[#9945FF] text-white" onClick={() => router.back()}>
          <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
        </button>
      </div>
    );
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-2xl p-8 max-w-md w-full border border-[#9945FF]/40">
        <button className="mb-4 px-4 py-2 rounded bg-[#9945FF] text-white" onClick={() => router.back()}>
          <ArrowLeft className="inline w-4 h-4 mr-1" /> Back
        </button>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center text-3xl border border-accent/20">
            {record.icon}
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-foreground mb-1">{record.tokenSymbol}</h2>
            <p className="text-sm text-muted-foreground mb-2">{record.tokenName}</p>
            <p className="text-xs text-muted-foreground mb-2">Mint: <span className="font-mono break-all">{record.mint}</span></p>
            <p className="text-xs text-muted-foreground mb-2">Tx: <span className="font-mono break-all">{record.txSignature}</span></p>
            <p className="text-lg font-semibold text-[#9945FF]">{record.amount.toLocaleString()} {record.tokenSymbol}</p>
            <p className="text-xs text-muted-foreground">Burned on {formatDate(record.timestamp)}</p>
          </div>
          <a
            href={`https://solscan.io/tx/${record.txSignature}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 px-4 py-2 rounded-lg bg-[#9945FF] text-white font-semibold text-sm shadow hover:bg-[#9945FF]/90 transition-all"
          >
            View on SolScan
          </a>
        </div>
      </div>
    </div>
  );
}