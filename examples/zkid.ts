/**
 * zkid module example
 *
 * Demonstrates: createZkId, deposit, scanClaimableDeposits, withdraw, transferZkId
 *
 * Usage:
 *   PRIVATE_KEY=<base58_or_json_array> tsx examples/zkid.ts
 */

import { Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import {
  DEFAULT_RPC_URL,
  ZKID_DENOMINATIONS,
  deriveIdSecret,
  createZkId,
  getZkIdInfo,
  deposit,
  scanClaimableDeposits,
  withdraw,
  transferZkId,
  generateValidRecipient,
} from "../index";

// ─── Wallet setup ─────────────────────────────────────────────────────────────

function loadWallet(): Keypair {
  const raw = process.env.PRIVATE_KEY;
  if (!raw) throw new Error("Set PRIVATE_KEY env var (base58 or JSON array)");
  try {
    const arr = JSON.parse(raw);
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  } catch {
    return Keypair.fromSecretKey(bs58.decode(raw));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const connection = new Connection(DEFAULT_RPC_URL, "confirmed");
  const wallet = loadWallet();

  console.log("Wallet:", wallet.publicKey.toBase58());

  // Pick a unique name for your ZK ID
  const name = `demo-${Math.random().toString(36).slice(2, 10)}`;

  // 1. Derive idSecret deterministically from wallet + name
  //    This is the private key to your ZK ID — keep it secret!
  console.log("\n1. Deriving idSecret...");
  const idSecret = await deriveIdSecret(wallet, name);
  console.log("idSecret derived (first 8 chars):", idSecret.toString().slice(0, 8) + "...");

  // 2. Check if ZK ID already exists
  console.log("\n2. Checking if ZK ID exists...");
  let info = await getZkIdInfo(connection, name);
  if (info) {
    console.log("ZK ID already registered. depositCount:", info.depositCount);
  } else {
    // 3. Register the ZK ID (pays registration fee)
    console.log("\n3. Registering ZK ID:", name);
    const sig = await createZkId(connection, wallet, name, idSecret);
    console.log("Registered! Signature:", sig);

    info = await getZkIdInfo(connection, name);
    console.log("ZK ID info:", info);
  }

  // 4. Deposit 1 NARA into the ZK ID
  //    Anyone who knows the name can do this — no proof needed
  console.log("\n4. Depositing 1 NARA into ZK ID:", name);
  const depositSig = await deposit(
    connection,
    wallet,
    name,
    ZKID_DENOMINATIONS.NARA_1
  );
  console.log("Deposited! Signature:", depositSig);

  // 5. Scan for claimable (unspent) deposits
  console.log("\n5. Scanning claimable deposits...");
  const claimable = await scanClaimableDeposits(connection, name, idSecret);
  console.log(`Found ${claimable.length} claimable deposit(s):`);
  claimable.forEach((d, i) => {
    const nara = Number(d.denomination) / 1e9;
    console.log(`  [${i}] leafIndex=${d.leafIndex}, depositIndex=${d.depositIndex}, amount=${nara} NARA`);
  });

  if (claimable.length === 0) {
    console.log("No claimable deposits found.");
    return;
  }

  // 6. Withdraw the first claimable deposit anonymously
  //    The recipient has no on-chain link to the ZK ID
  console.log("\n6. Withdrawing deposit...");
  const recipient = generateValidRecipient();
  console.log("Recipient (fresh keypair):", recipient.publicKey.toBase58());

  const withdrawSig = await withdraw(
    connection,
    wallet,        // payer (pays tx fees, not linked to ZK ID)
    name,
    idSecret,
    claimable[0]!,
    recipient.publicKey
  );
  console.log("Withdrawn! Signature:", withdrawSig);
  console.log("NARA sent to:", recipient.publicKey.toBase58());

  // 7. (Optional) Transfer ZK ID ownership to a new identity
  //    The new owner derives their idSecret from their own wallet + same name
  console.log("\n7. Transferring ZK ID to a new identity...");
  const newWallet = Keypair.generate();
  const newIdSecret = await deriveIdSecret(newWallet, name);
  console.log("New owner wallet:", newWallet.publicKey.toBase58());

  const transferSig = await transferZkId(
    connection,
    wallet,       // payer (can be anyone, doesn't need to be old or new owner)
    name,
    idSecret,     // proves current ownership
    newIdSecret   // new owner's secret
  );
  console.log("Ownership transferred! Signature:", transferSig);

  const updatedInfo = await getZkIdInfo(connection, name);
  console.log("Updated commitmentStartIndex:", updatedInfo?.commitmentStartIndex);
  console.log("(Deposits before this index belong to the old owner)");
}

main().catch(err => {
  console.error("Error:", err.message ?? err);
  process.exit(1);
});
