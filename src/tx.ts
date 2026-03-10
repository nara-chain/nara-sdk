/**
 * Shared transaction sending utility with optional Address Lookup Table support.
 *
 * When DEFAULT_ALT_ADDRESS is set, transactions are sent as VersionedTransaction
 * with the ALT for smaller on-chain size. Otherwise, legacy Transaction is used.
 */

import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { DEFAULT_ALT_ADDRESS } from "./constants";

let _cachedAlt: AddressLookupTableAccount | null = null;
let _cachedAltAddress: string = "";
let _overrideAltAddress: string | null = null;

/**
 * Set a global ALT address at runtime (overrides DEFAULT_ALT_ADDRESS / env).
 * Pass empty string or null to disable ALT.
 */
export function setAltAddress(address: string | null): void {
  _overrideAltAddress = address;
  // Invalidate cache when address changes
  _cachedAlt = null;
  _cachedAltAddress = "";
}

/**
 * Get the current effective ALT address.
 */
export function getAltAddress(): string {
  return _overrideAltAddress ?? DEFAULT_ALT_ADDRESS;
}

async function loadAlt(
  connection: Connection
): Promise<AddressLookupTableAccount | null> {
  const addr = getAltAddress();
  if (!addr) return null;

  // Cache the ALT account to avoid repeated fetches
  if (_cachedAlt && _cachedAltAddress === addr) return _cachedAlt;

  const result = await connection.getAddressLookupTable(new PublicKey(addr));
  if (!result.value) {
    throw new Error(`Address Lookup Table not found: ${addr}`);
  }
  _cachedAlt = result.value;
  _cachedAltAddress = addr;
  return _cachedAlt;
}

/**
 * Send a transaction with optional ALT support.
 * If DEFAULT_ALT_ADDRESS is configured, uses VersionedTransaction.
 * Otherwise, uses legacy Transaction.
 *
 * @returns transaction signature
 */
export async function sendTx(
  connection: Connection,
  payer: Keypair,
  instructions: TransactionInstruction[],
  signers?: Keypair[],
  opts?: { skipPreflight?: boolean }
): Promise<string> {
  const alt = await loadAlt(connection);
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  let signature: string;

  if (alt) {
    const message = new TransactionMessage({
      payerKey: payer.publicKey,
      recentBlockhash: blockhash,
      instructions,
    }).compileToV0Message([alt]);

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
    for (const ix of instructions) tx.add(ix);
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

  const confirmation = await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed"
  );
  if (confirmation.value.err) {
    throw new Error(
      `Transaction ${signature} failed: ${JSON.stringify(confirmation.value.err)}`
    );
  }
  return signature;
}
