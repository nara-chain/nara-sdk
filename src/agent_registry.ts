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
import type { NaraAgentRegistry } from "./idls/nara_agent_registry";
import { DEFAULT_AGENT_REGISTRY_PROGRAM_ID } from "./constants";

import naraAgentRegistryIdl from "./idls/nara_agent_registry.json";

// ─── Constants ───────────────────────────────────────────────────

/** Max bytes written per write_to_buffer call (Solana tx size limit) */
const DEFAULT_CHUNK_SIZE = 800;

/** MemoryBuffer account header: 8 discriminator + 32 authority + 32 agent + 4 total_len + 4 write_offset + 64 _reserved */
const BUFFER_HEADER_SIZE = 144;

/** AgentMemory account header: 8 discriminator + 32 agent + 64 _reserved */
const MEMORY_HEADER_SIZE = 104;

// ─── Helpers ─────────────────────────────────────────────────────

/** Send a transaction and poll until confirmed, without using WebSocket. */
async function sendAndConfirmTx(
  connection: Connection,
  tx: anchor.web3.Transaction,
  signers: anchor.web3.Signer[]
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = blockhash;
  tx.feePayer = signers[0]!.publicKey;
  tx.sign(...signers);

  const rawTx = tx.serialize();
  const sig = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
  });

  while (true) {
    const { value } = await connection.getSignatureStatuses([sig]);
    const status = value[0];
    if (status) {
      if (status.err) throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
      if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
        return sig;
      }
    }
    const currentHeight = await connection.getBlockHeight("confirmed");
    if (currentHeight > lastValidBlockHeight) {
      throw new Error(`Transaction expired (blockhash no longer valid): ${sig}`);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
}

// ─── Types ───────────────────────────────────────────────────────

export interface AgentRecord {
  authority: PublicKey;
  agentId: string;
  pendingBuffer: PublicKey | null;
  /** PublicKey.default means no memory yet */
  memory: PublicKey;
  /** 0 = no memory, increments on each upload */
  version: number;
  /** Accumulated activity points */
  points: number;
  createdAt: number;
  updatedAt: number;
}

export interface AgentInfo {
  record: AgentRecord;
  bio: string | null;
  metadata: string | null;
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

/** Bio/Metadata header: 8-byte discriminator + 64-byte _reserved */
const BIO_META_HEADER_SIZE = 72;

/**
 * Parse AgentRecord from raw account data (bytemuck zero-copy layout).
 * Layout (after 8-byte discriminator):
 *   32 authority | 32 pending_buffer | 32 memory |
 *   8 created_at | 8 updated_at | 8 points |
 *   4 version | 4 agent_id_len | 32 agent_id | 64 _reserved
 */
function parseAgentRecordData(data: Buffer | Uint8Array): AgentRecord {
  const buf = Buffer.from(data);
  let offset = 8; // skip discriminator

  const authority = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const pendingBuffer = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const memory = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;

  const createdAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const updatedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const points = Number(buf.readBigUInt64LE(offset)); offset += 8;

  const version = buf.readUInt32LE(offset); offset += 4;
  const agentIdLen = buf.readUInt32LE(offset); offset += 4;
  const agentId = buf.subarray(offset, offset + agentIdLen).toString("utf-8");

  return {
    authority,
    agentId,
    pendingBuffer: pendingBuffer.equals(PublicKey.default) ? null : pendingBuffer,
    memory,
    version,
    points,
    createdAt,
    updatedAt,
  };
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
  registerFee: number;
  feeRecipient: PublicKey;
  pointsSelf: number;
  pointsReferral: number;
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
  const feeRecipient = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const registerFee = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const pointsSelf = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const pointsReferral = Number(buf.readBigUInt64LE(offset));
  return { admin, registerFee, feeRecipient, pointsSelf, pointsReferral };
}

// ─── Agent CRUD ─────────────────────────────────────────────────

/**
 * Register a new agent on-chain. Charges the program's registration fee.
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
  const configPda = getConfigPda(program.programId);
  const config = await program.account.programConfig.fetch(configPda);

  const signature = await program.methods
    .registerAgent(agentId)
    .accounts({
      authority: wallet.publicKey,
      feeRecipient: config.feeRecipient,
    } as any)
    .signers([wallet])
    .rpc();

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
  return program.methods
    .transferAuthority(agentId, newAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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

  return program.methods
    .deleteAgent(agentId)
    .accounts({
      authority: wallet.publicKey,
      memoryAccount,
    } as any)
    .signers([wallet])
    .rpc();
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
  return program.methods
    .setBio(agentId, bio)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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
  return program.methods
    .setMetadata(agentId, data)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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

  const createBufferTx = new anchor.web3.Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: bufferKeypair.publicKey,
      lamports: bufferRent,
      space: bufferSize,
      programId: program.programId,
    })
  );
  await sendAndConfirmTx(connection, createBufferTx, [wallet, bufferKeypair]);

  // ── Step 2: init_buffer ───────────────────────────────────────
  await program.methods
    .initBuffer(agentId, totalLen)
    .accounts({
      authority: wallet.publicKey,
      buffer: bufferKeypair.publicKey,
    } as any)
    .signers([wallet])
    .rpc();

  // ── Step 3: write chunks ──────────────────────────────────────
  const totalChunks = Math.ceil(totalLen / chunkSize);
  let offset = 0;
  let chunkIndex = 0;
  while (offset < totalLen) {
    const chunk = Buffer.from(data.slice(offset, offset + chunkSize));
    const writeSig = await program.methods
      .writeToBuffer(agentId, offset, chunk)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
      } as any)
      .signers([wallet])
      .rpc();
    offset += chunk.length;
    chunkIndex++;
    options?.onProgress?.(chunkIndex, totalChunks, writeSig);
  }

  // ── Step 4: finalize ──────────────────────────────────────────
  if (resolvedMode === "append") {
    // Append: realloc existing memory in-place, no new account needed
    return program.methods
      .finalizeMemoryAppend(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        memory: existingMemory,
      } as any)
      .signers([wallet])
      .rpc();
  }

  // new / update: create a new memory account
  const memoryKeypair = Keypair.generate();
  const memorySize = MEMORY_HEADER_SIZE + totalLen;
  const memoryRent = await connection.getMinimumBalanceForRentExemption(memorySize);

  const createMemoryTx = new anchor.web3.Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: memoryKeypair.publicKey,
      lamports: memoryRent,
      space: memorySize,
      programId: program.programId,
    })
  );
  await sendAndConfirmTx(connection, createMemoryTx, [wallet, memoryKeypair]);

  if (resolvedMode === "update") {
    return program.methods
      .finalizeMemoryUpdate(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newMemory: memoryKeypair.publicKey,
        oldMemory: existingMemory,
      } as any)
      .signers([wallet])
      .rpc();
  } else {
    // "new"
    return program.methods
      .finalizeMemoryNew(agentId)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newMemory: memoryKeypair.publicKey,
      } as any)
      .signers([wallet])
      .rpc();
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
  return program.methods
    .closeBuffer(agentId)
    .accounts({ authority: wallet.publicKey, buffer: record.pendingBuffer } as any)
    .signers([wallet])
    .rpc();
}

// ─── Activity Logging ───────────────────────────────────────────

/**
 * Log an activity event for the agent (emits on-chain event).
 *
 * @param referralAgentId - Optional referral agent ID. If provided, the referral
 *                          agent's PDA is passed to earn referral points.
 */
export async function logActivity(
  connection: Connection,
  wallet: Keypair,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  options?: AgentRegistryOptions,
  referralAgentId?: string
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  return program.methods
    .logActivity(agentId, model, activity, log)
    .accounts({
      authority: wallet.publicKey,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      referralAgent: referralAgentId
        ? getAgentPda(program.programId, referralAgentId)
        : null,
    } as any)
    .signers([wallet])
    .rpc();
}

/**
 * Build a logActivity instruction without sending it.
 * Useful for appending to an existing transaction.
 *
 * @param referralAgentId - Optional referral agent ID.
 */
export async function makeLogActivityIx(
  connection: Connection,
  authority: PublicKey,
  agentId: string,
  model: string,
  activity: string,
  log: string,
  options?: AgentRegistryOptions,
  referralAgentId?: string
): Promise<TransactionInstruction> {
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  return program.methods
    .logActivity(agentId, model, activity, log)
    .accounts({
      authority,
      instructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      referralAgent: referralAgentId
        ? getAgentPda(program.programId, referralAgentId)
        : null,
    } as any)
    .instruction();
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
  return program.methods
    .initConfig()
    .accounts({ admin: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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
  return program.methods
    .updateAdmin(newAdmin)
    .accounts({ admin: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
}

/**
 * Update the fee recipient (admin-only).
 */
export async function updateFeeRecipient(
  connection: Connection,
  wallet: Keypair,
  newRecipient: PublicKey,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  return program.methods
    .updateFeeRecipient(newRecipient)
    .accounts({ admin: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
}

/**
 * Update the registration fee in lamports (admin-only).
 */
export async function updateRegisterFee(
  connection: Connection,
  wallet: Keypair,
  newFee: number | anchor.BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const fee = typeof newFee === "number" ? new anchor.BN(newFee) : newFee;
  return program.methods
    .updateRegisterFee(fee)
    .accounts({ admin: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
}

/**
 * Update the points configuration (admin-only).
 * Sets how many points are awarded per activity and per referral.
 */
export async function updatePointsConfig(
  connection: Connection,
  wallet: Keypair,
  pointsSelf: number | anchor.BN,
  pointsReferral: number | anchor.BN,
  options?: AgentRegistryOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ps = typeof pointsSelf === "number" ? new anchor.BN(pointsSelf) : pointsSelf;
  const pr = typeof pointsReferral === "number" ? new anchor.BN(pointsReferral) : pointsReferral;
  return program.methods
    .updatePointsConfig(ps, pr)
    .accounts({ admin: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
}
