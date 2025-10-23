
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
      const safeFetchJSON = async (path: string, timeout = 8000) => {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        try {
          try {
            const res = await fetch(path, { signal: controller.signal });
            clearTimeout(id);
            const txt = await res.text().catch(() => null);
            let parsed = null;
            try { parsed = txt ? JSON.parse(txt) : null } catch (e) { parsed = txt; }
            return { ok: res.ok, status: res.status, body: parsed };
          } catch (fetchErr) {
            clearTimeout(id);
            return { ok: false, status: null, body: null, error: String(fetchErr) } as any;
          }
        } finally { clearTimeout(id); }
      };
      try {
        const j = await safeFetchJSON(`/api/tx/history?pubkey=${publicKey.toBase58()}`);
        if (mounted && j.ok && Array.isArray(j?.body?.burns)) setRecords(j.body.burns.map((b: any) => ({ id: `${b.pubkey}_${b.mint}`, tokenSymbol: b.metadata?.symbol ?? b.mint, tokenName: b.metadata?.name ?? '', amount: b.metadata?.amount ?? 0, txSignature: b.txid ?? '', timestamp: b.insertedAt ? Date.parse(b.insertedAt) : Date.now(), icon: b.metadata?.logoURI ?? '🔥', status: b.status ?? 'pending' })));
      } catch (e) {
        // ignore network errors silently
      }
    })();
    return () => { mounted = false; };
  }, [publicKey]);

  return <BurnHistory records={records} onBack={() => router.push("/dashboard")} />;
}
