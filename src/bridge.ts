/**
 * Cross-chain bridge SDK between Nara and Solana via Hyperlane warp routes.
 *
 * Supports two assets out of the box (USDC, SOL) in both directions, with
 * an in-tx fee deduction (default 0.5%) sent to BRIDGE_FEE_RECIPIENT.
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
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  BRIDGE_FEE_BPS_DENOMINATOR,
  DEFAULT_BRIDGE_FEE_BPS,
  DEFAULT_BRIDGE_FEE_RECIPIENT_SOLANA,
  DEFAULT_BRIDGE_FEE_RECIPIENT_NARA,
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
  solana: BridgeTokenSide;
  nara: BridgeTokenSide;
}

export interface BridgeTransferParams {
  /** Token symbol from BRIDGE_TOKENS (e.g. "USDC", "SOL") */
  token: string;
  /** Source chain — fee is deducted on this chain in the source token */
  fromChain: BridgeChain;
  /** Sender pubkey on the source chain */
  sender: PublicKey;
  /** Recipient pubkey on the destination chain */
  recipient: PublicKey;
  /** Gross amount (raw units, source-chain decimals). Fee is deducted from this. */
  amount: bigint;
  /** Optional fee bps override (defaults to BRIDGE_FEE_BPS) */
  feeBps?: number;
  /** Optional fee recipient override (defaults to BRIDGE_FEE_RECIPIENT) */
  feeRecipient?: PublicKey;
  /** Skip fee deduction entirely */
  skipFee?: boolean;
}

export interface BridgeIxsResult {
  /** All instructions in order: [feeIx?, atapayerIx?, transferRemoteIx] */
  instructions: TransactionInstruction[];
  /** Extra signer required by the transferRemote ix (the unique message keypair) */
  uniqueMessageKeypair: Keypair;
  /** Fee deducted in source token raw units */
  feeAmount: bigint;
  /** Net amount actually bridged */
  bridgeAmount: bigint;
}

export interface BridgeTransferResult {
  signature: string;
  messageId: string | null;
  feeAmount: bigint;
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

// ─── Fee recipient (runtime override, per chain) ──────────────────

const _feeRecipientOverrides: Record<BridgeChain, PublicKey | null> = {
  solana: null,
  nara: null,
};

/**
 * Override the bridge fee recipient for a specific source chain at runtime.
 * Pass `null` as recipient to clear the override and fall back to the default.
 */
export function setBridgeFeeRecipient(
  chain: BridgeChain,
  recipient: PublicKey | string | null
): void {
  if (recipient === null) {
    _feeRecipientOverrides[chain] = null;
    return;
  }
  _feeRecipientOverrides[chain] =
    typeof recipient === "string" ? new PublicKey(recipient) : recipient;
}

/** Get the current fee recipient for a source chain (override or default). */
export function getBridgeFeeRecipient(chain: BridgeChain): PublicKey {
  const override = _feeRecipientOverrides[chain];
  if (override) return override;
  const defaultAddr =
    chain === "solana"
      ? DEFAULT_BRIDGE_FEE_RECIPIENT_SOLANA
      : DEFAULT_BRIDGE_FEE_RECIPIENT_NARA;
  return new PublicKey(defaultAddr);
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
  feeAmount: bigint;
  bridgeAmount: bigint;
  feeBps: number;
}

export function calculateBridgeFee(amount: bigint, feeBps?: number): FeeSplit {
  const bps = feeBps ?? DEFAULT_BRIDGE_FEE_BPS;
  if (bps < 0 || bps > BRIDGE_FEE_BPS_DENOMINATOR) {
    throw new Error(`Invalid feeBps: ${bps}`);
  }
  const feeAmount = (amount * BigInt(bps)) / BigInt(BRIDGE_FEE_BPS_DENOMINATOR);
  const bridgeAmount = amount - feeAmount;
  return { feeAmount, bridgeAmount, feeBps: bps };
}

// ─── Fee instruction builder ──────────────────────────────────────

/**
 * Build the fee-collection instructions on the source chain in the source token.
 *
 * For SPL tokens: returns [createIdempotentATA(feeRecipient), transferChecked].
 * For native SOL on Solana: returns [SystemProgram.transfer].
 *
 * Returns empty array if feeAmount == 0.
 */
export function makeBridgeFeeIxs(params: {
  token: string;
  fromChain: BridgeChain;
  sender: PublicKey;
  feeRecipient: PublicKey;
  feeAmount: bigint;
}): TransactionInstruction[] {
  const { token, fromChain, sender, feeRecipient, feeAmount } = params;
  if (feeAmount === 0n) return [];

  const tokenCfg = getToken(token);
  const side = tokenCfg[fromChain];

  // Native SOL → SystemProgram.transfer
  if (side.mode === "native") {
    return [
      SystemProgram.transfer({
        fromPubkey: sender,
        toPubkey: feeRecipient,
        lamports: feeAmount,
      }),
    ];
  }

  // SPL token (collateral or synthetic) → ensure recipient ATA + transferChecked
  if (!side.mint || !side.tokenProgram) {
    throw new Error(`Token ${token} on ${fromChain} missing mint/tokenProgram`);
  }

  const senderAta = getAssociatedTokenAddressSync(
    side.mint,
    sender,
    false,
    side.tokenProgram
  );
  const recipientAta = getAssociatedTokenAddressSync(
    side.mint,
    feeRecipient,
    true, // allowOwnerOffCurve — fee recipient may be a PDA
    side.tokenProgram
  );

  return [
    createAssociatedTokenAccountIdempotentInstruction(
      sender,
      recipientAta,
      feeRecipient,
      side.mint,
      side.tokenProgram
    ),
    createTransferCheckedInstruction(
      senderAta,
      side.mint,
      recipientAta,
      sender,
      feeAmount,
      tokenCfg.decimals,
      [],
      side.tokenProgram
    ),
  ];
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
 * Build all instructions needed to bridge tokens cross-chain with in-tx fee.
 * Returns the instructions, the unique-message keypair (must sign the tx),
 * and the fee/bridge amounts.
 */
export function makeBridgeIxs(params: BridgeTransferParams): BridgeIxsResult {
  const {
    token,
    fromChain,
    sender,
    recipient,
    amount,
    feeBps,
    feeRecipient,
    skipFee,
  } = params;

  if (amount <= 0n) throw new Error("amount must be > 0");

  const split = skipFee
    ? { feeAmount: 0n, bridgeAmount: amount, feeBps: 0 }
    : calculateBridgeFee(amount, feeBps);

  if (split.bridgeAmount <= 0n) {
    throw new Error("bridge amount after fee is zero — increase amount or lower feeBps");
  }

  const recipientForFee = feeRecipient ?? getBridgeFeeRecipient(fromChain);
  const feeIxs = makeBridgeFeeIxs({
    token,
    fromChain,
    sender,
    feeRecipient: recipientForFee,
    feeAmount: split.feeAmount,
  });

  const uniqueMessageKeypair = Keypair.generate();
  const transferIx = makeTransferRemoteIx({
    token,
    fromChain,
    sender,
    recipient,
    amount: split.bridgeAmount,
    uniqueMessageKeypair,
  });

  return {
    instructions: [...feeIxs, transferIx],
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
