
 "use client";
import { RewardPage } from "../../components/reward";
import { useRouter } from "next/navigation";


type RewardRecord = {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  txSignature: string;
  timestamp: number;
  icon: string;
};

const records: RewardRecord[] = [];

export default function RewardPageContainer() {
  const router = useRouter();
  return <RewardPage records={records} onBack={() => router.push("/dashboard")} />;
}

