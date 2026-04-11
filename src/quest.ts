/**
 * Quest SDK - interact with nara-quest on-chain quiz
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
  unpackAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import type { NaraQuest } from "./idls/nara_quest";
import { DEFAULT_QUEST_PROGRAM_ID } from "./constants";
import { sendTx } from "./tx";

import naraQuestIdl from "./idls/nara_quest.json";

// ─── ZK constants ────────────────────────────────────────────────
const BN254_FIELD =
  21888242871839275222246405745257275088696311157297823662689037894645226208583n;

// Lazily resolve default ZK circuit file paths (Node.js only).
// In browser environments, pass circuitWasmPath/zkeyPath via QuestOptions.
async function resolveDefaultZkPaths(): Promise<{ wasm: string; zkey: string }> {
  const { fileURLToPath } = await import("url");
  const { dirname, join } = await import("path");
  const dir = dirname(fileURLToPath(import.meta.url));
  return {
    wasm: join(dir, "zk", "answer_proof.wasm"),
    zkey: join(dir, "zk", "answer_proof_final.zkey"),
  };
}

// ─── Types ───────────────────────────────────────────────────────

export interface QuestInfo {
  active: boolean;
  round: string;
  question: string;
  answerHash: number[];
  rewardPerWinner: number;
  totalReward: number;
  rewardCount: number;
  winnerCount: number;
  remainingSlots: number;
  difficulty: number;
  deadline: number;
  timeRemaining: number;
  expired: boolean;
  /** High stake requirement for the current round (in NARA, decays over time) */
  stakeHigh: number;
  /** Low stake requirement for the current round (in NARA, floor after decay) */
  stakeLow: number;
  /** Running average participant stake for the current round (in NARA) */
  avgParticipantStake: number;
  /** Unix timestamp when the current question was created */
  createdAt: number;
  /** Current effective stake requirement after parabolic decay (in NARA) */
  effectiveStakeRequirement: number;
}

export interface StakeInfo {
  /** Current staked amount (in NARA) */
  amount: number;
  /** Round when the stake was made */
  stakeRound: number;
  /** Free stake credits (admin-assigned, bypass stake requirement) */
  freeCredits: number;
}

export interface ZkProof {
  proofA: number[];
  proofB: number[];
  proofC: number[];
}

export interface ZkProofHex {
  proofA: string;
  proofB: string;
  proofC: string;
}

export interface SubmitAnswerResult {
  signature: string;
}

export interface SubmitRelayResult {
  txHash: string;
}

export interface QuestOptions {
  programId?: string;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  circuitWasmPath?: string | Uint8Array;
  /** File path (Node.js), URL string, or pre-loaded Uint8Array (browser) */
  zkeyPath?: string | Uint8Array;
  /** "auto" = auto top-up stake to stakeRequirement; number = stake exact NARA amount */
  stake?: "auto" | number;
}

export interface ActivityLog {
  agentId: string;
  model: string;
  activity: string;
  log: string;
  /** Optional referral agent ID for earning referral points */
  referralAgentId?: string;
}

// ─── ZK utilities (browser-compatible, no Buffer) ───────────────

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

function answerToField(answer: string): bigint {
  const encoded = new TextEncoder().encode(answer);
  return BigInt("0x" + hexFromBytes(encoded)) % BN254_FIELD;
}

function hashBytesToFieldStr(hashBytes: number[]): string {
  return BigInt("0x" + hexFromBytes(new Uint8Array(hashBytes))).toString();
}

function pubkeyToCircuitInputs(pubkey: PublicKey): {
  lo: string;
  hi: string;
} {
  const bytes = pubkey.toBytes();
  return {
    lo: BigInt("0x" + hexFromBytes(bytes.slice(16, 32))).toString(),
    hi: BigInt("0x" + hexFromBytes(bytes.slice(0, 16))).toString(),
  };
}

function proofToSolana(proof: any): ZkProof {
  const negY = (y: string) => bigintToBytes32(BN254_FIELD - BigInt(y));
  const be = (s: string) => bigintToBytes32(BigInt(s));
  return {
    proofA: Array.from(concatBytes(be(proof.pi_a[0]), negY(proof.pi_a[1]))),
    proofB: Array.from(concatBytes(
      be(proof.pi_b[0][1]),
      be(proof.pi_b[0][0]),
      be(proof.pi_b[1][1]),
      be(proof.pi_b[1][0]),
    )),
    proofC: Array.from(concatBytes(be(proof.pi_c[0]), be(proof.pi_c[1]))),
  };
}

function proofToHex(proof: any): ZkProofHex {
  const negY = (y: string) => bigintToBytes32(BN254_FIELD - BigInt(y));
  const be = (s: string) => bigintToBytes32(BigInt(s));
  return {
    proofA: hexFromBytes(concatBytes(be(proof.pi_a[0]), negY(proof.pi_a[1]))),
    proofB: hexFromBytes(concatBytes(
      be(proof.pi_b[0][1]),
      be(proof.pi_b[0][0]),
      be(proof.pi_b[1][1]),
      be(proof.pi_b[1][0]),
    )),
    proofC: hexFromBytes(concatBytes(be(proof.pi_c[0]), be(proof.pi_c[1]))),
  };
}

// Suppress console output from snarkjs WASM during proof generation.
async function silentProve(snarkjs: any, input: Record<string, string>, wasmPath: string | Uint8Array, zkeyPath: string | Uint8Array) {
  const savedLog = console.log;
  const savedError = console.error;
  console.log = () => {};
  console.error = () => {};
  try {
    return await snarkjs.groth16.fullProve(input, wasmPath, zkeyPath, null, null, { singleThread: true });
  } finally {
    console.log = savedLog;
    console.error = savedError;
  }
}

// ─── Anchor helpers ──────────────────────────────────────────────

function createProgram(
  connection: Connection,
  wallet: Keypair,
  programId?: string
): Program<NaraQuest> {
  const idl = naraQuestIdl;
  const pid = programId ?? DEFAULT_QUEST_PROGRAM_ID;
  const idlWithPid = { ...idl, address: pid };
  const provider = new AnchorProvider(
    connection,
    new Wallet(wallet),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);
  return new Program<NaraQuest>(idlWithPid as any, provider);
}

function getPoolPda(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("quest_pool")],
    programId
  );
  return pda;
}

function getWinnerRecordPda(
  programId: PublicKey,
  user: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("quest_winner"), user.toBytes()],
    programId
  );
  return pda;
}

function getStakeRecordPda(
  programId: PublicKey,
  user: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("quest_stake"), user.toBytes()],
    programId
  );
  return pda;
}

const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

function getStakeTokenAccount(stakeRecordPda: PublicKey): PublicKey {
  return getAssociatedTokenAddressSync(WSOL_MINT, stakeRecordPda, true);
}

/**
 * Compute the effective stake requirement using the parabolic decay formula.
 * effective = stakeHigh - (stakeHigh - stakeLow) * (elapsed / decay)^2
 * All amounts in NARA (not lamports). Times in milliseconds.
 */
function computeEffectiveStake(
  stakeHigh: number,
  stakeLow: number,
  createdAt: number,
  decayMs: number,
  nowMs: number
): number {
  if (decayMs <= 0) return stakeLow;
  const elapsedMs = nowMs - createdAt;
  if (elapsedMs >= decayMs) return stakeLow;
  const range = stakeHigh - stakeLow;
  const ratio = elapsedMs / decayMs;
  return stakeHigh - range * ratio * ratio;
}

// ─── SDK functions ───────────────────────────────────────────────

/**
 * Get the current active quest info
 */
export async function getQuestInfo(
  connection: Connection,
  wallet?: Keypair,
  options?: QuestOptions
): Promise<QuestInfo> {
  const kp = wallet ?? Keypair.generate();
  const program = createProgram(connection, kp, options?.programId);
  const poolPda = getPoolPda(program.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_QUEST_PROGRAM_ID);
  const [configPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("quest_config")],
    programId
  );

  // Single RPC: fetch pool + gameConfig together
  const [poolAcct, configAcct] = await connection.getMultipleAccountsInfo(
    [poolPda, configPda],
    "confirmed"
  );
  if (!poolAcct) throw new Error(`Pool account not found: ${poolPda.toBase58()}`);
  if (!configAcct) throw new Error(`GameConfig account not found: ${configPda.toBase58()}`);

  const pool = program.coder.accounts.decode("pool", poolAcct.data);
  const config = program.coder.accounts.decode("gameConfig", configAcct.data);

  const now = Math.floor(Date.now() / 1000);
  const deadline = pool.deadline.toNumber();
  const secsLeft = deadline - now;

  const active = pool.question.length > 0 && secsLeft > 0;

  const stakeHigh = Number(pool.stakeHigh.toString()) / LAMPORTS_PER_SOL;
  const stakeLow = Number(pool.stakeLow.toString()) / LAMPORTS_PER_SOL;
  const createdAt = pool.createdAt.toNumber();

  const decayMs = Number(config.decayMs.toString());

  // createdAt is unix timestamp (seconds), convert to ms for decay calculation
  const nowMs = Date.now();
  const createdAtMs = createdAt * 1000;
  const effectiveStakeRequirement = computeEffectiveStake(
    stakeHigh, stakeLow, createdAtMs, decayMs, nowMs
  );

  return {
    active,
    round: pool.round.toString(),
    question: pool.question,
    answerHash: Array.from(pool.answerHash),
    rewardPerWinner: pool.rewardPerWinner.toNumber() / LAMPORTS_PER_SOL,
    totalReward: pool.rewardAmount.toNumber() / LAMPORTS_PER_SOL,
    rewardCount: pool.rewardCount,
    winnerCount: pool.winnerCount,
    remainingSlots: Math.max(0, pool.rewardCount - pool.winnerCount),
    difficulty: pool.difficulty,
    deadline,
    timeRemaining: secsLeft,
    expired: secsLeft <= 0,
    stakeHigh,
    stakeLow,
    avgParticipantStake: Number(pool.avgParticipantStake.toString()) / LAMPORTS_PER_SOL,
    createdAt,
    effectiveStakeRequirement,
  };
}

/**
 * Check if the user has already answered the current round
 */
export async function hasAnswered(
  connection: Connection,
  wallet: Keypair,
  options?: QuestOptions
): Promise<boolean> {
  const program = createProgram(connection, wallet, options?.programId);
  const quest = await getQuestInfo(connection, wallet, options);
  const winnerPda = getWinnerRecordPda(program.programId, wallet.publicKey);
  try {
    const wr = await program.account.winnerRecord.fetch(winnerPda);
    return wr.round.toString() === quest.round;
  } catch {
    return false;
  }
}

/**
 * Generate a ZK proof for a quest answer.
 * Throws if the answer is wrong (circuit assertion fails).
 *
 * @param answer - The answer string (passed directly as circuit input)
 * @param answerHash - The on-chain answer hash bytes
 * @param userPubkey - The user's public key (binds proof to user)
 * @param round - The quest round number (binds proof to round, prevents replay)
 * @param options - Optional circuit paths
 */
export async function generateProof(
  answer: string,
  answerHash: number[],
  userPubkey: PublicKey,
  round: string,
  options?: QuestOptions
): Promise<{ solana: ZkProof; hex: ZkProofHex }> {
  let wasmSource = options?.circuitWasmPath;
  let zkeySource = options?.zkeyPath;
  if (!wasmSource || !zkeySource) {
    const defaults = await resolveDefaultZkPaths();
    wasmSource ??= defaults.wasm;
    zkeySource ??= defaults.zkey;
  }

  const snarkjs = await import("snarkjs");
  const answerHashFieldStr = hashBytesToFieldStr(answerHash);
  const { lo, hi } = pubkeyToCircuitInputs(userPubkey);

  const result = await silentProve(
    snarkjs,
    {
      answer: answerToField(answer).toString(),
      answer_hash: answerHashFieldStr,
      pubkey_lo: lo,
      pubkey_hi: hi,
      round: round,
    },
    wasmSource,
    zkeySource
  );

  return {
    solana: proofToSolana(result.proof),
    hex: proofToHex(result.proof),
  };
}

/**
 * Submit a quest answer on-chain (direct submission, requires gas).
 * If `activityLog` is provided, a logActivity instruction from the Agent Registry
 * is appended to the same transaction.
 */
export async function submitAnswer(
  connection: Connection,
  wallet: Keypair,
  proof: ZkProof,
  agent: string = "",
  model: string = "",
  options?: QuestOptions,
  activityLog?: ActivityLog
): Promise<SubmitAnswerResult> {
  const program = createProgram(connection, wallet, options?.programId);

  // Build optional stake instruction
  let stakeIx: any = null;
  if (options?.stake !== undefined) {
    let stakeLamports: BN;
    if (options.stake === "auto") {
      const quest = await getQuestInfo(connection, wallet, options);
      const stakeInfo = await getStakeInfo(connection, wallet.publicKey, options);
      const required = quest.effectiveStakeRequirement;
      const current = stakeInfo?.amount ?? 0;
      const deficit = required - current;
      if (deficit > 0) {
        stakeLamports = new BN(Math.round(deficit * LAMPORTS_PER_SOL));
      } else {
        stakeLamports = new BN(0);
      }
    } else {
      stakeLamports = new BN(Math.round(options.stake * LAMPORTS_PER_SOL));
    }
    if (!stakeLamports.isZero()) {
      stakeIx = await program.methods
        .stake(stakeLamports)
        .accounts({ user: wallet.publicKey } as any)
        .instruction();
    }
  }

  const submitIx = await program.methods
    .submitAnswer(proof.proofA as any, proof.proofB as any, proof.proofC as any, agent, model)
    .accounts({ user: wallet.publicKey, payer: wallet.publicKey })
    .instruction();

  const ixs = [];
  if (stakeIx) ixs.push(stakeIx);
  ixs.push(submitIx);

  if (activityLog) {
    const { makeLogActivityIx, makeLogActivityWithReferralIx } = await import("./agent_registry");
    const logIx = activityLog.referralAgentId
      ? await makeLogActivityWithReferralIx(
          connection,
          wallet.publicKey,
          activityLog.agentId,
          activityLog.model,
          activityLog.activity,
          activityLog.log,
          activityLog.referralAgentId
        )
      : await makeLogActivityIx(
          connection,
          wallet.publicKey,
          activityLog.agentId,
          activityLog.model,
          activityLog.activity,
          activityLog.log
        );
    ixs.push(logIx);
  }

  const signature = await sendTx(connection, wallet, ixs, [], {
    skipPreflight: true,
    computeUnitLimit: 500_000,
    computeUnitPrice: "auto",
  });
  return { signature };
}

/**
 * Submit a quest answer via relay (gasless submission)
 */
export async function submitAnswerViaRelay(
  relayUrl: string,
  userPubkey: PublicKey,
  proof: ZkProofHex,
  agent: string = "",
  model: string = ""
): Promise<SubmitRelayResult> {
  const base = relayUrl.replace(/\/+$/, "");
  const res = await fetch(`${base}/submit-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user: userPubkey.toBase58(),
      proofA: proof.proofA,
      proofB: proof.proofB,
      proofC: proof.proofC,
      agent,
      model,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(`Relay submission failed: ${data.error ?? `HTTP ${res.status}`}`);
  }

  return { txHash: data.txHash };
}

/**
 * Parse reward info from a quest transaction's log messages
 */
export async function parseQuestReward(
  connection: Connection,
  txSignature: string,
  retries = 10
): Promise<{ rewarded: boolean; rewardLamports: number; rewardNso: number; winner: string }> {
  await new Promise((r) => setTimeout(r, 2000));

  let txInfo: any;
  for (let i = 0; i < retries; i++) {
    try {
      txInfo = await connection.getTransaction(txSignature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (txInfo) break;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!txInfo) {
    throw new Error("Failed to fetch transaction details");
  }

  let rewardLamports = 0;
  let winner = "";
  const logs: string[] = txInfo.meta?.logMessages ?? [];
  for (const log of logs) {
    const m = log.match(/reward (\d+) lamports \(winner (\d+\/\d+)\)/);
    if (m) {
      rewardLamports = parseInt(m[1]!);
      winner = m[2]!;
      break;
    }
  }

  return {
    rewarded: rewardLamports > 0,
    rewardLamports,
    rewardNso: rewardLamports / LAMPORTS_PER_SOL,
    winner,
  };
}

/**
 * Compute the Poseidon answer hash for a given answer string.
 * Uses answerToField (UTF-8 encoding) consistent with on-chain question creation.
 */
export async function computeAnswerHash(answer: string): Promise<number[]> {
  const circomlibjs = await import("circomlibjs");
  const poseidon = await circomlibjs.buildPoseidon();
  const fieldVal = answerToField(answer);
  const hashRaw = poseidon([fieldVal]);
  const hashStr: string = poseidon.F.toString(hashRaw);
  return Array.from(bigintToBytes32(BigInt(hashStr)));
}

/**
 * Stake NARA to participate in quests.
 *
 * @param amount - Amount to stake in NARA
 */
export async function stake(
  connection: Connection,
  wallet: Keypair,
  amount: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const lamports = new BN(Math.round(amount * LAMPORTS_PER_SOL));
  const ix = await program.methods
    .stake(lamports)
    .accounts({ user: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Unstake NARA. Can only unstake after the round advances or deadline passes.
 *
 * @param amount - Amount to unstake in NARA
 */
export async function unstake(
  connection: Connection,
  wallet: Keypair,
  amount: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const lamports = new BN(Math.round(amount * LAMPORTS_PER_SOL));
  const ix = await program.methods
    .unstake(lamports)
    .accounts({ user: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Get stake info for a user. Returns null if no stake record exists.
 * Reads the wSOL token account balance to determine staked amount.
 */
export async function getStakeInfo(
  connection: Connection,
  user: PublicKey,
  options?: QuestOptions
): Promise<StakeInfo | null> {
  const kp = Keypair.generate();
  const program = createProgram(connection, kp, options?.programId);
  const stakeRecordPda = getStakeRecordPda(program.programId, user);
  const stakeTokenAccount = getStakeTokenAccount(stakeRecordPda);

  // Single batch: fetch stake record + wSOL token account at once.
  // Both are plain account reads, so getMultipleAccountsInfo works.
  const [recordAcct, tokenAcct] = await connection.getMultipleAccountsInfo(
    [stakeRecordPda, stakeTokenAccount],
    "confirmed"
  );
  if (!recordAcct) return null;

  let record;
  try {
    record = program.coder.accounts.decode("stakeRecord", recordAcct.data);
  } catch {
    return null;
  }

  // Decode wSOL token account (legacy SPL Token program)
  let amount = 0;
  if (tokenAcct) {
    try {
      const unpacked = unpackAccount(stakeTokenAccount, tokenAcct, TOKEN_PROGRAM_ID);
      amount = Number(unpacked.amount) / LAMPORTS_PER_SOL;
    } catch {
      // Token account not initialized yet
    }
  }

  return {
    amount,
    stakeRound: record.stakeRound.toNumber(),
    freeCredits: record.freeCredits,
  };
}

/**
 * Build a createQuestion instruction (does not send).
 *
 * @param connection - Solana connection
 * @param caller - Authority public key (must be the program authority or quest_authority)
 * @param question - The question text
 * @param answer - The answer string (will be hashed with Poseidon + answerToField)
 * @param deadlineSeconds - Duration in seconds from now until the deadline
 * @param difficulty - Difficulty level (default: 1)
 * @param options - Optional program ID override
 */
export async function makeCreateQuestionIx(
  connection: Connection,
  caller: PublicKey,
  question: string,
  answer: string,
  deadlineSeconds: number,
  difficulty: number = 1,
  options?: QuestOptions
) {
  const kp = Keypair.generate();
  const program = createProgram(connection, kp, options?.programId);
  const answerHash = await computeAnswerHash(answer);
  const deadline = new BN(Math.floor(Date.now() / 1000) + deadlineSeconds);

  return program.methods
    .createQuestion(question, answerHash as any, deadline, difficulty)
    .accounts({ caller } as any)
    .instruction();
}

/**
 * Create a new quest question on-chain (authority or quest_authority).
 *
 * @param connection - Solana connection
 * @param wallet - Authority keypair (must be the program authority or quest_authority)
 * @param question - The question text
 * @param answer - The answer string (will be hashed with Poseidon + answerToField)
 * @param deadlineSeconds - Duration in seconds from now until the deadline
 * @param difficulty - Difficulty level (default: 1)
 * @param options - Optional program ID override
 */
export async function createQuestion(
  connection: Connection,
  wallet: Keypair,
  question: string,
  answer: string,
  deadlineSeconds: number,
  difficulty: number = 1,
  options?: QuestOptions
): Promise<string> {
  const ix = await makeCreateQuestionIx(
    connection, wallet.publicKey, question, answer, deadlineSeconds, difficulty, options
  );
  return sendTx(connection, wallet, [ix]);
}

// ─── Admin functions ───────────────────────────────────────────────

/**
 * Initialize the quest program (one-time setup). The caller becomes the authority.
 */
export async function initializeQuest(
  connection: Connection,
  wallet: Keypair,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .initialize()
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set the reward config (authority only).
 */
export async function setRewardConfig(
  connection: Connection,
  wallet: Keypair,
  minRewardCount: number,
  maxRewardCount: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setRewardConfig(minRewardCount, maxRewardCount)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set the stake config (authority only).
 * @param bpsHigh - Upper bound multiplier in basis points (e.g. 100000 = 10x average)
 * @param bpsLow - Lower bound multiplier in basis points (e.g. 1000 = 0.1x average)
 * @param decayMs - Time window in milliseconds for parabolic decay from high to low
 */
export async function setStakeConfig(
  connection: Connection,
  wallet: Keypair,
  bpsHigh: number,
  bpsLow: number,
  decayMs: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setStakeConfig(new BN(bpsHigh), new BN(bpsLow), new BN(decayMs))
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Transfer quest program authority to a new address (authority only).
 */
export async function transferQuestAuthority(
  connection: Connection,
  wallet: Keypair,
  newAuthority: PublicKey,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .transferAuthority(newAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set a quest authority that can create questions (authority only).
 */
export async function setQuestAuthority(
  connection: Connection,
  wallet: Keypair,
  newQuestAuthority: PublicKey,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setQuestAuthority(newQuestAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set the minimum quest interval in seconds (authority only).
 */
export async function setQuestInterval(
  connection: Connection,
  wallet: Keypair,
  minQuestInterval: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setQuestInterval(new BN(minQuestInterval))
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set the reward per share and extra reward (authority only).
 */
export async function setRewardPerShare(
  connection: Connection,
  wallet: Keypair,
  rewardPerShare: number | BN,
  extraReward: number | BN,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const rps = typeof rewardPerShare === "number" ? new BN(rewardPerShare) : rewardPerShare;
  const er = typeof extraReward === "number" ? new BN(extraReward) : extraReward;
  const ix = await program.methods
    .setRewardPerShare(rps, er)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Get quest program config (authority, min/max reward count).
 */
export async function getQuestConfig(
  connection: Connection,
  options?: QuestOptions
): Promise<{
  authority: PublicKey;
  minRewardCount: number;
  maxRewardCount: number;
  stakeBpsHigh: number;
  stakeBpsLow: number;
  decayMs: number;
  treasury: PublicKey;
  questAuthority: PublicKey;
  minQuestInterval: number;
  rewardPerShare: number;
  extraReward: number;
  stakeAuthority: PublicKey;
  airdropAmount: number;
  maxAirdropCount: number;
}> {
  const kp = Keypair.generate();
  const program = createProgram(connection, kp, options?.programId);
  const programId = new PublicKey(options?.programId ?? DEFAULT_QUEST_PROGRAM_ID);
  const [configPda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("quest_config")],
    programId
  );
  const config = await program.account.gameConfig.fetch(configPda);
  return {
    authority: config.authority,
    minRewardCount: config.minRewardCount,
    maxRewardCount: config.maxRewardCount,
    stakeBpsHigh: Number(config.stakeBpsHigh.toString()),
    stakeBpsLow: Number(config.stakeBpsLow.toString()),
    decayMs: Number(config.decayMs.toString()),
    treasury: config.treasury,
    questAuthority: config.questAuthority,
    minQuestInterval: Number(config.minQuestInterval.toString()),
    rewardPerShare: Number(config.rewardPerShare.toString()),
    extraReward: Number(config.extraReward.toString()),
    stakeAuthority: config.stakeAuthority,
    airdropAmount: Number(config.airdropAmount.toString()),
    maxAirdropCount: config.maxAirdropCount,
  };
}

/**
 * Set a stake authority that can adjust free stake credits (authority only).
 */
export async function setStakeAuthority(
  connection: Connection,
  wallet: Keypair,
  newStakeAuthority: PublicKey,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .setStakeAuthority(newStakeAuthority)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Build an adjustFreeStake instruction without sending it.
 */
export async function makeAdjustFreeStakeIx(
  connection: Connection,
  caller: PublicKey,
  user: PublicKey,
  delta: number,
  reason: string,
  options?: QuestOptions
) {
  const program = createProgram(connection, Keypair.generate(), options?.programId);
  return program.methods
    .adjustFreeStake(delta, reason)
    .accounts({ user, caller } as any)
    .instruction();
}

/**
 * Adjust free stake credits for a user (stake_authority or authority only).
 * @param user - The user whose free credits to adjust
 * @param delta - Amount to adjust (positive to add, negative to remove)
 * @param reason - Reason for the adjustment (logged on-chain)
 */
export async function adjustFreeStake(
  connection: Connection,
  wallet: Keypair,
  user: PublicKey,
  delta: number,
  reason: string,
  options?: QuestOptions
): Promise<string> {
  const ix = await makeAdjustFreeStakeIx(connection, wallet.publicKey, user, delta, reason, options);
  return sendTx(connection, wallet, [ix]);
}

/**
 * Claim airdrop for a user. The payer pays for the transaction.
 * @param user - The user to claim airdrop for
 */
export async function claimAirdrop(
  connection: Connection,
  wallet: Keypair,
  user: PublicKey,
  proof: ZkProof,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const ix = await program.methods
    .claimAirdrop(proof.proofA as any, proof.proofB as any, proof.proofC as any)
    .accounts({ user, payer: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}

/**
 * Set airdrop configuration (authority only).
 * @param airdropAmount - Amount per airdrop in lamports
 * @param maxAirdropCount - Maximum number of airdrops per user
 */
export async function setAirdropConfig(
  connection: Connection,
  wallet: Keypair,
  airdropAmount: number | BN,
  maxAirdropCount: number,
  options?: QuestOptions
): Promise<string> {
  const program = createProgram(connection, wallet, options?.programId);
  const amt = typeof airdropAmount === "number" ? new BN(airdropAmount) : airdropAmount;
  const ix = await program.methods
    .setAirdropConfig(amt, maxAirdropCount)
    .accounts({ authority: wallet.publicKey } as any)
    .instruction();
  return sendTx(connection, wallet, [ix]);
}
