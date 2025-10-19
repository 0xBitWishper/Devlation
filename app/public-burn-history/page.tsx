
 "use client";
import { BurnHistory } from "../../components/burn-public";
import { useRouter } from "next/navigation";

type BurnRecord = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  txSignature: string;
  timestamp: number;
  icon: string;
};

const records: BurnRecord[] = [];

export default function BurnHistoryPage() {
  const router = useRouter();
  return <BurnHistory records={records} onBack={() => router.push("/dashboard")} />;
}
