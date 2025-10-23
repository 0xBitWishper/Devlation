
 "use client";
import { BurnHistory } from "../../components/burn-public";
import { BurnRecord } from "../../types/burn";
import { useRouter } from "next/navigation";


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
  {
    id: '2',
    tokenSymbol: 'SOL',
    tokenName: 'Solana',
    amount: 500,
    txSignature: '3Jd8K2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX7yZ9aB5Rk',
    timestamp: Date.now() - 86400000 * 5,
    icon: '🪙',
    mint: 'So11111111111111111111111111111111111111112',
  },
  {
    id: '3',
    tokenSymbol: 'USDC',
    tokenName: 'USD Coin',
    amount: 25000,
    txSignature: '7yZ9aB5Rk7CwkY2mP9nQ3xL8vH4jK6bN2mP5qR8sT1uV4wX',
    timestamp: Date.now() - 86400000 * 10,
    icon: '💵',
    mint: 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2',
  },
];

export default function BurnHistoryPage() {
  const router = useRouter();
  return <BurnHistory records={records} onBack={() => router.push("/dashboard")} />;
}
