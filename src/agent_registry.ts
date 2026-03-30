/**
 * Agent Registry SDK - interact with nara-agent-registry on-chain agent registry
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import type { NaraAgentRegistry } from "./idls/nara_agent_registry";
import { DEFAULT_AGENT_REGISTRY_PROGRAM_ID } from "./constants";
import { sendTx } from "./tx";

import naraAgentRegistryIdl from "./idls/nara_agent_registry.json";

// ─── Constants ───────────────────────────────────────────────────

/** Max bytes written per write_to_buffer call (Solana tx size limit) */
const DEFAULT_CHUNK_SIZE = 800;

/** MemoryBuffer account header: 8 discriminator + 32 authority + 32 agent + 4 total_len + 4 write_offset + 64 _reserved */
const BUFFER_HEADER_SIZE = 144;

/** AgentMemory account header: 8 discriminator + 32 agent + 64 _reserved */
const MEMORY_HEADER_SIZE = 104;

// ─── Types ───────────────────────────────────────────────────────

export interface AgentRecord {
  authority: PublicKey;
  agentId: string;
  pendingBuffer: PublicKey | null;
  /** PublicKey.default means no memory yet */
  memory: PublicKey;
  /** 0 = no memory, increments on each upload */
  version: number;
  /** Referral agent ID, null if none */
  referralId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface AgentInfo {
  record: AgentRecord;
  bio: string | null;
  metadata: string | null;
}

export interface AgentTwitterInfo {
  agentId: string;
  status: number;
  verifiedAt: number;
  username: string;
  tweetUrl: string;
}

export interface TweetVerifyInfo {
  agentId: string;
  status: number;
  submittedAt: number;
  lastRewardedAt: number;
  tweetId: bigint;
}

export interface TweetRecordInfo {
  agent: PublicKey;
  approvedAt: number;
  tweetId: bigint;
}

export type MemoryMode = "new" | "update" | "append" | "auto";

export interface AgentRegistryOptions {
  programId?: string;
  /** Bytes per write_to_buffer call (default 800) */
  chunkSize?: number;
  /**
   * Called after each write_to_buffer transaction.
   */
  onProgress?: (chunkIndex: number, totalChunks: number, signature: string) => void;
}

// ─── Anchor helpers ──────────────────────────────────────────────

function createProgram(
  connection: Connection,
  wallet: Keypair,
  programId?: string
): Program<NaraAgentRegistry> {
  const idl = naraAgentRegistryIdl;
  const pid = programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID;
  const idlWithPid = { ...idl, address: pid };
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return new Program<NaraAgentRegistry>(idlWithPid as any, provider);
}

// ─── PDA helpers ─────────────────────────────────────────────────

function getAgentPda(programId: PublicKey, agentId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(agentId)],
    programId
  );
  return pda;
}

function getConfigPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );
  return pda;
}

function getBioPda(programId: PublicKey, agentPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("bio"), agentPubkey.toBuffer()],
    programId
  );
  return pda;
}

function getMetaPda(programId: PublicKey, agentPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("meta"), agentPubkey.toBuffer()],
    programId
  );
  return pda;
}

function getPointMintPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("point_mint")],
    programId
  );
  return pda;
}

function getMintAuthorityPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint_authority")],
    programId
  );
  return pda;
}

function getRefereeMintPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("referee_mint")],
    programId
  );
  return pda;
}

function getRefereeActivityMintPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("referee_activity_mint")],
    programId
  );
  return pda;
}

function getTreasuryPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    programId
  );
  return pda;
}

function getTwitterPda(programId: PublicKey, agentPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("twitter"), agentPda.toBuffer()],
    programId
  );
  return pda;
}

function getTweetVerifyPda(programId: PublicKey, agentPda: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("tweet_verify"), agentPda.toBuffer()],
    programId
  );
  return pda;
}

function getTwitterHandlePda(programId: PublicKey, username: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("twitter_handle"), Buffer.from(username)],
    programId
  );
  return pda;
}

/**
 * Build referral-related accounts for register_agent / log_activity.
 * Returns the referral agent PDA, its authority, and the authority's ATA for point_mint.
 */
async function resolveReferralAccounts(
  connection: Connection,
  referralAgentId: string,
  programId: PublicKey,
  pointMint: PublicKey
): Promise<{ referralAgent: PublicKey; referralAuthority: PublicKey; referralPointAccount: PublicKey }> {
  const referralAgent = getAgentPda(programId, referralAgentId);
  const accountInfo = await connection.getAccountInfo(referralAgent);
  if (!accountInfo) {
    throw new Error(`Referral agent "${referralAgentId}" not found`);
  }
  // Authority is first 32 bytes after 8-byte discriminator
  const referralAuthority = new PublicKey(accountInfo.data.subarray(8, 40));
  const referralPointAccount = getAssociatedTokenAddressSync(
    pointMint, referralAuthority, true, TOKEN_2022_PROGRAM_ID
  );
  return { referralAgent, referralAuthority, referralPointAccount };
}

/** Bio/Metadata header: 8-byte discriminator + 64-byte _reserved */
const BIO_META_HEADER_SIZE = 72;

/**
 * Parse AgentRecord from raw account data (bytemuck zero-copy layout).
 * Layout (after 8-byte discriminator):
 *   32 authority | 32 pending_buffer | 32 memory |
 *   8 created_at | 8 updated_at |
 *   4 version | 4 agent_id_len | 32 agent_id |
 *   4 referral_id_len | 32 referral_id | 4 _padding | 64 _reserved
 */
function parseAgentRecordData(data: Buffer | Uint8Array): AgentRecord {
  const buf = Buffer.from(data);
  let offset = 8; // skip discriminator

  const authority = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const pendingBuffer = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const memory = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;

  const createdAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const updatedAt = Number(buf.readBigInt64LE(offset)); offset += 8;

  const version = buf.readUInt32LE(offset); offset += 4;
  const agentIdLen = buf.readUInt32LE(offset); offset += 4;
  const agentId = buf.subarray(offset, offset + agentIdLen).toString("utf-8"); offset += 32;

  const referralIdLen = buf.readUInt32LE(offset); offset += 4;
  const referralId = referralIdLen > 0
    ? buf.subarray(offset, offset + referralIdLen).toString("utf-8")
    : null;

  return {
    authority,
    agentId,
    pendingBuffer: pendingBuffer.equals(PublicKey.default) ? null : pendingBuffer,
    memory,
    version,
    referralId,
    createdAt,
    updatedAt,
  };
}

/**
 * Parse AgentTwitter from raw account data (zero-copy layout).
 * Layout (after 8-byte discriminator):
 *   8 agent_id_len | 32 agent_id | 8 status | 8 verified_at |
 *   8 username_len | 8 tweet_url_len | 32 username | 256 tweet_url | ...
 */
function parseAgentTwitterData(data: Buffer | Uint8Array): AgentTwitterInfo {
  const buf = Buffer.from(data);
  let offset = 8; // skip discriminator
  const agentIdLen = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const agentId = buf.subarray(offset, offset + agentIdLen).toString("utf-8"); offset += 32;
  const status = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const verifiedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const usernameLen = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const tweetUrlLen = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const username = buf.subarray(offset, offset + usernameLen).toString("utf-8"); offset += 32;
  const tweetUrl = buf.subarray(offset, offset + tweetUrlLen).toString("utf-8");
  return { agentId, status, verifiedAt, username, tweetUrl };
}

/**
 * Parse TweetVerify from raw account data (zero-copy layout).
 * Layout (after 8-byte discriminator):
 *   8 agent_id_len | 32 agent_id | 8 status | 8 submitted_at |
 *   8 last_rewarded_at | 8 tweet_url_len | 256 tweet_url | ...
 */
function parseTweetVerifyData(data: Buffer | Uint8Array): TweetVerifyInfo {
  const buf = Buffer.from(data);
  let offset = 8;
  const agentIdLen = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const agentId = buf.subarray(offset, offset + agentIdLen).toString("utf-8"); offset += 32;
  const status = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const submittedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const lastRewardedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const tweetId = buf.readBigUInt64LE(offset) | (buf.readBigUInt64LE(offset + 8) << 64n); offset += 16;
  return { agentId, status, submittedAt, lastRewardedAt, tweetId };
}

/**
 * Deserialize a string from raw bio/metadata account data.
 * Layout: 8-byte discriminator + 64-byte _reserved + 4-byte u32 length + UTF-8 bytes.
 */
function deserializeRawString(data: Buffer): string {
  const len = data.readUInt32LE(BIO_META_HEADER_SIZE);
  const start = BIO_META_HEADER_SIZE + 4;
  return data.subarray(start, start + len).toString("utf-8");
}

// ─── Read-only SDK functions ────────────────────────────────────

/**
 * Fetch an agent's on-chain record.
 * Uses raw account data parsing because AgentRecord is a bytemuck (zero-copy) account.
 */
export async function getAgentRecord(
  connection: Connection,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<AgentRecord> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const agentPda = getAgentPda(pid, agentId);
  const accountInfo = await connection.getAccountInfo(agentPda);
  if (!accountInfo) {
    throw new Error(`Agent "${agentId}" not found`);
  }
  return parseAgentRecordData(accountInfo.data);
}

/**
 * Fetch an agent's record, bio, and metadata in one call.
 */
export async function getAgentInfo(
  connection: Connection,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<AgentInfo> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const agentPda = getAgentPda(pid, agentId);
  const accountInfo = await connection.getAccountInfo(agentPda);
  if (!accountInfo) {
    throw new Error(`Agent "${agentId}" not found`);
  }
  const record = parseAgentRecordData(accountInfo.data);

  const bioPda = getBioPda(pid, agentPda);
  const metaPda = getMetaPda(pid, agentPda);

  let bio: string | null = null;
  let metadata: string | null = null;

  try {
    const bioInfo = await connection.getAccountInfo(bioPda);
    if (bioInfo) bio = deserializeRawString(Buffer.from(bioInfo.data));
  } catch {
    // account not created yet
  }

  try {
    const metaInfo = await connection.getAccountInfo(metaPda);
    if (metaInfo) metadata = deserializeRawString(Buffer.from(metaInfo.data));
  } catch {
    // account not created yet
  }

  return { record, bio, metadata };
}

/**
 * Read the raw memory bytes stored in an agent's AgentMemory account.
 * Returns null if the agent has no memory yet.
 */
export async function getAgentMemory(
  connection: Connection,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<Buffer | null> {
  const record = await getAgentRecord(connection, agentId, options);
  if (record.memory.equals(PublicKey.default)) {
    return null;
  }

  const accountInfo = await connection.getAccountInfo(record.memory);
  if (!accountInfo) return null;

  // Memory bytes start after the header (8 discriminator + 32 agent pubkey + 64 _reserved)
  return Buffer.from(accountInfo.data.slice(MEMORY_HEADER_SIZE));
}

/**
 * Fetch the global program configuration.
 */
export async function getConfig(
  connection: Connection,
  options?: AgentRegistryOptions
): Promise<{
  admin: PublicKey;
  feeVault: PublicKey;
  pointMint: PublicKey;
  refereeMint: PublicKey;
  refereeActivityMint: PublicKey;
  registerFee: number;
  pointsSelf: number;
  pointsReferral: number;
  referralDiscountBps: number;
  referralShareBps: number;
  referralRegisterPoints: number;
  activityReward: number;
  referralActivityReward: number;
  twitterVerifier: PublicKey;
  twitterVerificationFee: number;
  twitterVerificationReward: number;
  twitterVerificationPoints: number;
  tweetVerifyReward: number;
  tweetVerifyPoints: number;
  registerFee7: number;
  registerFee6: number;
  registerFee5: number;
}> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const configPda = getConfigPda(pid);
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    throw new Error("Program config not initialized");
  }
  const buf = Buffer.from(accountInfo.data);
  let offset = 8; // skip discriminator
  const admin = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const feeVault = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const pointMint = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const refereeMint = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const refereeActivityMint = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const registerFee = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const pointsSelf = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const pointsReferral = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const referralDiscountBps = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const referralShareBps = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const referralRegisterPoints = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const activityReward = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const referralActivityReward = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const twitterVerifier = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const twitterVerificationFee = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const twitterVerificationReward = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const twitterVerificationPoints = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const tweetVerifyReward = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const tweetVerifyPoints = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const registerFee7 = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const registerFee6 = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const registerFee5 = Number(buf.readBigUInt64LE(offset));
  return { admin, feeVault, pointMint, refereeMint, refereeActivityMint, registerFee, pointsSelf, pointsReferral, referralDiscountBps, referralShareBps, referralRegisterPoints, activityReward, referralActivityReward, twitterVerifier, twitterVerificationFee, twitterVerificationReward, twitterVerificationPoints, tweetVerifyReward, tweetVerifyPoints, registerFee7, registerFee6, registerFee5 };
}

// ─── Agent CRUD ─────────────────────────────────────────────────

/**
 * Register a new agent on-chain (without referral). Charges the program's registration fee.
 */
export async function registerAgent(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<{ signature: string; agentPubkey: PublicKey }> {
  if (/[A-Z]/.test(agentId)) {
    throw new Error(`Agent ID must not contain uppercase letters: "${agentId}"`);
  }
  const program = createProgram(connection, wallet, options?.programId);

  const ix = await program.methods
    .registerAgent(agentId)
    .accounts({
      authority: wallet.publicKey,
    } as any)
    .instruction();
  const signature = await sendTx(connection, wallet, [ix]);

  const agentPubkey = getAgentPda(program.programId, agentId);
  return { signature, agentPubkey };
}

/**
 * Register a new agent on-chain with a referral agent.
 * Charges the referral registration fee and awards referral points/tokens.
 */
export async function registerAgentWithReferral(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  referralAgentId: string,
  options?: AgentRegistryOptions
): Promise<{ signature: string; agentPubkey: PublicKey }> {
  if (/[A-Z]/.test(agentId)) {
    throw new Error(`Agent ID must not contain uppercase letters: "${agentId}"`);
  }
  const program = createProgram(connection, wallet, options?.programId);
  const pointMint = getPointMintPda(program.programId);

  const { referralAgent, referralAuthority, referralPointAccount } =
    await resolveReferralAccounts(connection, referralAgentId, program.programId, pointMint);

  const refereeMint = getRefereeMintPda(program.programId);
  const referralRefereeAccount = getAssociatedTokenAddressSync(
    refereeMint, referralAuthority, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .registerAgentWithReferral(agentId)
    .accounts({
      authority: wallet.publicKey,
      referralAgent,
      referralAuthority,
      referralPointAccount,
      referralRefereeAccount,
    } as any)
    .instruction();
  const signature = await sendTx(connection, wallet, [ix]);

  const agentPubkey = getAgentPda(program.programId, agentId);
  return { signature, agentPubkey };
}

/**
 * Transfer agent ownership to a new authority.
 */
export async function transferAgentAuthority(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  newAuthority: PublicKey,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .transferAuthority(agentId, newAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Delete an agent and reclaim all rent. Closes the AgentRecord, bio,
 * metadata, and memory accounts.
 */
export async function deleteAgent(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const record = await getAgentRecord(connection, agentId, options);

  // When no memory exists, pass authority pubkey as placeholder
  const memoryAccount = record.memory.equals(PublicKey.default)
    ? wallet.publicKey
    : record.memory;

  const ix = await program.methods
    .deleteAgent(agentId)
    .accounts({
      authority: wallet.publicKey,
      memoryAccount,
    } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

// ─── Bio & Metadata ─────────────────────────────────────────────

/**
 * Set or update the agent's bio.
 */
export async function setBio(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  bio: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setBio(agentId, bio)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set or update the agent's metadata (typically JSON).
 */
export async function setMetadata(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  data: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setMetadata(agentId, data)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

// ─── Memory Upload ──────────────────────────────────────────────

/**
 * Upload agent memory via chunked buffer mechanism.
 *
 * Handles the full workflow:
 * 1. Creates buffer account (client-allocated)
 * 2. Calls init_buffer
 * 3. Writes data in chunks via write_to_buffer
 * 4. Finalizes based on mode (new / update / append)
 *
 * @param mode - "auto" (default): uses "new" if no memory exists, "update" otherwise.
 *               "append" must be specified explicitly.
 * Returns the finalize transaction signature.
 */
export async function uploadMemory(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  data: Buffer | Uint8Array,
  options?: AgentRegistryOptions,
  mode: MemoryMode = "auto"
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const totalLen = data.length;
  const record = await getAgentRecord(connection, agentId, options);
  const existingMemory = record.memory;
  const hasMemory = !existingMemory.equals(PublicKey.default);

  // Resolve mode
  let resolvedMode: "new" | "update" | "append";
  if (mode === "auto") {
    resolvedMode = hasMemory ? "update" : "new";
  } else {
    resolvedMode = mode;
  }

  // ── Step 1: create buffer account ────────────────────────────
  const bufferKeypair = Keypair.generate();
  const bufferSize = BUFFER_HEADER_SIZE + totalLen;
  const bufferRent = await connection.getMinimumBalanceForRentExemption(bufferSize);

  const createBufferIx = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: bufferKeypair.publicKey,
    lamports: bufferRent,
    space: bufferSize,
    programId: program.programId,
  });
  await sendTx(connection, wallet, [createBufferIx], [bufferKeypair]);

  // ── Step 2: init_buffer ───────────────────────────────────────
  const initBufferIx = await program.methods
    .initBuffer(agentId, totalLen)
    .accounts({
      authority: wallet.publicKey,
      buffer: bufferKeypair.publicKey,
    } as any)
    .instruction();
  await sendTx(connection, wallet, [initBufferIx]);

  // ── Step 3: write chunks ──────────────────────────────────────
  const totalChunks = Math.ceil(totalLen / chunkSize);
  let offset = 0;
  let chunkIndex = 0;
  while (offset < totalLen) {
    const chunk = Buffer.from(data.slice(offset, offset + chunkSize));
    const writeIx = await program.methods
      .writeToBuffer(agentId, offset, chunk)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
      } as any)
      .instruction();
    const writeSig = await sendTx(connection, wallet, [writeIx]);
    offset += chunk.length;
    chunkIndex++;
    options?.onProgress?.(chunkIndex, totalChunks, writeSig);
  }

  // ── Step 4: finalize ──────────────────────────────────────────
  if (resolvedMode === "append") {
    // Append: realloc existing memory in-place, no new account needed
    const appendIx = await program.methods
      .finalizeMemoryAppend(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        memory: existingMemory,
      } as any)
      .instruction();
    return sendTx(connection, wallet, [appendIx]);
  }

  // new / update: create a new memory account
  const memoryKeypair = Keypair.generate();
  const memorySize = MEMORY_HEADER_SIZE + totalLen;
  const memoryRent = await connection.getMinimumBalanceForRentExemption(memorySize);

  const createMemoryIx = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: memoryKeypair.publicKey,
    lamports: memoryRent,
    space: memorySize,
    programId: program.programId,
  });
  await sendTx(connection, wallet, [createMemoryIx], [memoryKeypair]);

  if (resolvedMode === "update") {
    const updateIx = await program.methods
      .finalizeMemoryUpdate(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newMemory: memoryKeypair.publicKey,
        oldMemory: existingMemory,
      } as any)
      .instruction();
    return sendTx(connection, wallet, [updateIx]);
  } else {
    // "new"
    const newIx = await program.methods
      .finalizeMemoryNew(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newMemory: memoryKeypair.publicKey,
      } as any)
      .instruction();
    return sendTx(connection, wallet, [newIx]);
  }
}

/**
 * Discard the agent's pending upload buffer without finalizing.
 */
export async function closeBuffer(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const record = await getAgentRecord(connection, agentId, options);
  if (!record.pendingBuffer) {
    throw new Error(`Agent "${agentId}" has no pending buffer`);
  }
  const ix = await program.methods
    .closeBuffer(agentId)
    .accounts({ authority: wallet.publicKey, buffer: record.pendingBuffer } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

// ─── Activity Logging ───────────────────────────────────────────

/**
 * Log an activity event for the agent (emits on-chain event).
 */
export async function logActivity(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .logActivity(agentId, model, activity, log)
    .accounts({
      authority: wallet.publicKey,
      authorityPointAccount,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Log an activity event with a referral agent to earn referral rewards.
 */
export async function logActivityWithReferral(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  referralAgentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID
  );

  const { referralAgent, referralAuthority, referralPointAccount } =
    await resolveReferralAccounts(connection, referralAgentId, program.programId, pointMint);

  const refereeActivityMint = getRefereeActivityMintPda(program.programId);
  const referralRefereeActivityAccount = getAssociatedTokenAddressSync(
    refereeActivityMint, referralAuthority, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .logActivityWithReferral(agentId, model, activity, log)
    .accounts({
      authority: wallet.publicKey,
      authorityPointAccount,
      referralAgent,
      referralAuthority,
      referralPointAccount,
      referralRefereeActivityAccount,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Build a logActivity instruction without sending it.
 * Useful for appending to an existing transaction.
 */
export async function makeLogActivityIx(
  connection: Connection,
  authority: PublicKey,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  options?: AgentRegistryOptions
): Promise<TransactionInstruction> {
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, authority, true, TOKEN_2022_PROGRAM_ID
  );

  return program.methods
    .logActivity(agentId, model, activity, log)
    .accounts({
      authority,
      authorityPointAccount,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    } as any)
    .instruction();
}

/**
 * Build a logActivityWithReferral instruction without sending it.
 */
export async function makeLogActivityWithReferralIx(
  connection: Connection,
  authority: PublicKey,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  referralAgentId: string,
  options?: AgentRegistryOptions
): Promise<TransactionInstruction> {
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, authority, true, TOKEN_2022_PROGRAM_ID
  );

  const { referralAgent, referralAuthority, referralPointAccount } =
    await resolveReferralAccounts(connection, referralAgentId, program.programId, pointMint);

  const refereeActivityMint = getRefereeActivityMintPda(program.programId);
  const referralRefereeActivityAccount = getAssociatedTokenAddressSync(
    refereeActivityMint, referralAuthority, true, TOKEN_2022_PROGRAM_ID
  );

  return program.methods
    .logActivityWithReferral(agentId, model, activity, log)
    .accounts({
      authority,
      authorityPointAccount,
      referralAgent,
      referralAuthority,
      referralPointAccount,
      referralRefereeActivityAccount,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
    } as any)
    .instruction();
}

// ─── Referral ────────────────────────────────────────────────────

/**
 * Set a referral agent for the given agent. Can only be set once.
 * The referral agent must exist and cannot be the agent itself.
 */
export async function setReferral(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  referralAgentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const referralAgent = getAgentPda(program.programId, referralAgentId);

  // Resolve referral authority for referee token minting
  const accountInfo = await connection.getAccountInfo(referralAgent);
  if (!accountInfo) {
    throw new Error(`Referral agent "${referralAgentId}" not found`);
  }
  const referralAuthority = new PublicKey(accountInfo.data.subarray(8, 40));

  const refereeMint = getRefereeMintPda(program.programId);
  const referralRefereeAccount = getAssociatedTokenAddressSync(
    refereeMint, referralAuthority, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .setReferral(agentId)
    .accounts({
      authority: wallet.publicKey,
      referralAgent,
      referralAuthority,
      referralRefereeAccount,
    } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

// ─── Admin functions ────────────────────────────────────────────

/**
 * Initialize the program configuration (one-time setup).
 * The caller becomes the admin.
 */
export async function initConfig(
  connection: Connection,
  wallet: Keypair,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .initConfig()
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the program admin (admin-only).
 */
export async function updateAdmin(
  connection: Connection,
  wallet: Keypair,
  newAdmin: PublicKey,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .updateAdmin(newAdmin)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Withdraw accumulated fees from the fee vault (admin-only).
 */
export async function withdrawFees(
  connection: Connection,
  wallet: Keypair,
  amount: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const amt = typeof amount === "number" ? new BN(amount) : amount;
  const ix = await program.methods
    .withdrawFees(amt)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the registration fee in lamports (admin-only).
 */
export async function updateRegisterFee(
  connection: Connection,
  wallet: Keypair,
  fee: number | BN,
  fee7: number | BN,
  fee6: number | BN,
  fee5: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const f = typeof fee === "number" ? new BN(fee) : fee;
  const f7 = typeof fee7 === "number" ? new BN(fee7) : fee7;
  const f6 = typeof fee6 === "number" ? new BN(fee6) : fee6;
  const f5 = typeof fee5 === "number" ? new BN(fee5) : fee5;
  const ix = await program.methods
    .updateRegisterFee(f, f7, f6, f5)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the points configuration (admin-only).
 * Sets how many points are awarded per activity and per referral.
 */
export async function updatePointsConfig(
  connection: Connection,
  wallet: Keypair,
  pointsSelf: number | BN,
  pointsReferral: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ps = typeof pointsSelf === "number" ? new BN(pointsSelf) : pointsSelf;
  const pr = typeof pointsReferral === "number" ? new BN(pointsReferral) : pointsReferral;
  const ix = await program.methods
    .updatePointsConfig(ps, pr)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the referral configuration (admin-only).
 * @param referralRegisterFee - Fee charged on referral registrations (lamports)
 * @param referralFeeShare - Share of registration fee given to referrer (lamports, must <= referralRegisterFee)
 * @param referralRegisterPoints - Points awarded to referrer on registration
 */
export async function updateReferralConfig(
  connection: Connection,
  wallet: Keypair,
  referralDiscountBps: number | BN,
  referralShareBps: number | BN,
  referralRegisterPoints: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const discount = typeof referralDiscountBps === "number" ? new BN(referralDiscountBps) : referralDiscountBps;
  const share = typeof referralShareBps === "number" ? new BN(referralShareBps) : referralShareBps;
  const pts = typeof referralRegisterPoints === "number" ? new BN(referralRegisterPoints) : referralRegisterPoints;
  const ix = await program.methods
    .updateReferralConfig(discount, share, pts)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the activity reward configuration (admin-only).
 * @param activityReward - Points awarded per activity
 * @param referralActivityReward - Points awarded to referrer per activity
 */
export async function updateActivityConfig(
  connection: Connection,
  wallet: Keypair,
  activityReward: number | BN,
  referralActivityReward: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ar = typeof activityReward === "number" ? new BN(activityReward) : activityReward;
  const rar = typeof referralActivityReward === "number" ? new BN(referralActivityReward) : referralActivityReward;
  const ix = await program.methods
    .updateActivityConfig(ar, rar)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Expand the config account size (admin-only).
 */
export async function expandConfig(
  connection: Connection,
  wallet: Keypair,
  extendSize: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const size = typeof extendSize === "number" ? new BN(extendSize) : extendSize;
  const ix = await program.methods
    .expandConfig(size)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the twitter verifier address (admin-only).
 */
export async function updateTwitterVerifier(
  connection: Connection,
  wallet: Keypair,
  newVerifier: PublicKey,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .updateTwitterVerifier(newVerifier)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the twitter verification config (admin-only).
 * @param fee - Verification fee in lamports
 * @param reward - Reward for verified twitter in lamports
 * @param points - Points awarded for twitter verification
 */
export async function updateTwitterVerificationConfig(
  connection: Connection,
  wallet: Keypair,
  fee: number | BN,
  reward: number | BN,
  points: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const f = typeof fee === "number" ? new BN(fee) : fee;
  const r = typeof reward === "number" ? new BN(reward) : reward;
  const p = typeof points === "number" ? new BN(points) : points;
  const ix = await program.methods
    .updateTwitterVerificationConfig(f, r, p)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the tweet verify config (admin-only).
 * @param reward - Reward for verified tweet in lamports
 * @param points - Points awarded for tweet verification
 */
export async function updateTweetVerifyConfig(
  connection: Connection,
  wallet: Keypair,
  reward: number | BN,
  points: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const r = typeof reward === "number" ? new BN(reward) : reward;
  const p = typeof points === "number" ? new BN(points) : points;
  const ix = await program.methods
    .updateTweetVerifyConfig(r, p)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Withdraw accumulated twitter verification fees (admin-only).
 */
export async function withdrawTwitterVerifyFees(
  connection: Connection,
  wallet: Keypair,
  amount: number | BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const amt = typeof amount === "number" ? new BN(amount) : amount;
  const ix = await program.methods
    .withdrawTwitterVerifyFees(amt)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

// ─── Twitter Verification ───────────────────────────────────────

/**
 * Read an agent's twitter verification state.
 * Returns null if no twitter account exists.
 */
export async function getAgentTwitter(
  connection: Connection,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<AgentTwitterInfo | null> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const agentPda = getAgentPda(pid, agentId);
  const twitterPda = getTwitterPda(pid, agentPda);
  const accountInfo = await connection.getAccountInfo(twitterPda);
  if (!accountInfo) return null;
  return parseAgentTwitterData(accountInfo.data);
}

/**
 * Read an agent's tweet verify state.
 * Returns null if no tweet verify account exists.
 */
export async function getTweetVerify(
  connection: Connection,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<TweetVerifyInfo | null> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const agentPda = getAgentPda(pid, agentId);
  const tweetVerifyPda = getTweetVerifyPda(pid, agentPda);
  const accountInfo = await connection.getAccountInfo(tweetVerifyPda);
  if (!accountInfo) return null;
  return parseTweetVerifyData(accountInfo.data);
}

/**
 * Read a tweet record by tweet ID.
 * Returns null if no record exists.
 */
export async function getTweetRecord(
  connection: Connection,
  tweetId: bigint,
  options?: AgentRegistryOptions
): Promise<TweetRecordInfo | null> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const tweetIdBuf = Buffer.alloc(16);
  tweetIdBuf.writeBigUInt64LE(tweetId & 0xFFFFFFFFFFFFFFFFn, 0);
  tweetIdBuf.writeBigUInt64LE(tweetId >> 64n, 8);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("tweet_record"), tweetIdBuf],
    pid
  );
  const accountInfo = await connection.getAccountInfo(pda);
  if (!accountInfo) return null;

  const buf = Buffer.from(accountInfo.data);
  let offset = 8; // skip discriminator
  const agent = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const approvedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const recordTweetId = buf.readBigUInt64LE(offset) | (buf.readBigUInt64LE(offset + 8) << 64n);
  return { agent, approvedAt, tweetId: recordTweetId };
}

/** Batch getMultipleAccountsInfo in chunks of 100 (RPC limit). */
async function batchGetMultipleAccounts(
  connection: Connection,
  pubkeys: PublicKey[]
) {
  const BATCH = 100;
  const results: (import("@solana/web3.js").AccountInfo<Buffer> | null)[] = [];
  for (let i = 0; i < pubkeys.length; i += BATCH) {
    const chunk = pubkeys.slice(i, i + BATCH);
    const batch = await connection.getMultipleAccountsInfo(chunk);
    results.push(...batch);
  }
  return results;
}

/**
 * Parse a queue account (twitter_queue or tweet_verify_queue).
 * Layout: [8 disc][8 len (u64)][32*N pubkeys]
 */
function parseQueuePubkeys(data: Buffer | Uint8Array): PublicKey[] {
  const buf = Buffer.from(data);
  const len = Number(buf.readBigUInt64LE(8));
  const result: PublicKey[] = [];
  const HEADER = 16; // 8 disc + 8 len
  for (let i = 0; i < len; i++) {
    const offset = HEADER + i * 32;
    result.push(new PublicKey(buf.subarray(offset, offset + 32)));
  }
  return result;
}

/**
 * Get pending twitter verification requests with full details.
 * Reads the twitter_queue and batch-fetches AgentTwitter accounts.
 */
export async function getPendingTwitterVerifications(
  connection: Connection,
  options?: AgentRegistryOptions
): Promise<AgentTwitterInfo[]> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const [queuePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("twitter_queue")],
    pid
  );
  const queueInfo = await connection.getAccountInfo(queuePda);
  if (!queueInfo) return [];

  const pdas = parseQueuePubkeys(queueInfo.data);
  if (pdas.length === 0) return [];

  const accounts = await batchGetMultipleAccounts(connection, pdas);
  const results: AgentTwitterInfo[] = [];
  for (const acc of accounts) {
    if (!acc) continue;
    results.push(parseAgentTwitterData(acc.data));
  }
  return results;
}

/**
 * Get pending tweet verification requests with full details.
 * Reads the tweet_verify_queue and batch-fetches TweetVerify accounts.
 */
export async function getPendingTweetVerifications(
  connection: Connection,
  options?: AgentRegistryOptions
): Promise<TweetVerifyInfo[]> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_AGENT_REGISTRY_PROGRAM_ID);
  const [queuePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("tweet_verify_queue")],
    pid
  );
  const queueInfo = await connection.getAccountInfo(queuePda);
  if (!queueInfo) return [];

  const pdas = parseQueuePubkeys(queueInfo.data);
  if (pdas.length === 0) return [];

  const accounts = await batchGetMultipleAccounts(connection, pdas);
  const results: TweetVerifyInfo[] = [];
  for (const acc of accounts) {
    if (!acc) continue;
    results.push(parseTweetVerifyData(acc.data));
  }
  return results;
}

/**
 * Set twitter info for an agent and submit for verification.
 * Charges the twitter verification fee.
 */
export async function setTwitter(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  username: string,
  tweetUrl: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setTwitter(agentId, username, tweetUrl)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Submit a tweet for verification (agent owner).
 * Charges the twitter verification fee.
 */
export async function submitTweet(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  tweetId: bigint,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .submitTweet(agentId, new BN(tweetId.toString()))
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Unbind twitter from an agent (agent owner).
 */
export async function unbindTwitter(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  username: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .unbindTwitter(agentId, username)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Verify an agent's twitter (verifier-only).
 * Awards verification reward and points to the agent owner.
 * @param freeStakeDelta - If provided, also adjusts free stake credits for the agent owner in the same tx.
 */
export async function verifyTwitter(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  username: string,
  options?: AgentRegistryOptions,
  freeStakeDelta?: number,
  freeStakeReason?: string
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const agentPda = getAgentPda(program.programId, agentId);

  // Resolve agent authority for reward distribution
  const accountInfo = await connection.getAccountInfo(agentPda);
  if (!accountInfo) throw new Error(`Agent "${agentId}" not found`);
  const authority = new PublicKey(accountInfo.data.subarray(8, 40));

  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, authority, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .verifyTwitter(agentId, username)
    .accounts({
      verifier: wallet.publicKey,
      authority,
      authorityPointAccount,
    } as any)
    .instruction();

  const ixs = [ix];
  if (freeStakeDelta !== undefined && freeStakeDelta !== 0) {
    const { makeAdjustFreeStakeIx } = await import("./quest");
    const freeStakeIx = await makeAdjustFreeStakeIx(
      connection, wallet.publicKey, authority, freeStakeDelta, freeStakeReason ?? ""
    );
    ixs.push(freeStakeIx);
  }

  return sendTx(connection, wallet, ixs);
}

/**
 * Reject an agent's twitter verification (verifier-only).
 */
export async function rejectTwitter(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .rejectTwitter(agentId)
    .accounts({ verifier: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Approve a tweet verification (verifier-only).
 * Awards tweet verify reward and points to the agent owner.
 * @param freeStakeDelta - If provided, also adjusts free stake credits for the agent owner in the same tx.
 */
export async function approveTweet(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  tweetId: bigint,
  options?: AgentRegistryOptions,
  freeStakeDelta?: number,
  freeStakeReason?: string
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const agentPda = getAgentPda(program.programId, agentId);

  // Resolve agent authority for reward distribution
  const accountInfo = await connection.getAccountInfo(agentPda);
  if (!accountInfo) throw new Error(`Agent "${agentId}" not found`);
  const authority = new PublicKey(accountInfo.data.subarray(8, 40));

  const pointMint = getPointMintPda(program.programId);
  const authorityPointAccount = getAssociatedTokenAddressSync(
    pointMint, authority, true, TOKEN_2022_PROGRAM_ID
  );

  const ix = await program.methods
    .approveTweet(agentId, new BN(tweetId.toString()))
    .accounts({
      verifier: wallet.publicKey,
      authority,
      authorityPointAccount,
    } as any)
    .instruction();

  const ixs = [ix];
  if (freeStakeDelta !== undefined && freeStakeDelta !== 0) {
    const { makeAdjustFreeStakeIx } = await import("./quest");
    const freeStakeIx = await makeAdjustFreeStakeIx(
      connection, wallet.publicKey, authority, freeStakeDelta, freeStakeReason ?? ""
    );
    ixs.push(freeStakeIx);
  }

  return sendTx(connection, wallet, ixs);
}

/**
 * Reject a tweet verification (verifier-only).
 */
export async function rejectTweet(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .rejectTweet(agentId)
    .accounts({ verifier: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}
