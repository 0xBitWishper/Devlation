import type { NextApiRequest, NextApiResponse } from 'next'
import { Connection, clusterApiUrl } from '@solana/web3.js'
import path from 'path'
import fs from 'fs'

const RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl('mainnet-beta');
const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function writeHistory(pubkey: string, record: any) {
  const file = path.join(DATA_DIR, `${pubkey}.burns.json`);
  let arr: any[] = [];
  try { arr = JSON.parse(fs.readFileSync(file, 'utf8') || '[]'); } catch (e) { arr = []; }
  // use composite primary key { pubkey, mint }
  const idx = arr.findIndex(r => r.pubkey === pubkey && r.mint === record.mint);
  if (idx >= 0) arr[idx] = { ...arr[idx], ...record }; else arr.push(record);
  fs.writeFileSync(file, JSON.stringify(arr, null, 2), 'utf8');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { signedTxBase64, pubkey, mint, metadata } = req.body;
    if (!signedTxBase64) return res.status(400).json({ error: 'signedTxBase64 missing' });
    const conn = new Connection(RPC_URL, { commitment: 'confirmed' });
    const raw = Buffer.from(signedTxBase64, 'base64');
    let txid: string | null = null;
    try {
      txid = await conn.sendRawTransaction(raw);
      // write pending record
      const rec = {
        pubkey: pubkey ?? 'unknown',
        mint: mint ?? (metadata?.mint ?? 'unknown'),
        txid,
        status: 'pending',
        insertedAt: new Date().toISOString(),
        metadata: metadata ?? {}
      };
      try { writeHistory(rec.pubkey, rec); } catch (e) { console.error('writeHistory error', e); }
      // attempt to confirm (non-blocking)
      (async () => {
        try {
          const conf = await conn.confirmTransaction(txid, 'finalized');
          const status = (conf && (conf.value && conf.value.err) ? 'failed' : 'confirmed');
          const rec2 = { pubkey: pubkey ?? 'unknown', mint: mint ?? (metadata?.mint ?? 'unknown'), txid, status, updatedAt: new Date().toISOString() };
          try { writeHistory(rec2.pubkey, rec2); } catch (e) { console.error('writeHistory update error', e); }
        } catch (e) {
          console.error('confirmTransaction error', e);
        }
      })();
      return res.status(200).json({ txid });
    } catch (rpcErr: any) {
      console.error('[broadcast] rpcErr', rpcErr?.message ?? rpcErr);
      // attempt to extract rpc error detail
      const detail = rpcErr?.message ?? JSON.stringify(rpcErr);
      const rec = { pubkey: pubkey ?? 'unknown', mint: mint ?? (metadata?.mint ?? 'unknown'), txid: txid ?? null, status: 'failed', insertedAt: new Date().toISOString(), metadata: metadata ?? {}, error: detail };
      try { writeHistory(rec.pubkey, rec); } catch (e) { console.error('writeHistory error', e); }
      // detect blockhash-specific error and return a clear code
      const lc = String(detail).toLowerCase();
      if (lc.includes('blockhash not found') || lc.includes('transaction simulation failed: blockhash not found') || lc.includes('blockhash')) {
        return res.status(409).json({ error: 'blockhash_not_found', detail });
      }
      return res.status(502).json({ error: 'RPC broadcast failed', detail });
    }
  } catch (e: any) {
    console.error('[broadcast] error', e?.message ?? e);
    return res.status(500).json({ error: 'Broadcast failed', detail: String(e?.message ?? e) });
  }
}
