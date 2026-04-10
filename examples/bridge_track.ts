/**
 * Bridge 0.1 USDC Solana → Nara with full tracking output.
 *
 * Run: tsx examples/bridge_track.ts
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import bs58 from "bs58";
import {
  bridgeTransfer,
  extractMessageId,
  queryMessageSignatures,
  queryMessageStatus,
  BRIDGE_TOKENS,
  setAltAddress,
} from "../index";

const PRIVATE_KEY =
  "3kLdubNYrvGeDH3ETaXQZnMcG4uJPgRXsnkh22YqyVZKtDbgn5QXdcWeuS7zvhfq6Nw2SY7maTukkBwTn98Bv486";
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const NARA_RPC = process.env.NARA_RPC || "https://mainnet-api.nara.build/";

const AMOUNT = 100_000n; // 0.1 USDC

function ts() {
  return new Date().toISOString().slice(11, 23);
}

function fmtUsdc(raw: bigint): string {
  return `${raw / 1_000_000n}.${(raw % 1_000_000n).toString().padStart(6, "0")} USDC`;
}

async function getUsdcBalance(conn: Connection, owner: PublicKey, chain: "solana" | "nara"): Promise<bigint> {
  const cfg = BRIDGE_TOKENS.USDC!;
  const side = cfg[chain];
  const ata = getAssociatedTokenAddressSync(side.mint!, owner, false, side.tokenProgram!);
  try {
    const bal = await conn.getTokenAccountBalance(ata, "confirmed");
    return BigInt(bal.value.amount);
  } catch {
    return 0n;
  }
}

async function main() {
  const wallet = Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
  const solanaConn = new Connection(SOLANA_RPC, "confirmed");
  const naraConn = new Connection(NARA_RPC, "confirmed");

  console.log(`[${ts()}] === Bridge 0.1 USDC Solana → Nara (full tracking) ===`);
  console.log(`[${ts()}] Wallet: ${wallet.publicKey.toBase58()}\n`);

  // ── 1. Pre-flight balance ──
  const solBefore = await getUsdcBalance(solanaConn, wallet.publicKey, "solana");
  const naraBefore = await getUsdcBalance(naraConn, wallet.publicKey, "nara");
  console.log(`[${ts()}] [Balance] Solana USDC: ${fmtUsdc(solBefore)}`);
  console.log(`[${ts()}] [Balance] Nara USDC:   ${fmtUsdc(naraBefore)}\n`);

  // ── 2. Send bridge tx ──
  setAltAddress(null);
  console.log(`[${ts()}] [Bridge] Sending ${fmtUsdc(AMOUNT)} ...`);
  const result = await bridgeTransfer(solanaConn, wallet, {
    token: "USDC",
    fromChain: "solana",
    recipient: wallet.publicKey,
    amount: AMOUNT,
  }, { computeUnitLimit: 600_000 });

  console.log(`[${ts()}] [Bridge] ✓ Tx confirmed`);
  console.log(`           Signature:    ${result.signature}`);
  console.log(`           Message ID:   ${result.messageId}`);
  console.log(`           Fee:          ${fmtUsdc(result.feeAmount)}`);
  console.log(`           Bridge amt:   ${fmtUsdc(result.bridgeAmount)}\n`);

  // ── 3. Query validator signatures ──
  console.log(`[${ts()}] [Validators] Querying S3 signatures ...`);
  const sigs = await queryMessageSignatures(result.messageId!, "solana");
  console.log(`[${ts()}] [Validators] Checkpoint index: ${sigs.checkpointIndex}`);
  console.log(`[${ts()}] [Validators] Signed: ${sigs.signedCount}/${sigs.totalValidators} ${sigs.fullySigned ? "✓" : "⏳"}`);
  for (const v of sigs.validators) {
    console.log(`             ${v.folder}: ${v.signed ? "SIGNED" : "PENDING"} (latest=${v.latestIndex})`);
  }
  console.log();

  // If not fully signed yet, poll until signed
  if (!sigs.fullySigned) {
    console.log(`[${ts()}] [Validators] Waiting for all signatures ...`);
    const sigDeadline = Date.now() + 60_000;
    while (Date.now() < sigDeadline) {
      await new Promise((r) => setTimeout(r, 3000));
      const s = await queryMessageSignatures(result.messageId!, "solana");
      process.stdout.write(`[${ts()}] [Validators] ${s.signedCount}/${s.totalValidators} `);
      if (s.fullySigned) {
        console.log("✓ All signed");
        break;
      }
      console.log("⏳");
    }
    console.log();
  }

  // ── 4. Wait for delivery on Nara ──
  console.log(`[${ts()}] [Delivery] Polling Nara for USDC arrival ...`);
  const deadline = Date.now() + 3 * 60_000;
  let delivered = false;

  while (Date.now() < deadline) {
    const bal = await getUsdcBalance(naraConn, wallet.publicKey, "nara");
    if (bal > naraBefore) {
      const received = bal - naraBefore;
      console.log(`[${ts()}] [Delivery] ✓ Arrived! +${fmtUsdc(received)}`);
      delivered = true;
      break;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 5000));
  }
  if (!delivered) {
    console.log(`\n[${ts()}] [Delivery] ⚠ Timeout — not yet arrived`);
  }
  console.log();

  // ── 5. Query delivery status on-chain ──
  console.log(`[${ts()}] [Status] Querying Nara Mailbox for delivery tx ...`);
  const status = await queryMessageStatus(naraConn, result.messageId!, "nara", { limit: 20 });
  console.log(`[${ts()}] [Status] Delivered: ${status.delivered}`);
  if (status.deliverySignature) {
    console.log(`           Delivery tx:  ${status.deliverySignature}`);
  }
  console.log();

  // ── 6. Final balance ──
  const solAfter = await getUsdcBalance(solanaConn, wallet.publicKey, "solana");
  const naraAfter = await getUsdcBalance(naraConn, wallet.publicKey, "nara");
  console.log(`[${ts()}] [Final] Solana USDC: ${fmtUsdc(solAfter)} (Δ ${fmtUsdc(solBefore - solAfter)})`);
  console.log(`[${ts()}] [Final] Nara USDC:   ${fmtUsdc(naraAfter)} (Δ +${fmtUsdc(naraAfter - naraBefore)})`);
  console.log(`[${ts()}] === Done ===`);
}

main().catch((e) => {
  console.error(`[${ts()}] Error:`, e);
  process.exit(1);
});
