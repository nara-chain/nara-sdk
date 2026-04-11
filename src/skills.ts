/**
 * Skills SDK - interact with nara-skills-hub on-chain skill registry
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import type { NaraSkillsHub } from "./idls/nara_skills_hub";
import { DEFAULT_SKILLS_PROGRAM_ID } from "./constants";

import naraSkillsIdl from "./idls/nara_skills_hub.json";
import { sendTx } from "./tx";

// ─── Constants ───────────────────────────────────────────────────

/** Max bytes written per write_to_buffer call (Solana tx size limit) */
const DEFAULT_CHUNK_SIZE = 800;

/** SkillBuffer account header size: 8 discriminator + 32 authority + 32 skill + 4 total_len + 4 write_offset + 64 _reserved */
const BUFFER_HEADER_SIZE = 144;

/** SkillContent account header size: 8 discriminator + 32 skill + 64 _reserved */
const CONTENT_HEADER_SIZE = 104;

// ─── Types ───────────────────────────────────────────────────────

export interface SkillRecord {
  authority: PublicKey;
  name: string;
  author: string;
  pendingBuffer: PublicKey | null;
  /** Pubkey.default() means no content yet */
  content: PublicKey;
  /** 0 = no content, increments on each upload */
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface SkillInfo {
  record: SkillRecord;
  description: string | null;
  metadata: string | null;
}

export interface SkillOptions {
  programId?: string;
  /** Bytes per write_to_buffer call (default 800) */
  chunkSize?: number;
  /**
   * Called after each write_to_buffer transaction.
   * @param chunkIndex  - 1-based index of the chunk just written
   * @param totalChunks - total number of chunks
   * @param signature   - transaction signature of this chunk
   */
  onProgress?: (chunkIndex: number, totalChunks: number, signature: string) => void;
}

// ─── Anchor helpers ──────────────────────────────────────────────

function createProgram(
  connection: Connection,
  wallet: Keypair,
  programId?: string
): Program<NaraSkillsHub> {
  const idl = naraSkillsIdl;
  const pid = programId ?? DEFAULT_SKILLS_PROGRAM_ID;
  const idlWithPid = { ...idl, address: pid };
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return new Program<NaraSkillsHub>(idlWithPid as any, provider);
}

// ─── PDA helpers ─────────────────────────────────────────────────

function getSkillPda(programId: PublicKey, name: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("skill"), Buffer.from(name)],
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

function getDescPda(programId: PublicKey, skillPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("desc"), skillPubkey.toBuffer()],
    programId
  );
  return pda;
}

function getMetaPda(programId: PublicKey, skillPubkey: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("meta"), skillPubkey.toBuffer()],
    programId
  );
  return pda;
}

/**
 * Parse SkillRecord from raw account data (bytemuck zero-copy layout).
 * Layout (after 8-byte discriminator):
 *   32 authority | 32 content | 32 pending_buffer |
 *   8 created_at | 8 updated_at | 4 version |
 *   2 name_len | 2 author_len | 32 name | 64 author | 64 _reserved
 */
function parseSkillRecordData(data: Buffer | Uint8Array): SkillRecord {
  const buf = Buffer.from(data);
  let offset = 8; // skip discriminator

  const authority = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const content = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const pendingBuffer = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;

  const createdAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const updatedAt = Number(buf.readBigInt64LE(offset)); offset += 8;
  const version = buf.readUInt32LE(offset); offset += 4;

  const nameLen = buf.readUInt16LE(offset); offset += 2;
  const authorLen = buf.readUInt16LE(offset); offset += 2;
  const name = buf.subarray(offset, offset + nameLen).toString("utf-8"); offset += 32;
  const author = buf.subarray(offset, offset + authorLen).toString("utf-8");

  return {
    authority,
    name,
    author,
    pendingBuffer: pendingBuffer.equals(PublicKey.default) ? null : pendingBuffer,
    content,
    version,
    createdAt,
    updatedAt,
  };
}

/**
 * Fetch a SkillRecord by name using raw account data parsing.
 */
async function fetchSkillRecord(
  connection: Connection,
  name: string,
  programId: PublicKey
): Promise<SkillRecord> {
  const skillPda = getSkillPda(programId, name);
  const accountInfo = await connection.getAccountInfo(skillPda);
  if (!accountInfo) {
    throw new Error(`Skill "${name}" not found`);
  }
  return parseSkillRecordData(accountInfo.data);
}

// ─── SDK functions ───────────────────────────────────────────────

/**
 * Register a new skill on-chain. Charges the program's registration fee.
 * Returns the transaction signature.
 */
export async function registerSkill(
  connection: Connection,
  wallet: Keypair,
  name: string,
  author: string,
  options?: SkillOptions
): Promise<{ signature: string; skillPubkey: PublicKey }> {
  if (/[A-Z]/.test(name)) {
    throw new Error(`Skill name must not contain uppercase letters: "${name}"`);
  }
  const program = createProgram(connection, wallet, options?.programId);

  const ix = await program.methods
    .registerSkill(name, author)
    .accounts({
      authority: wallet.publicKey,
    } as any)
    .instruction();
  const signature = await sendTx(connection, wallet, [ix]);

  const skillPubkey = getSkillPda(program.programId, name);
  return { signature, skillPubkey };
}

/**
 * Fetch a skill's on-chain record (read-only).
 */
export async function getSkillRecord(
  connection: Connection,
  name: string,
  options?: SkillOptions
): Promise<SkillRecord> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_SKILLS_PROGRAM_ID);
  return fetchSkillRecord(connection, name, pid);
}

/**
 * Fetch a skill's record, description, and metadata in one call.
 */
export async function getSkillInfo(
  connection: Connection,
  name: string,
  options?: SkillOptions
): Promise<SkillInfo> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_SKILLS_PROGRAM_ID);
  const skillPda = getSkillPda(pid, name);
  const descPda = getDescPda(pid, skillPda);
  const metaPda = getMetaPda(pid, skillPda);

  // Single RPC: fetch skill record, description, and metadata in one call
  const [skillInfo, descInfo, metaInfo] = await connection.getMultipleAccountsInfo(
    [skillPda, descPda, metaPda],
    "confirmed"
  );
  if (!skillInfo) {
    throw new Error(`Skill "${name}" not found`);
  }

  const record = parseSkillRecordData(skillInfo.data);

  let description: string | null = null;
  if (descInfo) {
    const buf = Buffer.from(descInfo.data);
    const descLen = buf.readUInt16LE(8);
    description = buf.subarray(10, 10 + descLen).toString("utf-8");
  }

  let metadata: string | null = null;
  if (metaInfo) {
    const buf = Buffer.from(metaInfo.data);
    const dataLen = buf.readUInt16LE(8);
    metadata = buf.subarray(10, 10 + dataLen).toString("utf-8");
  }

  return { record, description, metadata };
}

/**
 * Read the raw content bytes stored in a skill's SkillContent account.
 * Returns null if the skill has no content yet.
 */
export async function getSkillContent(
  connection: Connection,
  name: string,
  options?: SkillOptions
): Promise<Buffer | null> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_SKILLS_PROGRAM_ID);
  const record = await fetchSkillRecord(connection, name, pid);

  if (record.content.equals(PublicKey.default)) {
    return null;
  }

  const accountInfo = await connection.getAccountInfo(record.content);
  if (!accountInfo) return null;

  // Content bytes start after the header (8 discriminator + 32 skill pubkey)
  return Buffer.from(accountInfo.data.slice(CONTENT_HEADER_SIZE));
}

/**
 * Set or update the skill's description (max 512 bytes).
 */
export async function setDescription(
  connection: Connection,
  wallet: Keypair,
  name: string,
  description: string,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setDescription(name, description)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set or update the skill's JSON metadata (max 800 bytes).
 */
export async function updateMetadata(
  connection: Connection,
  wallet: Keypair,
  name: string,
  data: string,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .updateMetadata(name, data)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Transfer skill authority to a new owner.
 */
export async function transferAuthority(
  connection: Connection,
  wallet: Keypair,
  name: string,
  newAuthority: PublicKey,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .transferAuthority(name, newAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Discard the skill's pending upload buffer without finalizing.
 */
export async function closeBuffer(
  connection: Connection,
  wallet: Keypair,
  name: string,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const record = await fetchSkillRecord(connection, name, program.programId);
  if (!record.pendingBuffer) {
    throw new Error(`Skill "${name}" has no pending buffer`);
  }
  const ix = await program.methods
    .closeBuffer(name)
    .accounts({ authority: wallet.publicKey, buffer: record.pendingBuffer } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Delete a skill and reclaim all rent. Closes the SkillRecord, description,
 * metadata, and content accounts. Only the skill authority can call this.
 */
export async function deleteSkill(
  connection: Connection,
  wallet: Keypair,
  name: string,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const record = await fetchSkillRecord(connection, name, program.programId);

  // When no content exists, pass the authority pubkey as a placeholder
  const contentAccount = record.content.equals(PublicKey.default)
    ? wallet.publicKey
    : record.content;

  const ix = await program.methods
    .deleteSkill(name)
    .accounts({
      authority: wallet.publicKey,
      contentAccount,
    } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Upload skill content via chunked buffer mechanism.
 *
 * Handles the full workflow:
 * 1. Pre-creates buffer account (client-allocated)
 * 2. Calls init_buffer
 * 3. Writes content in chunks via write_to_buffer
 * 4. Pre-creates content account (client-allocated)
 * 5. Calls finalize_skill_new (first upload) or finalize_skill_update (update)
 *
 * Returns the finalize transaction signature.
 */
export async function uploadSkillContent(
  connection: Connection,
  wallet: Keypair,
  name: string,
  content: Buffer | Uint8Array,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const chunkSize = options?.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const totalLen = content.length;
  const record = await fetchSkillRecord(connection, name, program.programId);
  const existingContent = record.content;
  const isUpdate = !existingContent.equals(PublicKey.default);

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
    .initBuffer(name, totalLen)
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
    const chunk = Buffer.from(content.slice(offset, offset + chunkSize));
    const writeIx = await program.methods
      .writeToBuffer(name, offset, chunk)
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

  // ── Step 4: create content account ───────────────────────────
  const contentKeypair = Keypair.generate();
  const contentSize = CONTENT_HEADER_SIZE + totalLen;
  const contentRent = await connection.getMinimumBalanceForRentExemption(contentSize);

  const createContentIx = SystemProgram.createAccount({
    fromPubkey: wallet.publicKey,
    newAccountPubkey: contentKeypair.publicKey,
    lamports: contentRent,
    space: contentSize,
    programId: program.programId,
  });
  await sendTx(connection, wallet, [createContentIx], [contentKeypair]);

  // ── Step 5: finalize ──────────────────────────────────────────
  if (isUpdate) {
    const finalizeIx = await program.methods
      .finalizeSkillUpdate(name)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newContent: contentKeypair.publicKey,
        oldContent: existingContent,
      } as any)
      .instruction();
    return sendTx(connection, wallet, [finalizeIx]);
  } else {
    const finalizeIx = await program.methods
      .finalizeSkillNew(name)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newContent: contentKeypair.publicKey,
      } as any)
      .instruction();
    return sendTx(connection, wallet, [finalizeIx]);
  }
}

/**
 * Fetch the global program configuration.
 */
export async function getConfig(
  connection: Connection,
  options?: SkillOptions
): Promise<{ admin: PublicKey; registerFee: number; feeVault: PublicKey }> {
  const pid = new PublicKey(options?.programId ?? DEFAULT_SKILLS_PROGRAM_ID);
  const configPda = getConfigPda(pid);
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    throw new Error("Skills program config not initialized");
  }
  const buf = Buffer.from(accountInfo.data);
  let offset = 8; // skip discriminator
  const admin = new PublicKey(buf.subarray(offset, offset + 32)); offset += 32;
  const registerFee = Number(buf.readBigUInt64LE(offset)); offset += 8;
  const feeVault = new PublicKey(buf.subarray(offset, offset + 32));
  return { admin, registerFee, feeVault };
}

// ─── Admin functions ────────────────────────────────────────────

/**
 * Initialize the program configuration (one-time setup).
 * The caller becomes the admin.
 */
export async function initConfig(
  connection: Connection,
  wallet: Keypair,
  options?: SkillOptions
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
  options?: SkillOptions
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
  amount: number | anchor.BN,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const amt = typeof amount === "number" ? new anchor.BN(amount) : amount;
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
  newFee: number | anchor.BN,
  options?: SkillOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const fee = typeof newFee === "number" ? new anchor.BN(newFee) : newFee;
  const ix = await program.methods
    .updateRegisterFee(fee)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}
