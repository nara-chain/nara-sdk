/**
 * Shared transaction sending utility with optional Address Lookup Table support.
 *
 * When ALT addresses are configured, transactions are sent as VersionedTransaction
 * with ALTs for smaller on-chain size. Otherwise, legacy Transaction is used.
 */

import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { DEFAULT_ALT_ADDRESS } from "./constants";

let _cachedAlts: AddressLookupTableAccount[] = [];
let _cachedAltKey: string = "";
let _overrideAltAddresses: string[] | null = null;

/**
 * Set global ALT addresses at runtime (overrides DEFAULT_ALT_ADDRESS / env).
 * Pass empty array or null to disable ALT.
 */
export function setAltAddress(addresses: string | string[] | null): void {
  if (addresses === null) {
    _overrideAltAddresses = [];
  } else if (typeof addresses === "string") {
    _overrideAltAddresses = addresses ? [addresses] : [];
  } else {
    _overrideAltAddresses = addresses.filter(Boolean);
  }
  // Invalidate cache when addresses change
  _cachedAlts = [];
  _cachedAltKey = "";
}

/**
 * Get the current effective ALT addresses.
 */
export function getAltAddress(): string[] {
  if (_overrideAltAddresses !== null) return _overrideAltAddresses;
  if (!DEFAULT_ALT_ADDRESS) return [];
  // env supports comma-separated list
  return DEFAULT_ALT_ADDRESS.split(",").map((s) => s.trim()).filter(Boolean);
}

async function loadAlts(
  connection: Connection
): Promise<AddressLookupTableAccount[]> {
  const addrs = getAltAddress();
  if (!addrs.length) return [];

  const key = addrs.join(",");
  if (_cachedAlts.length && _cachedAltKey === key) return _cachedAlts;

  const results: AddressLookupTableAccount[] = [];
  for (const addr of addrs) {
    try {
      const result = await connection.getAddressLookupTable(new PublicKey(addr));
      if (result.value) {
        results.push(result.value);
      } else {
        console.warn(`[nara-sdk] ALT not found: ${addr}, skipping`);
      }
    } catch (e) {
      console.warn(`[nara-sdk] Failed to load ALT ${addr}: ${e}, skipping`);
    }
  }

  _cachedAlts = results;
  _cachedAltKey = key;
  return _cachedAlts;
}

/**
 * Get the recent average priority fee (in micro-lamports per CU).
 * Samples the last few slots via getRecentPrioritizationFees.
 */
export async function getRecentPriorityFee(
  connection: Connection,
): Promise<number> {
  const fees = await connection.getRecentPrioritizationFees();
  if (!fees.length) return 0;
  const nonZero = fees.filter((f) => f.prioritizationFee > 0);
  if (!nonZero.length) return 0;
  const avg = nonZero.reduce((s, f) => s + f.prioritizationFee, 0) / nonZero.length;
  return Math.ceil(avg);
}

/**
 * Send a transaction with optional ALT support.
 * If ALT addresses are configured, uses VersionedTransaction.
 * Otherwise, uses legacy Transaction.
 *
 * opts.computeUnitLimit - set CU limit (ComputeBudgetProgram.setComputeUnitLimit)
 * opts.computeUnitPrice - set CU price in micro-lamports (ComputeBudgetProgram.setComputeUnitPrice)
 * opts.computeUnitPrice = "auto" - auto-fetch recent average priority fee
 *
 * @returns transaction signature
 */
export async function sendTx(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[],
  signers?: Keypair[],
  opts?: { skipPreflight?: boolean; computeUnitLimit?: number; computeUnitPrice?: number | "auto" }
): Promise<string> {
  // Prepend compute budget instructions
  const budgetIxs: TransactionInstruction[] = [];
  if (opts?.computeUnitLimit) {
    budgetIxs.push(
      ComputeBudgetProgram.setComputeUnitLimit({ units: opts.computeUnitLimit })
    );
  }
  if (opts?.computeUnitPrice !== undefined) {
    let price: number;
    if (opts.computeUnitPrice === "auto") {
      price = await getRecentPriorityFee(connection);
    } else {
      price = opts.computeUnitPrice;
    }
    if (price > 0) {
      budgetIxs.push(
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: price })
      );
    }
  }
  const allInstructions = [...budgetIxs, ...instructions];

  const alts = await loadAlts(connection);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  let signature: string;

  if (alts.length) {
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions: allInstructions,
    }).compileToV0Message(alts);

    const tx = new VersionedTransaction(message);
    const allSigners = [payer, ...(signers ?? [])];
    // Deduplicate signers by public key
    const seen = new Set<string>();
    const uniqueSigners = allSigners.filter((s) => {
      const key = s.publicKey.toBase58();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    tx.sign(uniqueSigners);
    signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: opts?.skipPreflight ?? false,
    });
  } else {
    const tx = new Transaction();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
    tx.feePayer = payer.publicKey;
    for (const ix of allInstructions) tx.add(ix);
    const allSigners = [payer, ...(signers ?? [])];
    const seen = new Set<string>();
    const uniqueSigners = allSigners.filter((s) => {
      const key = s.publicKey.toBase58();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    tx.sign(...uniqueSigners);
    signature = await connection.sendRawTransaction(tx.serialize(), {
      skipPreflight: opts?.skipPreflight ?? false,
    });
  }

  // Poll for confirmation (avoid confirmTransaction which uses WebSocket)
  const startTime = Date.now();
  const TIMEOUT_MS = 20_000;
  const POLL_INTERVAL_MS = 1_000;

  while (Date.now() - startTime < TIMEOUT_MS) {
    const currentBlockHeight = await connection.getBlockHeight("confirmed");
    if (currentBlockHeight > lastValidBlockHeight) {
      throw new Error(
        `Transaction ${signature} expired: block height exceeded`
      );
    }

    const statusResult = await connection.getSignatureStatuses([signature]);
    const status = statusResult?.value?.[0];

    if (status) {
      if (status.err) {
        throw new Error(
          `Transaction ${signature} failed: ${JSON.stringify(status.err)}`
        );
      }
      if (
        status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized"
      ) {
        return signature;
      }
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }

  throw new Error(`Transaction ${signature} confirmation timeout`);
}
