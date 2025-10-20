
"use client";
import { BurnHistory } from "../../components/burn-history";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";

export default function BurnHistoryPage() {
  const router = useRouter();
  const { publicKey } = useWallet();
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!publicKey) return;
      try {
        const res = await fetch(`/api/tx/history?pubkey=${publicKey.toBase58()}`);
        const j = await res.json();
        if (mounted && Array.isArray(j?.burns)) setRecords(j.burns.map((b: any) => ({ id: `${b.pubkey}_${b.mint}`, tokenSymbol: b.metadata?.symbol ?? b.mint, tokenName: b.metadata?.name ?? '', amount: b.metadata?.amount ?? 0, txSignature: b.txid ?? '', timestamp: b.insertedAt ? Date.parse(b.insertedAt) : Date.now(), icon: b.metadata?.logoURI ?? '🔥', status: b.status ?? 'pending' })));
      } catch (e) {}
    })();
    return () => { mounted = false; };
  }, [publicKey]);

  return <BurnHistory records={records} onBack={() => router.push("/dashboard")} />;
}
