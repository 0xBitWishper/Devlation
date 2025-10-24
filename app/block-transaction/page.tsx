"use client";
import { TokenBurnHistory } from "../../components/block-transaction";
import { BurnRecord } from "../../types/burn";
import { useRouter } from "next/navigation";

// Dummy data for token burns
const records: BurnRecord[] = [
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

export default function BlokPage() {
  const router = useRouter();
  return <TokenBurnHistory records={records} onBack={() => router.push("/dashboard")} />;
}
