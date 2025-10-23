export interface BurnRecord {
  id: string;
  tokenSymbol: string;
  tokenName: string;
  amount: number;
  txSignature: string;
  timestamp: number;
  icon: string;
  mint: string; // contract address
}