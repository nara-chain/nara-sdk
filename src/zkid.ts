/**
 * zkid module - interact with nara-zk anonymous identity protocol
 *
 * A ZK ID is a named account where:
 * - Anyone can deposit NARA knowing only the name
 * - Only the owner (who knows the idSecret) can withdraw anonymously
 * - Ownership can be transferred via ZK proof without revealing the owner's wallet
 */

import { createHash } from "crypto";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { buildPoseidon as _buildPoseidon } from "circomlibjs";
import nacl from "tweetnacl";
import BN from "bn.js";
import type { NaraZk } from "./idls/nara_zk";
import { DEFAULT_ZKID_PROGRAM_ID } from "./constants";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));

// ─── Constants ────────────────────────────────────────────────────────────────

const BN254_PRIME =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;
const MERKLE_LEVELS = 64;

const WITHDRAW_WASM = join(__dirname, "zk", "withdraw.wasm");
const WITHDRAW_ZKEY = join(__dirname, "zk", "withdraw_final.zkey");
const OWNERSHIP_WASM = join(__dirname, "zk", "ownership.wasm");
const OWNERSHIP_ZKEY = join(__dirname, "zk", "ownership_final.zkey");

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
}

// ─── Internal crypto helpers ─────────────────────────────────────────────────

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

function bigIntToBytes32BE(n: bigint): Buffer {
  if (n < 0n || n >= BN254_PRIME) {
    throw new Error(`bigint out of BN254 field range: ${n}`);
  }
  return Buffer.from(n.toString(16).padStart(64, "0"), "hex");
}

function bytes32ToBigInt(buf: Buffer | Uint8Array): bigint {
  return BigInt("0x" + Buffer.from(buf).toString("hex"));
}

function toBytes32(buf: Buffer | Uint8Array): number[] {
  return Array.from(buf.slice(0, 32));
}

function computeNameHash(name: string): Buffer {
  return createHash("sha256").update("nara-zk:" + name).digest();
}

function denomBuf(denomination: BN): Buffer {
  return Buffer.from(denomination.toArray("le", 8));
}

function packProof(proof: {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
}): Buffer {
  const ax = BigInt(proof.pi_a[0]!);
  const ay = BigInt(proof.pi_a[1]!);
  const ay_neg = BN254_PRIME - ay; // negate y: standard G1 negation on BN254

  const proofA = Buffer.concat([
    bigIntToBytes32BE(ax),
    bigIntToBytes32BE(ay_neg),
  ]);
  const proofB = Buffer.concat([
    bigIntToBytes32BE(BigInt(proof.pi_b[0]![1]!)), // x.c1
    bigIntToBytes32BE(BigInt(proof.pi_b[0]![0]!)), // x.c0
    bigIntToBytes32BE(BigInt(proof.pi_b[1]![1]!)), // y.c1
    bigIntToBytes32BE(BigInt(proof.pi_b[1]![0]!)), // y.c0
  ]);
  const proofC = Buffer.concat([
    bigIntToBytes32BE(BigInt(proof.pi_c[0]!)),
    bigIntToBytes32BE(BigInt(proof.pi_c[1]!)),
  ]);
  return Buffer.concat([proofA, proofB, proofC]); // 256 bytes total
}

async function buildMerklePath(
  leafIndex: bigint,
  filledSubtrees: Buffer[],
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
  wasmPath: string,
  zkeyPath: string
) {
  const snarkjs = _require("snarkjs");
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
  const idl = _require("./idls/nara_zk.json");
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
  const idl = _require("./idls/nara_zk.json");
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

function findZkIdPda(nameHashBuf: Buffer, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("zk_id"), nameHashBuf],
    programId
  );
}

function findInboxPda(nameHashBuf: Buffer, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("inbox"), nameHashBuf],
    programId
  );
}

function findConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
}

function findNullifierPda(
  denomination: BN,
  nullifierHash: Buffer,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("nullifier"), denomBuf(denomination), nullifierHash],
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
  const message = Buffer.from(`nara-zk:idsecret:v1:${name}`);
  const sig = nacl.sign.detached(message, keypair.secretKey);
  const digest = createHash("sha256").update(sig).digest();
  const n = BigInt("0x" + digest.toString("hex"));
  return (n % (BN254_PRIME - 1n)) + 1n;
}

/**
 * Check if a PublicKey is usable as a recipient (must be < BN254 field prime).
 * The ZK withdraw circuit encodes the recipient as a BN254 field element.
 */
export function isValidRecipient(pubkey: PublicKey): boolean {
  return bytes32ToBigInt(Buffer.from(pubkey.toBytes())) < BN254_PRIME;
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
  const [zkIdPda] = findZkIdPda(computeNameHash(name), programId);
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

  const nameHashBuf = computeNameHash(name);
  const idCommitment = await poseidonHash([idSecret]);
  const idCommitmentBuf = bigIntToBytes32BE(idCommitment);

  // Fetch config for fee_recipient
  const [configPda] = findConfigPda(programId);
  const config = await program.account.configAccount.fetch(configPda);

  return await program.methods
    .register(toBytes32(nameHashBuf), toBytes32(idCommitmentBuf))
    .accounts({
      payer: payer.publicKey,
      feeRecipient: config.feeRecipient,
    } as any)
    .rpc();
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
  const nameHashBuf = computeNameHash(name);

  return await program.methods
    .deposit(toBytes32(nameHashBuf), denomination)
    .accounts({ depositor: payer.publicKey } as any)
    .rpc();
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
  const nameHashBuf = computeNameHash(name);

  const [zkIdPda] = findZkIdPda(nameHashBuf, programId);
  const [inboxPda] = findInboxPda(nameHashBuf, programId);

  const zkId = await program.account.zkIdAccount.fetch(zkIdPda);
  const inbox = await program.account.inboxAccount.fetch(inboxPda);

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

  const claimable: ClaimableDeposit[] = [];
  for (let i = 0; i < entries.length; i++) {
    const depositIndex = startDepositIndex + i;

    // Deposits before commitmentStartIndex belong to a previous owner
    if (depositIndex < commitmentStart) continue;

    const { leafIndex, denomination } = entries[i]!;

    // Check if nullifier has been spent
    const nullifierHash_bi = await poseidonHash([idSecret, BigInt(depositIndex)]);
    const nullifierHashBuf = bigIntToBytes32BE(nullifierHash_bi);
    const denominationBN = new BN(denomination.toString());
    const [nullifierPda] = findNullifierPda(denominationBN, nullifierHashBuf, programId);
    const nullifierInfo = await connection.getAccountInfo(nullifierPda);

    if (nullifierInfo === null) {
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
    [Buffer.from("tree"), denomBuf(denominationBN)],
    programId
  );
  const treeData = await program.account.merkleTreeAccount.fetch(treePda);

  const rootIdx: number = treeData.currentRootIndex;
  const root = Buffer.from((treeData.roots as number[][])[rootIdx]!);
  const filledSubtrees = (treeData.filledSubtrees as number[][]).map(s =>
    Buffer.from(s)
  );
  // Use on-chain precomputed zeros (avoids expensive client-side computation)
  const zeros = (treeData.zeros as number[][]).map(z =>
    bytes32ToBigInt(Buffer.from(z))
  );

  const { pathElements, pathIndices } = await buildMerklePath(
    depositInfo.leafIndex,
    filledSubtrees,
    zeros
  );

  const nullifier = await poseidonHash([idSecret, BigInt(depositInfo.depositIndex)]);
  const nullifierHashBuf = bigIntToBytes32BE(nullifier);
  const recipientField = bytes32ToBigInt(Buffer.from(recipient.toBytes()));

  const input = {
    idSecret: idSecret.toString(),
    depositIndex: depositInfo.depositIndex.toString(),
    pathElements: pathElements.map(e => e.toString()),
    pathIndices: pathIndices.map(i => i.toString()),
    root: bytes32ToBigInt(root).toString(),
    nullifierHash: nullifier.toString(),
    recipient: recipientField.toString(),
  };

  const { proof } = await silentProve(input, WITHDRAW_WASM, WITHDRAW_ZKEY);
  const packedProof = packProof(proof);

  return await program.methods
    .withdraw(
      packedProof,
      toBytes32(root),
      toBytes32(nullifierHashBuf),
      recipient,
      denominationBN
    )
    .accounts({
      payer: payer.publicKey,
      recipient,
    } as any)
    .rpc();
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
  const nameHashBuf = computeNameHash(name);

  // Fetch current id_commitment from chain
  const [zkIdPda] = findZkIdPda(nameHashBuf, programId);
  const zkId = await program.account.zkIdAccount.fetch(zkIdPda);
  const currentCommitmentField = bytes32ToBigInt(
    Buffer.from(zkId.idCommitment as number[])
  );

  // Compute new id_commitment
  const newCommitment = await poseidonHash([newIdSecret]);
  const newCommitmentBuf = bigIntToBytes32BE(newCommitment);

  // Generate ownership proof: proves knowledge of currentIdSecret
  const input = {
    idSecret: currentIdSecret.toString(),
    idCommitment: currentCommitmentField.toString(),
  };
  const { proof } = await silentProve(input, OWNERSHIP_WASM, OWNERSHIP_ZKEY);
  const packedProof = packProof(proof);

  return await program.methods
    .transferZkId(
      toBytes32(nameHashBuf),
      toBytes32(newCommitmentBuf),
      packedProof
    )
    .accounts({ payer: payer.publicKey } as any)
    .rpc();
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
  return bigIntToBytes32BE(commitment).toString("hex");
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
  const nameHashBuf = computeNameHash(name);

  const [zkIdPda] = findZkIdPda(nameHashBuf, new PublicKey(options?.programId ?? DEFAULT_ZKID_PROGRAM_ID));
  const zkId = await program.account.zkIdAccount.fetch(zkIdPda);
  const currentCommitmentField = bytes32ToBigInt(
    Buffer.from(zkId.idCommitment as number[])
  );

  const newCommitmentBuf = bigIntToBytes32BE(newIdCommitment);

  const input = {
    idSecret: currentIdSecret.toString(),
    idCommitment: currentCommitmentField.toString(),
  };
  const { proof } = await silentProve(input, OWNERSHIP_WASM, OWNERSHIP_ZKEY);
  const packedProof = packProof(proof);

  return await program.methods
    .transferZkId(
      toBytes32(nameHashBuf),
      toBytes32(newCommitmentBuf),
      packedProof
    )
    .accounts({ payer: payer.publicKey } as any)
    .rpc();
}
