/**
 * zkid module - interact with nara-zk anonymous identity protocol
 *
 * A ZK ID is a named account where:
 * - Anyone can deposit NARA knowing only the name
 * - Only the owner (who knows the idSecret) can withdraw anonymously
 * - Ownership can be transferred via ZK proof without revealing the owner's wallet
 */

import { Connection, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { buildPoseidon as _buildPoseidon } from "circomlibjs";
import nacl from "tweetnacl";
import BN from "bn.js";
import type { NaraZk } from "./idls/nara_zk";
import { DEFAULT_ZKID_PROGRAM_ID } from "./constants";
import { sendTx } from "./tx";
import naraZkIdl from "./idls/nara_zk.json";

// ─── Constants ────────────────────────────────────────────────────────────────

const BN254_PRIME =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const MERKLE_LEVELS = 64;

// Lazily resolve default ZK circuit file paths (Node.js only).
// In browser environments, pass withdrawWasm/withdrawZkey/ownershipWasm/ownershipZkey via ZkIdOptions.
async function resolveDefaultZkPaths(): Promise<{
  withdrawWasm: string; withdrawZkey: string;
  ownershipWasm: string; ownershipZkey: string;
}> {
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const dir = dirname(fileURLToPath(import.meta.url));
  return {
    withdrawWasm: join(dir, "zk", "withdraw.wasm"),
    withdrawZkey: join(dir, "zk", "withdraw_final.zkey"),
    ownershipWasm: join(dir, "zk", "ownership.wasm"),
    ownershipZkey: join(dir, "zk", "ownership_final.zkey"),
  };
}

// ─── Public types ─────────────────────────────────────────────────────────────

/** Fixed denomination pools (in lamports). */
export const ZKID_DENOMINATIONS = {
  NARA_1: new BN("1000000000"),
  NARA_10: new BN("10000000000"),
  NARA_100: new BN("100000000000"),
  NARA_1000: new BN("1000000000000"),
  NARA_10000: new BN("10000000000000"),
  NARA_100000: new BN("100000000000000"),
};

export interface ZkIdInfo {
  nameHash: number[];
  idCommitment: number[];
  depositCount: number;
  commitmentStartIndex: number;
}

/** A deposit that has not yet been withdrawn. */
export interface ClaimableDeposit {
  leafIndex: bigint;
  depositIndex: number;
  denomination: bigint;
}

export interface ZkIdOptions {
  programId?: string;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  withdrawWasm?: string | Uint8Array;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  withdrawZkey?: string | Uint8Array;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  ownershipWasm?: string | Uint8Array;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  ownershipZkey?: string | Uint8Array;
}

// ─── Internal crypto helpers (browser-compatible, no Buffer) ────────────────

function hexFromBytes(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function concatBytes(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) { result.set(a, offset); offset += a.length; }
  return result;
}

function bigintToBytes32(v: bigint): Uint8Array {
  const hex = v.toString(16).padStart(64, "0");
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

let _poseidon: any = null;

async function getPoseidon(): Promise<any> {
  if (!_poseidon) _poseidon = await _buildPoseidon();
  return _poseidon;
}

async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();
  const result = poseidon(inputs);
  return poseidon.F.toObject(result);
}

function bigIntToBytes32BE(n: bigint): Uint8Array {
  if (n < 0n || n >= BN254_PRIME) {
    throw new Error(`bigint out of BN254 field range: ${n}`);
  }
  return bigintToBytes32(n);
}

function bytes32ToBigInt(buf: Uint8Array): bigint {
  return BigInt("0x" + hexFromBytes(buf));
}

function toBytes32(buf: Uint8Array): number[] {
  return Array.from(buf.slice(0, 32));
}

async function computeNameHash(name: string): Promise<Uint8Array> {
  const data = new TextEncoder().encode("nara-zk:" + name);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function denomBuf(denomination: BN): Uint8Array {
  const bytes = new Uint8Array(8);
  const arr = denomination.toArray("le", 8);
  bytes.set(arr);
  return bytes;
}

function packProof(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): Uint8Array {
  const ax = BigInt(proof.pi_a[0]!);
  const ay = BigInt(proof.pi_a[1]!);
  const ay_neg = BN254_PRIME - ay; // negate y: standard G1 negation on BN254

  const proofA = concatBytes(bigIntToBytes32BE(ax), bigIntToBytes32BE(ay_neg));
  const proofB = concatBytes(
    bigIntToBytes32BE(BigInt(proof.pi_b[0]![1]!)), // x.c1
    bigIntToBytes32BE(BigInt(proof.pi_b[0]![0]!)), // x.c0
    bigIntToBytes32BE(BigInt(proof.pi_b[1]![1]!)), // y.c1
    bigIntToBytes32BE(BigInt(proof.pi_b[1]![0]!)), // y.c0
  );
  const proofC = concatBytes(
    bigIntToBytes32BE(BigInt(proof.pi_c[0]!)),
    bigIntToBytes32BE(BigInt(proof.pi_c[1]!)),
  );
  return concatBytes(proofA, proofB, proofC); // 256 bytes total
}

async function buildMerklePath(
  leafIndex: bigint,
  filledSubtrees: Uint8Array[],
  zeros: bigint[]
): Promise<{ pathElements: bigint[]; pathIndices: number[] }> {
  const pathElements: bigint[] = new Array(MERKLE_LEVELS);
  const pathIndices: number[] = new Array(MERKLE_LEVELS);

  let idx = leafIndex;
  for (let i = 0; i < MERKLE_LEVELS; i++) {
    const isRight = idx % 2n === 1n;
    pathElements[i] = isRight ? bytes32ToBigInt(filledSubtrees[i]!) : zeros[i]!;
    pathIndices[i] = isRight ? 1 : 0;
    idx = idx / 2n;
  }
  return { pathElements, pathIndices };
}

// Suppress snarkjs WASM console noise during proof generation.
async function silentProve(
  input: Record<string, string | string[]>,
  wasmPath: string | Uint8Array,
  zkeyPath: string | Uint8Array
) {
  const snarkjs: any = await import("snarkjs");
  const savedLog = console.log;
  const savedError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath, null, null, {
      singleThread: true,
    });
  } finally {
    console.log = savedLog;
    console.error = savedError;
  }
}

// ─── Anchor helpers ──────────────────────────────────────────────────────────

function createProgram(
  connection: Connection,
  wallet: Keypair,
  programId?: string
): Program<NaraZk> {
  const idl = naraZkIdl;
  const pid = programId ?? DEFAULT_ZKID_PROGRAM_ID;
  const idlWithPid = { ...idl, address: pid };
  const provider = new AnchorProvider(connection, new Wallet(wallet), {
    commitment: "confirmed",
  });
  anchor.setProvider(provider);
  return new Program<NaraZk>(idlWithPid as any, provider);
}

function createReadProgram(
  connection: Connection,
  programId?: string
): Program<NaraZk> {
  const idl = naraZkIdl;
  const pid = programId ?? DEFAULT_ZKID_PROGRAM_ID;
  const idlWithPid = { ...idl, address: pid };
  const provider = new AnchorProvider(
    connection,
    new Wallet(Keypair.generate()),
    { commitment: "confirmed" }
  );
  return new Program<NaraZk>(idlWithPid as any, provider);
}

// ─── PDA helpers ─────────────────────────────────────────────────────────────

function findZkIdPda(nameHashBuf: Uint8Array, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("zk_id"), nameHashBuf],
    programId
  );
}

function findInboxPda(nameHashBuf: Uint8Array, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("inbox"), nameHashBuf],
    programId
  );
}

function findConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([new TextEncoder().encode("config")], programId);
}

function findNullifierPda(
  denomination: BN,
  nullifierHash: Uint8Array,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("nullifier"), denomBuf(denomination), nullifierHash],
    programId
  );
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Derive a deterministic idSecret from a Keypair + name.
 *
 * Protocol: Ed25519 sign("nara-zk:idsecret:v1:{name}") → SHA256 → mod BN254_PRIME
 *
 * The name is embedded in the message so each ZK ID of the same wallet
 * has a unique idSecret, preventing nullifier collisions.
 */
export async function deriveIdSecret(keypair: Keypair, name: string): Promise<bigint> {
  const message = new TextEncoder().encode(`nara-zk:idsecret:v1:${name}`);
  const sig = nacl.sign.detached(message, keypair.secretKey);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", sig));
  const n = BigInt("0x" + hexFromBytes(digest));
  return (n % (BN254_PRIME - 1n)) + 1n;
}

/**
 * Check if a PublicKey is usable as a recipient (must be < BN254 field prime).
 * The ZK withdraw circuit encodes the recipient as a BN254 field element.
 */
export function isValidRecipient(pubkey: PublicKey): boolean {
  return bytes32ToBigInt(pubkey.toBytes()) < BN254_PRIME;
}

/**
 * Generate a random Keypair whose public key is a valid BN254 field element.
 * Use this to generate a recipient address for withdrawals.
 */
export function generateValidRecipient(): Keypair {
  for (let i = 0; i < 1000; i++) {
    const kp = Keypair.generate();
    if (isValidRecipient(kp.publicKey)) return kp;
  }
  throw new Error("Could not generate valid recipient after 1000 tries");
}

/**
 * Fetch ZK ID account info. Returns null if the ZK ID does not exist.
 */
export async function getZkIdInfo(
  connection: Connection,
  name: string,
  options?: ZkIdOptions
): Promise<ZkIdInfo | null> {
  const program = createReadProgram(connection, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const [zkIdPda] = findZkIdPda(await computeNameHash(name), programId);
  try {
    const data = await program.account.zkIdAccount.fetch(zkIdPda);
    return {
      nameHash: Array.from(data.nameHash as number[]),
      idCommitment: Array.from(data.idCommitment as number[]),
      depositCount: data.depositCount,
      commitmentStartIndex: data.commitmentStartIndex,
    };
  } catch {
    return null;
  }
}

/**
 * Register a new named ZK ID on-chain.
 *
 * @param payer     - Pays the registration fee and transaction costs
 * @param name      - Human-readable name (e.g. "alice")
 * @param idSecret  - From deriveIdSecret(); kept private, never sent on-chain
 */
export async function createZkId(
  connection: Connection,
  payer: Keypair,
  name: string,
  idSecret: bigint,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, payer, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);

  const nameHashBuf = await computeNameHash(name);
  const idCommitment = await poseidonHash([idSecret]);
  const idCommitmentBuf = bigIntToBytes32BE(idCommitment);

  const ix = await program.methods
    .register(toBytes32(nameHashBuf), toBytes32(idCommitmentBuf))
    .accounts({
      payer: payer.publicKey,
    } as any)
    .instruction();
  return sendTx(connection, payer, [ix]);
}

/**
 * Deposit NARA into a named ZK ID.
 * Anyone knowing the name can deposit — no proof required.
 *
 * @param denomination - Must be one of ZKID_DENOMINATIONS (fixed pool amounts)
 */
export async function deposit(
  connection: Connection,
  payer: Keypair,
  name: string,
  denomination: BN,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, payer, options?.programId);
  const nameHashBuf = await computeNameHash(name);

  const ix = await program.methods
    .deposit(toBytes32(nameHashBuf), denomination)
    .accounts({ depositor: payer.publicKey } as any)
    .instruction();
  return sendTx(connection, payer, [ix]);
}

/**
 * Scan deposits claimable by the idSecret holder (not yet withdrawn).
 *
 * Returns up to 64 most recent unspent deposits. Older deposits not in the
 * inbox ring buffer are not returned.
 */
export async function scanClaimableDeposits(
  connection: Connection,
  name: string,
  idSecret: bigint,
  options?: ZkIdOptions
): Promise<ClaimableDeposit[]> {
  const program = createReadProgram(connection, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const nameHashBuf = await computeNameHash(name);

  const [zkIdPda] = findZkIdPda(nameHashBuf, programId);
  const [inboxPda] = findInboxPda(nameHashBuf, programId);

  // Step 1: fetch zkId + inbox in a single RPC call
  const [zkIdAcct, inboxAcct] = await connection.getMultipleAccountsInfo(
    [zkIdPda, inboxPda],
    "confirmed"
  );
  if (!zkIdAcct) throw new Error(`ZK ID account not found: ${zkIdPda.toBase58()}`);
  if (!inboxAcct) throw new Error(`Inbox account not found: ${inboxPda.toBase58()}`);

  const zkId = program.coder.accounts.decode("zkIdAccount", zkIdAcct.data);
  const inbox = program.coder.accounts.decode("inboxAccount", inboxAcct.data);

  const depositCount: number = zkId.depositCount;
  const commitmentStart: number = zkId.commitmentStartIndex;
  const count: number = inbox.count;
  const head: number = inbox.head;

  // Reconstruct inbox entries in chronological order (oldest first)
  const entries: { leafIndex: bigint; denomination: bigint }[] = [];
  for (let i = 0; i < count; i++) {
    const pos = ((head - count + i) % 64 + 64) % 64;
    const entry = (inbox.entries as any[])[pos];
    entries.push({
      leafIndex: BigInt(entry.leafIndex.toString()),
      denomination: BigInt(entry.denomination.toString()),
    });
  }

  // Oldest entry in inbox corresponds to depositIndex = (depositCount - count)
  const startDepositIndex = depositCount - count;

  // Step 2: derive all nullifier PDAs for candidate entries (owned deposits only)
  type Candidate = { leafIndex: bigint; depositIndex: number; denomination: bigint; nullifierPda: PublicKey };
  const candidates: Candidate[] = [];
  for (let i = 0; i < entries.length; i++) {
    const depositIndex = startDepositIndex + i;
    if (depositIndex < commitmentStart) continue;

    const { leafIndex, denomination } = entries[i]!;
    const nullifierHash_bi = await poseidonHash([idSecret, BigInt(depositIndex)]);
    const nullifierHashBuf = bigIntToBytes32BE(nullifierHash_bi);
    const denominationBN = new BN(denomination.toString());
    const [nullifierPda] = findNullifierPda(denominationBN, nullifierHashBuf, programId);
    candidates.push({ leafIndex, depositIndex, denomination, nullifierPda });
  }

  if (!candidates.length) return [];

  // Step 3: batch-check all nullifiers in a single RPC call
  // (inbox is capped at 64 entries, well under the 100-key limit)
  const nullifierInfos = await connection.getMultipleAccountsInfo(
    candidates.map((c) => c.nullifierPda),
    "confirmed"
  );

  const claimable: ClaimableDeposit[] = [];
  for (let i = 0; i < candidates.length; i++) {
    if (nullifierInfos[i] === null) {
      const { leafIndex, depositIndex, denomination } = candidates[i]!;
      claimable.push({ leafIndex, depositIndex, denomination });
    }
  }

  return claimable;
}

/**
 * Withdraw a deposit anonymously using a Groth16 ZK proof.
 *
 * Privacy: payer and recipient are not linked to the ZK ID on-chain.
 *
 * Note: Works reliably when the deposit's Merkle root is still in the on-chain
 * root history (last 30 deposits to the same denomination pool).
 *
 * @param depositInfo - From scanClaimableDeposits()
 * @param recipient   - Destination address. Must satisfy isValidRecipient().
 *                      Use generateValidRecipient() if you need a fresh address.
 */
export async function withdraw(
  connection: Connection,
  payer: Keypair,
  name: string,
  idSecret: bigint,
  depositInfo: ClaimableDeposit,
  recipient: PublicKey,
  options?: ZkIdOptions
): Promise<string> {
  if (!isValidRecipient(recipient)) {
    throw new Error(
      "Recipient pubkey is >= BN254 field prime. Use generateValidRecipient() to get a compatible address."
    );
  }

  const program = createProgram(connection, payer, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const denominationBN = new BN(depositInfo.denomination.toString());

  // Fetch Merkle tree state
  const [treePda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("tree"), denomBuf(denominationBN)],
    programId
  );
  const treeData = await program.account.merkleTreeAccount.fetch(treePda);

  const rootIdx: number = treeData.currentRootIndex;
  const root = new Uint8Array((treeData.roots as number[][])[rootIdx]!);
  const filledSubtrees = (treeData.filledSubtrees as number[][]).map(s =>
    new Uint8Array(s)
  );
  // Use on-chain precomputed zeros (avoids expensive client-side computation)
  const zeros = (treeData.zeros as number[][]).map(z =>
    bytes32ToBigInt(new Uint8Array(z))
  );

  const { pathElements, pathIndices } = await buildMerklePath(
    depositInfo.leafIndex,
    filledSubtrees,
    zeros
  );

  const nullifier = await poseidonHash([idSecret, BigInt(depositInfo.depositIndex)]);
  const nullifierHashBuf = bigIntToBytes32BE(nullifier);
  const recipientField = bytes32ToBigInt(recipient.toBytes());

  const input = {
    idSecret: idSecret.toString(),
    depositIndex: depositInfo.depositIndex.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices: pathIndices.map(i => i.toString()),
    root: bytes32ToBigInt(root).toString(),
    nullifierHash: nullifier.toString(),
    recipient: recipientField.toString(),
  };

  let wasmSource = options?.withdrawWasm;
  let zkeySource = options?.withdrawZkey;
  if (!wasmSource || !zkeySource) {
    const defaults = await resolveDefaultZkPaths();
    wasmSource ??= defaults.withdrawWasm;
    zkeySource ??= defaults.withdrawZkey;
  }

  const { proof } = await silentProve(input, wasmSource, zkeySource);
  const packedProof = packProof(proof);

  const ix = await program.methods
    .withdraw(
      Buffer.from(packedProof) as any,
      toBytes32(root),
      toBytes32(nullifierHashBuf),
      recipient,
      denominationBN
    )
    .accounts({
      payer: payer.publicKey,
      recipient,
    } as any)
    .instruction();
  return sendTx(connection, payer, [ix]);
}

/**
 * Build a withdraw instruction without executing it.
 * Useful for composing into an existing transaction.
 *
 * Same ZK proof generation as withdraw(), but returns a TransactionInstruction
 * instead of sending the transaction.
 *
 * @param authority   - The payer/signer public key (does not need Keypair since we don't sign)
 * @param depositInfo - From scanClaimableDeposits()
 * @param recipient   - Destination address. Must satisfy isValidRecipient().
 */
export async function makeWithdrawIx(
  connection: Connection,
  authority: PublicKey,
  name: string,
  idSecret: bigint,
  depositInfo: ClaimableDeposit,
  recipient: PublicKey,
  options?: ZkIdOptions
): Promise<TransactionInstruction> {
  if (!isValidRecipient(recipient)) {
    throw new Error(
      "Recipient pubkey is >= BN254 field prime. Use generateValidRecipient() to get a compatible address."
    );
  }

  const program = createReadProgram(connection, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const denominationBN = new BN(depositInfo.denomination.toString());

  // Fetch Merkle tree state
  const [treePda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("tree"), denomBuf(denominationBN)],
    programId
  );
  const treeData = await program.account.merkleTreeAccount.fetch(treePda);

  const rootIdx: number = treeData.currentRootIndex;
  const root = new Uint8Array((treeData.roots as number[][])[rootIdx]!);
  const filledSubtrees = (treeData.filledSubtrees as number[][]).map(s =>
    new Uint8Array(s)
  );
  const zeros = (treeData.zeros as number[][]).map(z =>
    bytes32ToBigInt(new Uint8Array(z))
  );

  const { pathElements, pathIndices } = await buildMerklePath(
    depositInfo.leafIndex,
    filledSubtrees,
    zeros
  );

  const nullifier = await poseidonHash([idSecret, BigInt(depositInfo.depositIndex)]);
  const nullifierHashBuf = bigIntToBytes32BE(nullifier);
  const recipientField = bytes32ToBigInt(recipient.toBytes());

  const input = {
    idSecret: idSecret.toString(),
    depositIndex: depositInfo.depositIndex.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices: pathIndices.map(i => i.toString()),
    root: bytes32ToBigInt(root).toString(),
    nullifierHash: nullifier.toString(),
    recipient: recipientField.toString(),
  };

  let wasmSource = options?.withdrawWasm;
  let zkeySource = options?.withdrawZkey;
  if (!wasmSource || !zkeySource) {
    const defaults = await resolveDefaultZkPaths();
    wasmSource ??= defaults.withdrawWasm;
    zkeySource ??= defaults.withdrawZkey;
  }

  const { proof } = await silentProve(input, wasmSource, zkeySource);
  const packedProof = packProof(proof);

  return program.methods
    .withdraw(
      Buffer.from(packedProof) as any,
      toBytes32(root),
      toBytes32(nullifierHashBuf),
      recipient,
      denominationBN
    )
    .accounts({
      payer: authority,
      recipient,
    } as any)
    .instruction();
}

/**
 * Transfer ZK ID ownership to a new identity.
 *
 * Proves knowledge of the current idSecret on-chain without revealing it.
 * After transfer, deposits made before the transfer cannot be claimed by the
 * new owner (they are isolated by commitmentStartIndex).
 *
 * @param currentIdSecret - The current owner's idSecret
 * @param newIdSecret     - The new owner's idSecret (from deriveIdSecret())
 */
export async function transferZkId(
  connection: Connection,
  payer: Keypair,
  name: string,
  currentIdSecret: bigint,
  newIdSecret: bigint,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, payer, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const nameHashBuf = await computeNameHash(name);

  // Fetch current id_commitment from chain
  const [zkIdPda] = findZkIdPda(nameHashBuf, programId);
  const zkId = await program.account.zkIdAccount.fetch(zkIdPda);
  const currentCommitmentField = bytes32ToBigInt(
    new Uint8Array(zkId.idCommitment as number[])
  );

  // Compute new id_commitment
  const newCommitment = await poseidonHash([newIdSecret]);
  const newCommitmentBuf = bigIntToBytes32BE(newCommitment);

  // Generate ownership proof: proves knowledge of currentIdSecret
  const input = {
    idSecret: currentIdSecret.toString(),
    idCommitment: currentCommitmentField.toString(),
  };

  let wasmSource = options?.ownershipWasm;
  let zkeySource = options?.ownershipZkey;
  if (!wasmSource || !zkeySource) {
    const defaults = await resolveDefaultZkPaths();
    wasmSource ??= defaults.ownershipWasm;
    zkeySource ??= defaults.ownershipZkey;
  }

  const { proof } = await silentProve(input, wasmSource, zkeySource);
  const packedProof = packProof(proof);

  const ix = await program.methods
    .transferZkId(
      toBytes32(nameHashBuf),
      toBytes32(newCommitmentBuf),
      Buffer.from(packedProof) as any
    )
    .accounts({ payer: payer.publicKey } as any)
    .instruction();
  return sendTx(connection, payer, [ix]);
}

/**
 * Derive the idCommitment (public) from a Keypair + name.
 *
 * The new owner can share this hex string without revealing their idSecret.
 * Returns a 64-char hex string (32 bytes, big-endian).
 */
export async function computeIdCommitment(keypair: Keypair, name: string): Promise<string> {
  const idSecret = await deriveIdSecret(keypair, name);
  const commitment = await poseidonHash([idSecret]);
  return hexFromBytes(bigIntToBytes32BE(commitment));
}

/**
 * Transfer ZK ID ownership using the new owner's idCommitment directly.
 *
 * Unlike transferZkId (which takes newIdSecret), this function accepts the
 * commitment hex produced by computeIdCommitment(), so the new owner never
 * needs to share their secret.
 *
 * @param currentIdSecret  - Current owner's idSecret (from deriveIdSecret)
 * @param newIdCommitment  - New owner's commitment as bigint (parse from hex)
 */
export async function transferZkIdByCommitment(
  connection: Connection,
  payer: Keypair,
  name: string,
  currentIdSecret: bigint,
  newIdCommitment: bigint,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, payer, options?.programId);
  const nameHashBuf = await computeNameHash(name);

  const [zkIdPda] = findZkIdPda(nameHashBuf, new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID));
  const zkId = await program.account.zkIdAccount.fetch(zkIdPda);
  const currentCommitmentField = bytes32ToBigInt(
    new Uint8Array(zkId.idCommitment as number[])
  );

  const newCommitmentBuf = bigIntToBytes32BE(newIdCommitment);

  const input = {
    idSecret: currentIdSecret.toString(),
    idCommitment: currentCommitmentField.toString(),
  };

  let wasmSource = options?.ownershipWasm;
  let zkeySource = options?.ownershipZkey;
  if (!wasmSource || !zkeySource) {
    const defaults = await resolveDefaultZkPaths();
    wasmSource ??= defaults.ownershipWasm;
    zkeySource ??= defaults.ownershipZkey;
  }

  const { proof } = await silentProve(input, wasmSource, zkeySource);
  const packedProof = packProof(proof);

  const ix = await program.methods
    .transferZkId(
      toBytes32(nameHashBuf),
      toBytes32(newCommitmentBuf),
      Buffer.from(packedProof) as any
    )
    .accounts({ payer: payer.publicKey } as any)
    .instruction();
  return sendTx(connection, payer, [ix]);
}

// ─── Admin functions ──────────────────────────────────────────────────────────

/**
 * Initialize the program configuration (one-time setup).
 * The caller becomes the admin.
 */
/**
 * Query the ZK ID program config (admin, fee recipient, fee amount).
 */
export async function getConfig(
  connection: Connection,
  options?: ZkIdOptions
): Promise<{ admin: PublicKey; feeVault: PublicKey; feeAmount: number }> {
  const programId = new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID);
  const [configPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("config")],
    programId
  );
  const accountInfo = await connection.getAccountInfo(configPda);
  if (!accountInfo) {
    throw new Error("ZK ID config account not found");
  }
  const data = accountInfo.data;
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 8; // skip discriminator
  const admin = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const feeVault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
  const feeAmount = Number(view.getBigUint64(offset, true));
  return { admin, feeVault, feeAmount };
}

export async function initializeConfig(
  connection: Connection,
  wallet: Keypair,
  feeAmount: BN | number,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const fee = typeof feeAmount === "number" ? new BN(feeAmount) : feeAmount;
  const ix = await program.methods
    .initializeConfig(fee)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Update the program config: admin, fee recipient, and fee amount (admin-only).
 */
export async function updateConfig(
  connection: Connection,
  wallet: Keypair,
  newAdmin: PublicKey,
  newFeeAmount: BN | number,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const fee = typeof newFeeAmount === "number" ? new BN(newFeeAmount) : newFeeAmount;
  const ix = await program.methods
    .updateConfig(newAdmin, fee)
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
  amount: BN | number,
  options?: ZkIdOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const amt = typeof amount === "number" ? new BN(amount) : amount;
  const ix = await program.methods
    .withdrawFees(amt)
    .accounts({ admin: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}
