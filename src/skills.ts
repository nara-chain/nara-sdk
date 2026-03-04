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

// ─── Constants ───────────────────────────────────────────────────

/** Max bytes written per write_to_buffer call (Solana tx size limit) */
const DEFAULT_CHUNK_SIZE = 800;

/** SkillBuffer account header size: 8 discriminator + 32 authority + 32 skill + 4 total_len + 4 write_offset */
const BUFFER_HEADER_SIZE = 80;

/** SkillContent account header size: 8 discriminator + 32 skill */
const CONTENT_HEADER_SIZE = 40;

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

function mapSkillRecord(raw: any): SkillRecord {
  return {
    authority: raw.authority as PublicKey,
    name: raw.name as string,
    author: raw.author as string,
    pendingBuffer: (raw.pendingBuffer as PublicKey | null) ?? null,
    content: raw.content as PublicKey,
    version: raw.version as number,
    createdAt: (raw.createdAt as anchor.BN).toNumber(),
    updatedAt: (raw.updatedAt as anchor.BN).toNumber(),
  };
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
  const program = createProgram(connection, wallet, options?.programId);
  const configPda = getConfigPda(program.programId);
  const config = await program.account.programConfig.fetch(configPda);

  const signature = await program.methods
    .registerSkill(name, author)
    .accounts({
      authority: wallet.publicKey,
      feeRecipient: config.feeRecipient,
    } as any)
    .signers([wallet])
    .rpc();

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
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  return mapSkillRecord(raw);
}

/**
 * Fetch a skill's record, description, and metadata in one call.
 */
export async function getSkillInfo(
  connection: Connection,
  name: string,
  options?: SkillOptions
): Promise<SkillInfo> {
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  const record = mapSkillRecord(raw);

  const descPda = getDescPda(program.programId, skillPda);
  const metaPda = getMetaPda(program.programId, skillPda);

  let description: string | null = null;
  let metadata: string | null = null;

  try {
    const descAcc = await program.account.skillDescription.fetch(descPda);
    description = descAcc.description as string;
  } catch {
    // account not created yet
  }

  try {
    const metaAcc = await program.account.skillMetadata.fetch(metaPda);
    metadata = metaAcc.data as string;
  } catch {
    // account not created yet
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
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  const contentPubkey = raw.content as PublicKey;

  if (contentPubkey.equals(PublicKey.default)) {
    return null;
  }

  const accountInfo = await connection.getAccountInfo(contentPubkey);
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
  return program.methods
    .setDescription(name, description)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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
  return program.methods
    .updateMetadata(name, data)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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
  return program.methods
    .transferAuthority(name, newAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .signers([wallet])
    .rpc();
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
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  const bufferPubkey = raw.pendingBuffer as PublicKey | null;
  if (!bufferPubkey) {
    throw new Error(`Skill "${name}" has no pending buffer`);
  }
  return program.methods
    .closeBuffer(name)
    .accounts({ authority: wallet.publicKey, buffer: bufferPubkey } as any)
    .signers([wallet])
    .rpc();
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
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  const contentPubkey = raw.content as PublicKey;

  // When no content exists, pass the authority pubkey as a placeholder
  const contentAccount = contentPubkey.equals(PublicKey.default)
    ? wallet.publicKey
    : contentPubkey;

  return program.methods
    .deleteSkill(name)
    .accounts({
      authority: wallet.publicKey,
      contentAccount,
    } as any)
    .signers([wallet])
    .rpc();
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
  const skillPda = getSkillPda(program.programId, name);
  const raw = await program.account.skillRecord.fetch(skillPda);
  const existingContent = raw.content as PublicKey;
  const isUpdate = !existingContent.equals(PublicKey.default);

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
    .initBuffer(name, totalLen)
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
    const chunk = Buffer.from(content.slice(offset, offset + chunkSize));
    const writeSig = await program.methods
      .writeToBuffer(name, offset, chunk)
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

  // ── Step 4: create content account ───────────────────────────
  const contentKeypair = Keypair.generate();
  const contentSize = CONTENT_HEADER_SIZE + totalLen;
  const contentRent = await connection.getMinimumBalanceForRentExemption(contentSize);

  const createContentTx = new anchor.web3.Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: contentKeypair.publicKey,
      lamports: contentRent,
      space: contentSize,
      programId: program.programId,
    })
  );
  await sendAndConfirmTx(connection, createContentTx, [wallet, contentKeypair]);

  // ── Step 5: finalize ──────────────────────────────────────────
  if (isUpdate) {
    return program.methods
      .finalizeSkillUpdate(name)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newContent: contentKeypair.publicKey,
        oldContent: existingContent,
      } as any)
      .signers([wallet])
      .rpc();
  } else {
    return program.methods
      .finalizeSkillNew(name)
      .accounts({
        authority: wallet.publicKey,
        buffer: bufferKeypair.publicKey,
        newContent: contentKeypair.publicKey,
      } as any)
      .signers([wallet])
      .rpc();
  }
}
