/**
 * Cross-chain bridge SDK between Nara and Solana via Hyperlane warp routes.
 *
 * Supports USDC, USDT and SOL in both directions. The full amount leaves the
 * sender: the bridge fee is deducted on the destination chain by the warp
 * route as it releases the tokens. The rate is unchanged (0.5%, 0.5 floor), so
 * `calculateBridgeFee` still gives the amount the recipient will receive.
 *
 * Adding a new asset:
 *   1. Append a new entry to BRIDGE_TOKENS with {symbol, decimals, solana, nara}.
 *   2. The PDA derivation, account-list construction, and instruction encoding
 *      are mode-driven (collateral / synthetic / native), no per-token code paths.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  BRIDGE_FEE_BPS_DENOMINATOR,
  DEFAULT_BRIDGE_FEE_BPS,
} from "./constants";
import { sendTx } from "./tx";

// ─── Types ────────────────────────────────────────────────────────

export type BridgeChain = "solana" | "nara";
export type BridgeMode = "collateral" | "synthetic" | "native";

export interface BridgeTokenSide {
  warpProgram: PublicKey;
  mode: BridgeMode;
  /** SPL mint pubkey. null for Solana native SOL. */
  mint: PublicKey | null;
  /** SPL token program. null for Solana native SOL. */
  tokenProgram: PublicKey | null;
}

export interface BridgeTokenConfig {
  symbol: string;
  decimals: number;
  /** Minimum per-transfer amount in raw units (rejected if below) */
  minAmount: bigint;
  /** Minimum fee floor in raw units (fee = max(amount * bps, minFee)) */
  minFee: bigint;
  solana: BridgeTokenSide;
  nara: BridgeTokenSide;
}

export interface BridgeTransferParams {
  /** Token symbol from BRIDGE_TOKENS (e.g. "USDC", "SOL") */
  token: string;
  /** Source chain */
  fromChain: BridgeChain;
  /** Sender pubkey on the source chain */
  sender: PublicKey;
  /** Recipient pubkey on the destination chain */
  recipient: PublicKey;
  /**
   * Amount to send (raw units, source-chain decimals). This leaves the sender
   * in full; the destination warp route deducts the bridge fee on release.
   */
  amount: bigint;
}

export interface BridgeIxsResult {
  /** The transferRemote instruction */
  instructions: TransactionInstruction[];
  /** Extra signer required by the transferRemote ix (the unique message keypair) */
  uniqueMessageKeypair: Keypair;
  /** Fee the destination route will deduct on release, in raw units */
  feeAmount: bigint;
  /** Amount the recipient will receive after that deduction */
  bridgeAmount: bigint;
}

export interface BridgeTransferResult {
  signature: string;
  messageId: string | null;
  /** Fee the destination route will deduct on release, in raw units */
  feeAmount: bigint;
  /** Amount the recipient will receive after that deduction */
  bridgeAmount: bigint;
}

// ─── Chain constants ───────────────────────────────────────────────

export const SOLANA_DOMAIN = 1399811149;
export const NARA_DOMAIN = 40778959;

export const SOLANA_MAILBOX = new PublicKey(
  "E588QtVUvresuXq2KoNEwAmoifCzYGpRBdHByN9KQMbi"
);
export const NARA_MAILBOX = new PublicKey(
  "EjtLD3MCBJregFKAce2pQqPtSnnmBWK5oAZ3wBifHnaH"
);

export const SPL_NOOP = new PublicKey(
  "noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV"
);

// ─── Token mint constants ─────────────────────────────────────────

export const SOLANA_USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
export const NARA_USDC_MINT = new PublicKey("8P7UGWjq86N3WUmwEgKeGHJZLcoMJqr5jnRUmeBN7YwR");
export const SOLANA_USDT_MINT = new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB");
export const NARA_USDT_MINT = new PublicKey("8yQSyqC85A9Vcqz8gTU2Bk5Y63bnC5378sgx1biTKsjd");
export const NARA_SOL_MINT = new PublicKey("7fKh7DqPZmsYPHdGvt9Qw2rZkSEGp9F5dBa3XuuuhavU");

function mailboxFor(chain: BridgeChain): PublicKey {
  return chain === "solana" ? SOLANA_MAILBOX : NARA_MAILBOX;
}

function destinationDomainFor(toChain: BridgeChain): number {
  return toChain === "solana" ? SOLANA_DOMAIN : NARA_DOMAIN;
}

// ─── Token registry ───────────────────────────────────────────────

export const BRIDGE_TOKENS: Record<string, BridgeTokenConfig> = {
  USDC: {
    symbol: "USDC",
    decimals: 6,
    minAmount: 5_000_000n, // 5 USDC
    minFee:    500_000n,   // 0.5 USDC (fee floor)
    solana: {
      warpProgram: new PublicKey("4GcZJTa8s9vxtTz97Vj1RrwKMqPkT3DiiJkvUQDwsuZP"),
      mode: "collateral",
      mint: SOLANA_USDC_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    nara: {
      warpProgram: new PublicKey("BC2j6WrdPs9xhU9CfBwJsYSnJrGq5Tcm4SEen9ENv7go"),
      mode: "synthetic",
      mint: NARA_USDC_MINT,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  },
  USDT: {
    symbol: "USDT",
    decimals: 6,
    minAmount: 5_000_000n, // 5 USDT
    minFee:    500_000n,   // 0.5 USDT (fee floor)
    solana: {
      warpProgram: new PublicKey("DCTt9H3pwwU89qC3Z4voYNThZypV68AwhYNzMNBxWXoy"),
      mode: "collateral",
      mint: SOLANA_USDT_MINT,
      tokenProgram: TOKEN_PROGRAM_ID,
    },
    nara: {
      warpProgram: new PublicKey("2q5HJaaagMxBM7GD5yR55xHN4tDZMh1gYraG1Y4wbry6"),
      mode: "synthetic",
      mint: NARA_USDT_MINT,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  },
  SOL: {
    symbol: "SOL",
    decimals: 9,
    minAmount: 100_000_000n, // 0.1 SOL
    minFee:    10_000_000n,  // 0.01 SOL (fee floor)
    solana: {
      warpProgram: new PublicKey("46MmAWwKRAt9uvn7m44NXbVq2DCWBQE2r1TDw25nyXrt"),
      mode: "native",
      mint: null,
      tokenProgram: null,
    },
    nara: {
      warpProgram: new PublicKey("6bKmjEMbjcJUnqAiNw7AXuMvUALzw5XRKiV9dBsterxg"),
      mode: "synthetic",
      mint: NARA_SOL_MINT,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    },
  },
};

/** Register a new bridge token at runtime */
export function registerBridgeToken(symbol: string, config: BridgeTokenConfig): void {
  BRIDGE_TOKENS[symbol] = config;
}

function getToken(symbol: string): BridgeTokenConfig {
  const t = BRIDGE_TOKENS[symbol];
  if (!t) throw new Error(`Unknown bridge token: ${symbol}`);
  return t;
}

// ─── PDA derivation ───────────────────────────────────────────────

export function deriveOutboxPda(mailbox: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("hyperlane"), Buffer.from("-"), Buffer.from("outbox")],
    mailbox
  );
  return pda;
}

export function deriveDispatchAuthorityPda(warpProgram: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("hyperlane_dispatcher"),
      Buffer.from("-"),
      Buffer.from("dispatch_authority"),
    ],
    warpProgram
  );
  return pda;
}

export function deriveDispatchedMessagePda(
  mailbox: PublicKey,
  uniqueMessagePubkey: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("hyperlane"),
      Buffer.from("-"),
      Buffer.from("dispatched_message"),
      Buffer.from("-"),
      uniqueMessagePubkey.toBuffer(),
    ],
    mailbox
  );
  return pda;
}

export function deriveTokenPda(warpProgram: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("hyperlane_message_recipient"),
      Buffer.from("-"),
      Buffer.from("handle"),
      Buffer.from("-"),
      Buffer.from("account_metas"),
    ],
    warpProgram
  );
  return pda;
}

export function deriveEscrowPda(warpProgram: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("hyperlane_token"),
      Buffer.from("-"),
      Buffer.from("escrow"),
    ],
    warpProgram
  );
  return pda;
}

export function deriveNativeCollateralPda(warpProgram: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("hyperlane_token"),
      Buffer.from("-"),
      Buffer.from("native_collateral"),
    ],
    warpProgram
  );
  return pda;
}

// ─── Instruction data encoder ─────────────────────────────────────

/**
 * Encodes a TransferRemote instruction body.
 * Layout:
 *   [9 bytes prefix 0x01*9] [4 bytes destinationDomain u32 LE]
 *   [32 bytes recipient]    [32 bytes amount as U256 LE]
 */
export function encodeTransferRemote(
  destinationDomain: number,
  recipient: PublicKey,
  amount: bigint
): Buffer {
  const buf = Buffer.alloc(9 + 4 + 32 + 32);
  for (let i = 0; i < 9; i++) buf[i] = 0x01;
  buf.writeUInt32LE(destinationDomain, 9);
  recipient.toBuffer().copy(buf, 13);
  buf.writeBigUInt64LE(amount, 45);
  return buf;
}

// ─── Fee calculation ──────────────────────────────────────────────

export interface FeeSplit {
  /** Total fee (max of percentage and minFee) in raw units */
  feeAmount: bigint;
  /** Net amount bridged after fee */
  bridgeAmount: bigint;
  /** Percentage part (bps) used */
  feeBps: number;
  /** Fee floor in raw units */
  minFee: bigint;
}

/**
 * Calculate the bridge fee: max(amount * bps / 10000, minFee).
 *
 * Mirrors the formula the destination warp route applies on release, so this
 * is what the recipient ends up with. `getBridgeFeeConfig` reads the live
 * parameters from the destination chain if you need to confirm them.
 */
export function calculateBridgeFee(
  amount: bigint,
  feeBps?: number,
  minFee: bigint = 0n
): FeeSplit {
  const bps = feeBps ?? DEFAULT_BRIDGE_FEE_BPS;
  if (bps < 0 || bps > BRIDGE_FEE_BPS_DENOMINATOR) {
    throw new Error(`Invalid feeBps: ${bps}`);
  }
  const pctFee = (amount * BigInt(bps)) / BigInt(BRIDGE_FEE_BPS_DENOMINATOR);
  const feeAmount = pctFee > minFee ? pctFee : minFee;
  const bridgeAmount = amount - feeAmount;
  return { feeAmount, bridgeAmount, feeBps: bps, minFee };
}

// ─── On-chain fee (charged by the destination warp route) ─────────

/** PDA holding a warp route's on-chain fee config. */
export function deriveFeeConfigPda(warpProgram: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("hyperlane_token"), Buffer.from("-"), Buffer.from("fee_config")],
    warpProgram
  )[0];
}

export interface BridgeFeeConfig {
  /** Proportional fee in basis points */
  feeBps: number;
  /** Minimum fee in destination-token raw units */
  feeFloor: bigint;
  /** Added when the recipient's token account has to be created */
  feeAtaSurcharge: bigint;
  /** Maximum fee; 0n means unbounded */
  feeCap: bigint;
}

/**
 * Read the fee parameters the destination warp route will apply on release.
 *
 * `destConnection` must point at the DESTINATION chain (the opposite of
 * `fromChain`). Returns null when that route charges nothing — either its fee
 * config has not been initialized, or that side has no on-chain fee support.
 */
export async function getBridgeFeeConfig(
  destConnection: Connection,
  token: string,
  toChain: BridgeChain
): Promise<BridgeFeeConfig | null> {
  const side = getToken(token)[toChain];
  const info = await destConnection.getAccountInfo(
    deriveFeeConfigPda(side.warpProgram)
  );
  // 1-byte init flag, bump, fee_collector_bump, then the params.
  if (!info || info.data.length < 29 || info.data[0] === 0) return null;
  const d = info.data;
  return {
    feeBps: d.readUInt16LE(3),
    feeFloor: d.readBigUInt64LE(5),
    feeAtaSurcharge: d.readBigUInt64LE(13),
    feeCap: d.readBigUInt64LE(21),
  };
}

// ─── TransferRemote instruction builder ───────────────────────────

/**
 * Build the warp route TransferRemote instruction for a given token+direction.
 * The unique message keypair must be passed in (it's a required tx signer).
 */
export function makeTransferRemoteIx(params: {
  token: string;
  fromChain: BridgeChain;
  sender: PublicKey;
  recipient: PublicKey;
  amount: bigint;
  uniqueMessageKeypair: Keypair;
}): TransactionInstruction {
  const { token, fromChain, sender, recipient, amount, uniqueMessageKeypair } =
    params;

  const tokenCfg = getToken(token);
  const side = tokenCfg[fromChain];
  const toChain: BridgeChain = fromChain === "solana" ? "nara" : "solana";

  const mailbox = mailboxFor(fromChain);
  const tokenPda = deriveTokenPda(side.warpProgram);
  const dispatchAuthPda = deriveDispatchAuthorityPda(side.warpProgram);
  const outboxPda = deriveOutboxPda(mailbox);
  const dispatchedMsgPda = deriveDispatchedMessagePda(
    mailbox,
    uniqueMessageKeypair.publicKey
  );

  // First 9 accounts are common to all modes
  const keys = [
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: SPL_NOOP, isSigner: false, isWritable: false },
    { pubkey: tokenPda, isSigner: false, isWritable: false },
    { pubkey: mailbox, isSigner: false, isWritable: false },
    { pubkey: outboxPda, isSigner: false, isWritable: true },
    { pubkey: dispatchAuthPda, isSigner: false, isWritable: false },
    { pubkey: sender, isSigner: true, isWritable: true },
    { pubkey: uniqueMessageKeypair.publicKey, isSigner: true, isWritable: false },
    { pubkey: dispatchedMsgPda, isSigner: false, isWritable: true },
  ];

  // Plugin-specific accounts
  if (side.mode === "collateral") {
    if (!side.mint || !side.tokenProgram) {
      throw new Error(`Collateral mode requires mint+tokenProgram for ${token}`);
    }
    const senderAta = getAssociatedTokenAddressSync(
      side.mint,
      sender,
      false,
      side.tokenProgram
    );
    const escrowPda = deriveEscrowPda(side.warpProgram);
    keys.push(
      { pubkey: side.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: side.mint, isSigner: false, isWritable: true },
      { pubkey: senderAta, isSigner: false, isWritable: true },
      { pubkey: escrowPda, isSigner: false, isWritable: true }
    );
  } else if (side.mode === "synthetic") {
    if (!side.mint || !side.tokenProgram) {
      throw new Error(`Synthetic mode requires mint+tokenProgram for ${token}`);
    }
    const senderAta = getAssociatedTokenAddressSync(
      side.mint,
      sender,
      false,
      side.tokenProgram
    );
    keys.push(
      { pubkey: side.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: side.mint, isSigner: false, isWritable: true },
      { pubkey: senderAta, isSigner: false, isWritable: true }
    );
  } else if (side.mode === "native") {
    const nativeCollateralPda = deriveNativeCollateralPda(side.warpProgram);
    keys.push(
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: nativeCollateralPda, isSigner: false, isWritable: true }
    );
  }

  const data = encodeTransferRemote(destinationDomainFor(toChain), recipient, amount);

  return new TransactionInstruction({
    programId: side.warpProgram,
    keys,
    data,
  });
}

// ─── High-level: build full bridge instruction set ────────────────

/**
 * Build the instructions needed to bridge tokens cross-chain.
 *
 * The full `amount` is dispatched; the destination warp route deducts the fee
 * as it releases the tokens. `feeAmount` and `bridgeAmount` in the result are
 * that deduction and what the recipient ends up with.
 */
export function makeBridgeIxs(params: BridgeTransferParams): BridgeIxsResult {
  const { token, fromChain, sender, recipient, amount } = params;

  if (amount <= 0n) throw new Error("amount must be > 0");

  // Enforce per-token minimum transfer amount
  const tokenCfg = getToken(token);
  if (amount < tokenCfg.minAmount) {
    const min = Number(tokenCfg.minAmount) / Math.pow(10, tokenCfg.decimals);
    throw new Error(
      `Bridge amount too small: minimum for ${token} is ${min} (raw ${tokenCfg.minAmount})`
    );
  }

  const split = calculateBridgeFee(amount, undefined, tokenCfg.minFee);
  if (split.bridgeAmount <= 0n) {
    throw new Error("bridge amount after fee is zero — increase amount");
  }

  const uniqueMessageKeypair = Keypair.generate();
  const transferIx = makeTransferRemoteIx({
    token,
    fromChain,
    sender,
    recipient,
    amount,
    uniqueMessageKeypair,
  });

  return {
    instructions: [transferIx],
    uniqueMessageKeypair,
    feeAmount: split.feeAmount,
    bridgeAmount: split.bridgeAmount,
  };
}

// ─── Send + confirm ───────────────────────────────────────────────

/**
 * Build, sign, and send a bridge transfer in one call.
 * `wallet` is the sender keypair on the source chain and pays fees + signs.
 *
 * `connection` must point to the SOURCE chain RPC:
 *   - fromChain: "solana" → Solana mainnet RPC
 *   - fromChain: "nara"   → Nara mainnet RPC
 */
export async function bridgeTransfer(
  connection: Connection,
  wallet: Keypair,
  params: Omit<BridgeTransferParams, "sender">,
  opts?: { skipPreflight?: boolean; computeUnitLimit?: number; computeUnitPrice?: number | "auto" }
): Promise<BridgeTransferResult> {
  const built = makeBridgeIxs({
    ...params,
    sender: wallet.publicKey,
  });

  const signature = await sendTx(
    connection,
    wallet,
    built.instructions,
    [built.uniqueMessageKeypair],
    {
      computeUnitLimit: opts?.computeUnitLimit ?? 1_400_000,
      computeUnitPrice: opts?.computeUnitPrice,
      skipPreflight: opts?.skipPreflight,
    }
  );

  // Try to extract message_id from logs
  const messageId = await extractMessageId(connection, signature);

  return {
    signature,
    messageId,
    feeAmount: built.feeAmount,
    bridgeAmount: built.bridgeAmount,
  };
}

// ─── Message ID extraction ────────────────────────────────────────

/**
 * Extract the cross-chain message_id from a dispatch tx's logs.
 * Returns null if the log is missing (tx not yet visible to RPC, etc.).
 */
export async function extractMessageId(
  connection: Connection,
  signature: string
): Promise<string | null> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx?.meta?.logMessages) return null;
  for (const log of tx.meta.logMessages) {
    const m = log.match(/Dispatched message to \d+, ID (0x[0-9a-fA-F]+)/);
    if (m && m[1]) return m[1];
  }
  return null;
}

// ─── Message delivery status ──────────────────────────────────────

export interface MessageStatus {
  /** Whether the message has been processed on the destination chain */
  delivered: boolean;
  /** Destination chain tx signature (null if not yet delivered) */
  deliverySignature: string | null;
}

/**
 * Query whether a cross-chain message has been delivered on the destination chain.
 *
 * Scans recent transactions on the destination Mailbox for the message_id.
 * The Hyperlane inbox emits: "Hyperlane inbox processed message 0x..."
 *
 * @param destConnection - connection to the DESTINATION chain RPC
 * @param messageId      - the 0x-prefixed message ID from extractMessageId()
 * @param toChain        - "solana" | "nara" (which chain to check)
 * @param opts.limit     - how many recent Mailbox txs to scan (default 50)
 */
export async function queryMessageStatus(
  destConnection: Connection,
  messageId: string,
  toChain: BridgeChain,
  opts?: { limit?: number }
): Promise<MessageStatus> {
  const mailbox = mailboxFor(toChain);
  const limit = opts?.limit ?? 50;

  const sigs = await destConnection.getSignaturesForAddress(mailbox, {
    limit,
  });
  const validSigs = sigs.filter((s) => !s.err).map((s) => s.signature);
  if (!validSigs.length) {
    return { delivered: false, deliverySignature: null };
  }

  // Batch-fetch transactions in a single JSON-RPC call
  const txs = await destConnection.getTransactions(validSigs, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  for (let i = 0; i < txs.length; i++) {
    const tx = txs[i];
    if (!tx?.meta?.logMessages) continue;
    for (const log of tx.meta.logMessages) {
      if (log.includes(messageId)) {
        return { delivered: true, deliverySignature: validSigs[i] ?? null };
      }
    }
  }

  return { delivered: false, deliverySignature: null };
}

// ─── Validator signature status (S3) ──────────────────────────────

const S3_BASE = "https://nara-hyperlane.s3.us-west-1.amazonaws.com";

/** Validator S3 prefixes per source chain */
const VALIDATOR_PREFIXES: Record<BridgeChain, string[]> = {
  solana: ["validator-solana-1", "validator-solana-2", "validator-solana-3"],
  nara: ["validator-nara-1", "validator-nara-2", "validator-nara-3"],
};

export interface ValidatorSignature {
  folder: string;
  signed: boolean;
  latestIndex: number;
  serializedSignature: string | null;
}

export interface MessageSignatureStatus {
  messageId: string;
  /** Merkle tree checkpoint index for this message (null if not found) */
  checkpointIndex: number | null;
  sourceChain: BridgeChain;
  validators: ValidatorSignature[];
  signedCount: number;
  totalValidators: number;
  /** All validators have signed */
  fullySigned: boolean;
}

async function s3Json<T = unknown>(key: string): Promise<T | null> {
  try {
    const resp = await fetch(`${S3_BASE}/${key}`);
    if (!resp.ok) return null;
    return (await resp.json()) as T;
  } catch {
    return null;
  }
}

interface S3Checkpoint {
  value: {
    checkpoint: {
      merkle_tree_hook_address: string;
      mailbox_domain: number;
      root: string;
      index: number;
    };
    message_id: string;
  };
  signature: { r: string; s: string; v: number };
  serialized_signature: string;
}

/**
 * Query Hyperlane validator signatures for a cross-chain message from AWS S3.
 *
 * Each validator stores signed merkle checkpoints in S3. Each checkpoint
 * at index N contains the message_id of the Nth dispatched message and the
 * validator's ECDSA signature over the merkle root.
 *
 * All validators are scanned concurrently (one goroutine per validator).
 *
 * @param messageId   - 0x-prefixed message ID from extractMessageId()
 * @param sourceChain - source chain where the message was dispatched
 * @param opts.maxScan - how many checkpoints to scan backwards (default 200)
 */
export async function queryMessageSignatures(
  messageId: string,
  sourceChain: BridgeChain,
  opts?: { maxScan?: number }
): Promise<MessageSignatureStatus> {
  const prefixes = VALIDATOR_PREFIXES[sourceChain];
  const maxScan = opts?.maxScan ?? 200;

  // Each validator independently: fetch latest index → reverse-scan for messageId
  const results = await Promise.all(
    prefixes.map((folder) => scanValidator(folder, messageId, maxScan))
  );

  // checkpointIndex comes from whichever validator found it
  const found = results.find((r) => r.checkpointIndex !== null);
  const checkpointIndex = found?.checkpointIndex ?? null;

  const validators: ValidatorSignature[] = results.map((r) => ({
    folder: r.folder,
    signed: r.signed,
    latestIndex: r.latestIndex,
    serializedSignature: r.serializedSignature,
  }));

  const signedCount = validators.filter((v) => v.signed).length;
  return {
    messageId,
    checkpointIndex,
    sourceChain,
    validators,
    signedCount,
    totalValidators: prefixes.length,
    fullySigned: signedCount === prefixes.length,
  };
}

async function scanValidator(
  folder: string,
  messageId: string,
  maxScan: number
): Promise<ValidatorSignature & { checkpointIndex: number | null }> {
  const latestIndex = await s3Json<number>(
    `${folder}/checkpoint_latest_index.json`
  );
  if (latestIndex === null) {
    return {
      folder,
      signed: false,
      latestIndex: -1,
      serializedSignature: null,
      checkpointIndex: null,
    };
  }

  const minIndex = Math.max(0, latestIndex - maxScan);
  for (let i = latestIndex; i >= minIndex; i--) {
    const cp = await s3Json<S3Checkpoint>(
      `${folder}/checkpoint_${i}_with_id.json`
    );
    if (cp?.value?.message_id === messageId) {
      return {
        folder,
        signed: true,
        latestIndex,
        serializedSignature: cp.serialized_signature,
        checkpointIndex: i,
      };
    }
  }

  return {
    folder,
    signed: false,
    latestIndex,
    serializedSignature: null,
    checkpointIndex: null,
  };
}
