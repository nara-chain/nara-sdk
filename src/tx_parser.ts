/**
 * Transaction parser — decodes on-chain transaction into human-readable instructions.
 *
 * Supports:
 *   - ComputeBudget (CU limit / price)
 *   - SystemProgram (transfer, createAccount, ...)
 *   - SPL Token / Token-2022 (transfer, transferChecked, burn, mintTo, ...)
 *   - Associated Token Account (create)
 *   - Quest (PoMI) — answer, stake, airdrop, etc.
 *   - Agent Registry — register, twitter, tweet, etc.
 *   - Skills Hub — register, upload, etc.
 *   - ZK ID — deposit, withdraw, transfer, etc.
 *   - Bridge (Hyperlane warp routes) — TransferRemote
 */

import {
  Connection,
  PublicKey,
  SystemInstruction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from "@solana/web3.js";
import type {
  MessageCompiledInstruction,
  VersionedTransactionResponse,
} from "@solana/web3.js";
import {
  decodeInstruction as decodeSplTokenInstruction,
  TokenInstruction,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  DEFAULT_QUEST_PROGRAM_ID,
  DEFAULT_AGENT_REGISTRY_PROGRAM_ID,
  DEFAULT_SKILLS_PROGRAM_ID,
  DEFAULT_ZKID_PROGRAM_ID,
} from "./constants";
import { BRIDGE_TOKENS } from "./bridge";

// ─── Types ────────────────────────────────────────────────────────

export interface ParsedInstruction {
  /**
   * Instruction index. For top-level ixs this is the 0-based position in the tx.
   * For inner ixs this is the 0-based position within the parent's CPI list.
   */
  index: number;
  /** Human-readable program name */
  programName: string;
  /** Program ID */
  programId: string;
  /** Human-readable instruction type / name */
  type: string;
  /** Decoded fields (key-value) */
  info: Record<string, unknown>;
  /** All account pubkeys involved */
  accounts: string[];
  /** Raw instruction data (base64) */
  rawData: string;
  /**
   * Inner instructions (CPI calls) made by this instruction.
   * Only populated on top-level ixs; empty/undefined for ixs that made no CPI calls.
   */
  innerInstructions?: ParsedInstruction[];
}

export interface ParsedTransaction {
  /** Transaction signature */
  signature: string;
  /** Slot number */
  slot: number;
  /** Block time (unix) */
  blockTime: number | null;
  /** Whether the transaction succeeded */
  success: boolean;
  /** Error message if failed */
  error: string | null;
  /** Fee paid in lamports */
  fee: number;
  /** Top-level instructions. Inner (CPI) ixs are nested under each one via `innerInstructions`. */
  instructions: ParsedInstruction[];
  /** Log messages */
  logs: string[];
}

// ─── Program ID registry ──────────────────────────────────────────

const SYSTEM_PROGRAM = SystemProgram.programId.toBase58();
const COMPUTE_BUDGET = ComputeBudgetProgram.programId.toBase58();
const TOKEN_PROGRAM = TOKEN_PROGRAM_ID.toBase58();
const TOKEN_2022 = TOKEN_2022_PROGRAM_ID.toBase58();
const ATA_PROGRAM = ASSOCIATED_TOKEN_PROGRAM_ID.toBase58();
const MEMO_PROGRAM = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
const MEMO_PROGRAM_V1 = "Memo1UhkJBfCR6MNBin8nfyBmg8aW7S8K2LoYKrntv";

function buildProgramNameMap(): Map<string, string> {
  const m = new Map<string, string>();

  // System programs
  m.set(SYSTEM_PROGRAM, "System Program");
  m.set(COMPUTE_BUDGET, "Compute Budget");
  m.set(TOKEN_PROGRAM, "SPL Token");
  m.set(TOKEN_2022, "SPL Token-2022");
  m.set(ATA_PROGRAM, "Associated Token");
  m.set(MEMO_PROGRAM, "Memo");
  m.set(MEMO_PROGRAM_V1, "Memo (v1)");

  // Nara programs
  m.set(DEFAULT_QUEST_PROGRAM_ID, "Quest (PoMI)");
  m.set(DEFAULT_AGENT_REGISTRY_PROGRAM_ID, "Agent Registry");
  m.set(DEFAULT_SKILLS_PROGRAM_ID, "Skills Hub");
  m.set(DEFAULT_ZKID_PROGRAM_ID, "ZK ID");

  // Hyperlane mailboxes
  m.set("E588QtVUvresuXq2KoNEwAmoifCzYGpRBdHByN9KQMbi", "Hyperlane Mailbox (Solana)");
  m.set("EjtLD3MCBJregFKAce2pQqPtSnnmBWK5oAZ3wBifHnaH", "Hyperlane Mailbox (Nara)");
  m.set("noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV", "SPL Noop");

  // Bridge warp routes
  for (const [symbol, cfg] of Object.entries(BRIDGE_TOKENS)) {
    m.set(cfg.solana.warpProgram.toBase58(), `Bridge: ${symbol} (Solana)`);
    m.set(cfg.nara.warpProgram.toBase58(), `Bridge: ${symbol} (Nara)`);
  }

  return m;
}

const programNames = buildProgramNameMap();

function getProgramName(pid: string): string {
  return programNames.get(pid) ?? "Unknown";
}

// ─── Anchor discriminator map ─────────────────────────────────────

type DiscriminatorMap = Map<string, string>;

function discKey(bytes: number[]): string {
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function buildAnchorDiscriminators(): Map<string, DiscriminatorMap> {
  const programs = new Map<string, DiscriminatorMap>();

  // Quest
  const quest: DiscriminatorMap = new Map();
  quest.set(discKey([221, 73, 184, 157, 1, 150, 231, 48]), "submitAnswer");
  quest.set(discKey([206, 176, 202, 18, 200, 209, 179, 108]), "stake");
  quest.set(discKey([90, 95, 107, 42, 205, 124, 50, 225]), "unstake");
  quest.set(discKey([222, 74, 49, 30, 160, 220, 179, 27]), "createQuestion");
  quest.set(discKey([137, 50, 122, 111, 89, 254, 8, 20]), "claimAirdrop");
  quest.set(discKey([21, 111, 164, 64, 220, 115, 26, 60]), "adjustFreeStake");
  quest.set(discKey([255, 181, 252, 34, 155, 230, 65, 227]), "setAirdropConfig");
  quest.set(discKey([175, 175, 109, 31, 13, 152, 155, 237]), "initialize");
  quest.set(discKey([120, 201, 195, 128, 35, 202, 73, 161]), "expandConfig");
  quest.set(discKey([19, 140, 189, 111, 121, 111, 118, 50]), "setQuestAuthority");
  quest.set(discKey([69, 227, 209, 29, 164, 111, 166, 41]), "setQuestInterval");
  quest.set(discKey([163, 34, 211, 14, 25, 118, 181, 233]), "setRewardConfig");
  quest.set(discKey([163, 41, 94, 29, 221, 56, 112, 60]), "setRewardPerShare");
  quest.set(discKey([202, 75, 225, 146, 240, 65, 15, 60]), "setStakeAuthority");
  quest.set(discKey([84, 37, 76, 39, 236, 111, 214, 191]), "setStakeConfig");
  quest.set(discKey([48, 169, 76, 72, 229, 180, 55, 161]), "transferAuthority");
  programs.set(DEFAULT_QUEST_PROGRAM_ID, quest);

  // Agent Registry
  const agent: DiscriminatorMap = new Map();
  agent.set(discKey([135, 157, 66, 195, 2, 113, 175, 30]), "registerAgent");
  agent.set(discKey([12, 236, 115, 32, 129, 99, 250, 6]), "registerAgentWithReferral");
  agent.set(discKey([136, 238, 98, 223, 118, 178, 238, 183]), "setTwitter");
  agent.set(discKey([170, 213, 202, 134, 247, 139, 15, 24]), "verifyTwitter");
  agent.set(discKey([97, 238, 35, 162, 61, 92, 88, 183]), "rejectTwitter");
  agent.set(discKey([119, 20, 181, 34, 178, 73, 81, 50]), "approveRejectedTwitter");
  agent.set(discKey([93, 66, 28, 60, 27, 34, 252, 166]), "unbindTwitter");
  agent.set(discKey([140, 200, 213, 38, 145, 255, 191, 254]), "submitTweet");
  agent.set(discKey([57, 71, 49, 146, 108, 84, 107, 45]), "approveTweet");
  agent.set(discKey([231, 64, 127, 185, 55, 253, 175, 30]), "rejectTweet");
  agent.set(discKey([92, 170, 90, 13, 148, 155, 212, 55]), "deleteAgent");
  agent.set(discKey([196, 133, 219, 43, 75, 223, 195, 213]), "setBio");
  agent.set(discKey([78, 157, 75, 242, 151, 20, 121, 144]), "setMetadata");
  agent.set(discKey([213, 23, 157, 74, 199, 152, 182, 8]), "setReferral");
  agent.set(discKey([158, 66, 173, 69, 248, 86, 13, 237]), "logActivity");
  agent.set(discKey([165, 163, 235, 109, 240, 153, 233, 188]), "logActivityWithReferral");
  agent.set(discKey([123, 211, 233, 210, 166, 139, 218, 60]), "initBuffer");
  agent.set(discKey([114, 53, 121, 144, 201, 97, 248, 69]), "writeToBuffer");
  agent.set(discKey([46, 114, 179, 58, 57, 45, 194, 172]), "closeBuffer");
  agent.set(discKey([215, 42, 43, 208, 191, 38, 11, 146]), "finalizeMemoryNew");
  agent.set(discKey([163, 20, 118, 65, 132, 16, 239, 4]), "finalizeMemoryUpdate");
  agent.set(discKey([50, 204, 47, 193, 90, 227, 5, 220]), "finalizeMemoryAppend");
  agent.set(discKey([23, 235, 115, 232, 168, 96, 1, 231]), "initConfig");
  agent.set(discKey([120, 201, 195, 128, 35, 202, 73, 161]), "expandConfig");
  agent.set(discKey([161, 176, 40, 213, 60, 184, 179, 228]), "updateAdmin");
  agent.set(discKey([16, 11, 242, 97, 55, 197, 142, 249]), "updateRegisterFee");
  agent.set(discKey([129, 209, 121, 34, 163, 184, 187, 56]), "updateReferralConfig");
  agent.set(discKey([81, 250, 176, 204, 250, 169, 146, 144]), "updateTwitterVerifier");
  agent.set(discKey([74, 177, 105, 71, 46, 192, 112, 135]), "updateTwitterVerificationConfig");
  agent.set(discKey([16, 173, 44, 208, 249, 61, 172, 152]), "updateTweetVerifyConfig");
  agent.set(discKey([167, 203, 189, 80, 145, 175, 74, 127]), "updateActivityConfig");
  agent.set(discKey([15, 89, 27, 201, 127, 239, 187, 80]), "updatePointsConfig");
  agent.set(discKey([198, 212, 171, 109, 144, 215, 174, 89]), "withdrawFees");
  agent.set(discKey([64, 212, 105, 60, 34, 93, 221, 176]), "withdrawTwitterVerifyFees");
  agent.set(discKey([48, 169, 76, 72, 229, 180, 55, 161]), "transferAuthority");
  programs.set(DEFAULT_AGENT_REGISTRY_PROGRAM_ID, agent);

  // Skills Hub
  const skills: DiscriminatorMap = new Map();
  skills.set(discKey([166, 249, 255, 189, 192, 197, 102, 2]), "registerSkill");
  skills.set(discKey([123, 211, 233, 210, 166, 139, 218, 60]), "initBuffer");
  skills.set(discKey([114, 53, 121, 144, 201, 97, 248, 69]), "writeToBuffer");
  skills.set(discKey([46, 114, 179, 58, 57, 45, 194, 172]), "closeBuffer");
  skills.set(discKey([253, 108, 88, 38, 27, 56, 113, 217]), "finalizeSkillNew");
  skills.set(discKey([43, 248, 97, 58, 212, 79, 238, 179]), "finalizeSkillUpdate");
  skills.set(discKey([17, 38, 1, 212, 5, 56, 231, 151]), "deleteSkill");
  skills.set(discKey([234, 4, 121, 243, 47, 60, 8, 236]), "setDescription");
  skills.set(discKey([170, 182, 43, 239, 97, 78, 225, 186]), "updateMetadata");
  skills.set(discKey([23, 235, 115, 232, 168, 96, 1, 231]), "initConfig");
  skills.set(discKey([161, 176, 40, 213, 60, 184, 179, 228]), "updateAdmin");
  skills.set(discKey([16, 11, 242, 97, 55, 197, 142, 249]), "updateRegisterFee");
  skills.set(discKey([198, 212, 171, 109, 144, 215, 174, 89]), "withdrawFees");
  skills.set(discKey([48, 169, 76, 72, 229, 180, 55, 161]), "transferAuthority");
  programs.set(DEFAULT_SKILLS_PROGRAM_ID, skills);

  // ZK ID
  const zk: DiscriminatorMap = new Map();
  zk.set(discKey([211, 124, 67, 15, 211, 194, 178, 240]), "register");
  zk.set(discKey([242, 35, 198, 137, 82, 225, 242, 182]), "deposit");
  zk.set(discKey([183, 18, 70, 156, 148, 109, 161, 34]), "withdraw");
  zk.set(discKey([58, 45, 142, 162, 7, 21, 17, 83]), "transferZkId");
  zk.set(discKey([175, 175, 109, 31, 13, 152, 155, 237]), "initialize");
  zk.set(discKey([208, 127, 21, 1, 194, 190, 196, 70]), "initializeConfig");
  zk.set(discKey([29, 158, 252, 191, 10, 83, 219, 99]), "updateConfig");
  zk.set(discKey([198, 212, 171, 109, 144, 215, 174, 89]), "withdrawFees");
  programs.set(DEFAULT_ZKID_PROGRAM_ID, zk);

  return programs;
}

const anchorDiscs = buildAnchorDiscriminators();

// ─── Instruction decoders ─────────────────────────────────────────

function resolveAccounts(
  ix: MessageCompiledInstruction,
  accountKeys: string[]
): string[] {
  return ix.accountKeyIndexes.map((i) => accountKeys[i] ?? `<index:${i}>`);
}

/**
 * Build a full TransactionInstruction from a compiled ix + account key list,
 * so built-in decoders (SystemInstruction, spl-token decodeInstruction) can consume it.
 */
function toTransactionInstruction(
  ix: MessageCompiledInstruction,
  accountKeys: string[]
): TransactionInstruction {
  const programIdStr = accountKeys[ix.programIdIndex] ?? "11111111111111111111111111111111";
  return new TransactionInstruction({
    programId: new PublicKey(programIdStr),
    keys: ix.accountKeyIndexes.map((i) => ({
      pubkey: new PublicKey(accountKeys[i] ?? "11111111111111111111111111111111"),
      isSigner: false,
      isWritable: false,
    })),
    data: Buffer.from(ix.data),
  });
}

function parseComputeBudget(
  data: Buffer
): { type: string; info: Record<string, unknown> } {
  // ComputeBudget layout is simple and stable; no built-in decoder in web3.js.
  const ixType = data[0];
  if (ixType === 2) {
    return { type: "setComputeUnitLimit", info: { units: data.readUInt32LE(1) } };
  }
  if (ixType === 3) {
    return { type: "setComputeUnitPrice", info: { microLamports: Number(data.readBigUInt64LE(1)) } };
  }
  if (ixType === 1) {
    return { type: "requestHeapFrame", info: { bytes: data.readUInt32LE(1) } };
  }
  if (ixType === 0) {
    return { type: "requestUnits", info: {} };
  }
  return { type: `unknown(${ixType})`, info: {} };
}

function parseSystemProgram(
  txIx: TransactionInstruction
): { type: string; info: Record<string, unknown> } {
  let type: string;
  try {
    type = SystemInstruction.decodeInstructionType(txIx);
  } catch {
    return { type: "unknown", info: {} };
  }

  try {
    switch (type) {
      case "Create": {
        const d = SystemInstruction.decodeCreateAccount(txIx);
        return {
          type: "createAccount",
          info: {
            from: d.fromPubkey.toBase58(),
            newAccount: d.newAccountPubkey.toBase58(),
            lamports: d.lamports,
            space: d.space,
            owner: d.programId.toBase58(),
          },
        };
      }
      case "Transfer": {
        const d = SystemInstruction.decodeTransfer(txIx);
        const lamports = Number(d.lamports);
        return {
          type: "transfer",
          info: {
            from: d.fromPubkey.toBase58(),
            to: d.toPubkey.toBase58(),
            lamports,
            sol: lamports / 1e9,
          },
        };
      }
      case "TransferWithSeed": {
        const d = SystemInstruction.decodeTransferWithSeed(txIx);
        return {
          type: "transferWithSeed",
          info: {
            from: d.fromPubkey.toBase58(),
            to: d.toPubkey.toBase58(),
            lamports: Number(d.lamports),
            seed: d.seed,
          },
        };
      }
      case "Allocate": {
        const d = SystemInstruction.decodeAllocate(txIx);
        return { type: "allocate", info: { account: d.accountPubkey.toBase58(), space: d.space } };
      }
      case "Assign": {
        const d = SystemInstruction.decodeAssign(txIx);
        return {
          type: "assign",
          info: { account: d.accountPubkey.toBase58(), owner: d.programId.toBase58() },
        };
      }
      case "AdvanceNonceAccount": {
        const d = SystemInstruction.decodeNonceAdvance(txIx);
        return {
          type: "advanceNonce",
          info: { nonce: d.noncePubkey.toBase58(), authorized: d.authorizedPubkey.toBase58() },
        };
      }
      case "WithdrawNonceAccount": {
        const d = SystemInstruction.decodeNonceWithdraw(txIx);
        return {
          type: "withdrawNonce",
          info: {
            nonce: d.noncePubkey.toBase58(),
            to: d.toPubkey.toBase58(),
            lamports: Number(d.lamports),
          },
        };
      }
      default:
        return { type: type.charAt(0).toLowerCase() + type.slice(1), info: {} };
    }
  } catch {
    return { type: type.charAt(0).toLowerCase() + type.slice(1), info: {} };
  }
}

function parseSplToken(
  txIx: TransactionInstruction,
  is2022: boolean
): { type: string; info: Record<string, unknown> } {
  const programId = is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
  const program = is2022 ? "Token-2022" : "Token";

  let decoded: any;
  try {
    decoded = decodeSplTokenInstruction(txIx, programId);
  } catch {
    const ixByte = txIx.data[0];
    return { type: `splToken(${ixByte})`, info: { program } };
  }

  const ixKind: number = decoded.data.instruction;
  const name = TokenInstruction[ixKind] ?? "unknown";
  const typeStr = name.charAt(0).toLowerCase() + name.slice(1);
  const info: Record<string, unknown> = { program };

  // `decoded.keys` is an object with named fields — expose them all as base58 strings.
  for (const [key, value] of Object.entries(decoded.keys)) {
    if (value && typeof value === "object" && "pubkey" in (value as object)) {
      info[key] = (value as { pubkey: PublicKey }).pubkey.toBase58();
    }
  }

  // Expose decoded data fields (amount, decimals, etc.)
  for (const [key, value] of Object.entries(decoded.data)) {
    if (key === "instruction") continue;
    if (typeof value === "bigint") info[key] = Number(value);
    else info[key] = value;
  }

  return { type: typeStr, info };
}

function parseAta(
  data: Buffer,
  accounts: string[]
): { type: string; info: Record<string, unknown> } {
  // ATA program: no built-in decoder; layout is trivially [0]=create, [1]=createIdempotent
  const ixType = data.length > 0 ? data[0] : 0;
  return {
    type: ixType === 1 ? "createIdempotent" : "create",
    info: {
      payer: accounts[0],
      ata: accounts[1],
      owner: accounts[2],
      mint: accounts[3],
    },
  };
}

function parseAnchor(
  pid: string,
  data: Buffer,
  accounts: string[]
): { type: string; info: Record<string, unknown> } | null {
  if (data.length < 8) return null;
  const disc = data.subarray(0, 8);
  const key = Buffer.from(disc).toString("hex");
  const discMap = anchorDiscs.get(pid);
  if (!discMap) return null;
  const name = discMap.get(key);
  if (!name) return null;

  const info: Record<string, unknown> = {};

  // Extract common fields for known instructions
  if (pid === DEFAULT_AGENT_REGISTRY_PROGRAM_ID) {
    if (name === "registerAgent" || name === "registerAgentWithReferral") {
      if (accounts[0]) info.authority = accounts[0];
      // agentId is first arg after discriminator: 4-byte string length + string
      try {
        const len = data.readUInt32LE(8);
        if (len > 0 && len < 100) info.agentId = data.subarray(12, 12 + len).toString("utf-8");
      } catch {}
    }
    if (name === "setTwitter") {
      if (accounts[0]) info.authority = accounts[0];
      try {
        const len1 = data.readUInt32LE(8);
        const agentId = data.subarray(12, 12 + len1).toString("utf-8");
        const off2 = 12 + len1;
        const len2 = data.readUInt32LE(off2);
        const handle = data.subarray(off2 + 4, off2 + 4 + len2).toString("utf-8");
        info.agentId = agentId;
        info.handle = handle;
      } catch {}
    }
    if (name === "submitTweet") {
      if (accounts[0]) info.authority = accounts[0];
      try {
        const len1 = data.readUInt32LE(8);
        info.agentId = data.subarray(12, 12 + len1).toString("utf-8");
      } catch {}
    }
  }

  if (pid === DEFAULT_QUEST_PROGRAM_ID) {
    if (name === "submitAnswer") {
      if (accounts[0]) info.user = accounts[0];
    }
    if (name === "stake" || name === "unstake") {
      if (accounts[0]) info.user = accounts[0];
    }
    if (name === "adjustFreeStake") {
      if (accounts[0]) info.authority = accounts[0];
    }
    if (name === "claimAirdrop") {
      if (accounts[0]) info.user = accounts[0];
    }
    if (name === "createQuestion") {
      if (accounts[0]) info.authority = accounts[0];
    }
  }

  if (pid === DEFAULT_ZKID_PROGRAM_ID) {
    if (name === "register") {
      if (accounts[0]) info.authority = accounts[0];
    }
    if (name === "deposit" || name === "withdraw" || name === "transferZkId") {
      if (accounts[0]) info.user = accounts[0];
    }
  }

  return { type: name, info };
}

function parseBridgeWarpRoute(
  pid: string,
  data: Buffer,
  accounts: string[]
): { type: string; info: Record<string, unknown> } | null {
  // TransferRemote: 9 bytes prefix (all 0x01) + 4 bytes domain + 32 bytes recipient + 32 bytes amount
  if (data.length < 77) return null;
  // Check prefix: first 9 bytes all 0x01
  for (let i = 0; i < 9; i++) {
    if (data[i] !== 0x01) return null;
  }

  const destinationDomain = data.readUInt32LE(9);
  const recipient = new PublicKey(data.subarray(13, 45)).toBase58();
  const amount = Number(data.readBigUInt64LE(45));

  // Find token symbol from program ID
  let tokenSymbol = "unknown";
  let mode = "";
  for (const [sym, cfg] of Object.entries(BRIDGE_TOKENS)) {
    if (cfg.solana.warpProgram.toBase58() === pid) {
      tokenSymbol = sym;
      mode = cfg.solana.mode;
      break;
    }
    if (cfg.nara.warpProgram.toBase58() === pid) {
      tokenSymbol = sym;
      mode = cfg.nara.mode;
      break;
    }
  }

  return {
    type: "transferRemote",
    info: {
      token: tokenSymbol,
      mode,
      destinationDomain,
      recipient,
      amount,
      sender: accounts[6],
    },
  };
}

function parseMemo(
  data: Buffer
): { type: string; info: Record<string, unknown> } {
  return { type: "memo", info: { text: data.toString("utf-8") } };
}

// ─── Main decoder ─────────────────────────────────────────────────

function decodeInstruction(
  ix: MessageCompiledInstruction,
  index: number,
  accountKeys: string[]
): ParsedInstruction {
  const pid = accountKeys[ix.programIdIndex] ?? "<unknown>";
  const accounts = resolveAccounts(ix, accountKeys);
  const data = Buffer.from(ix.data);
  const rawData = Buffer.from(ix.data).toString("base64");

  let type = "unknown";
  let info: Record<string, unknown> = {};

  if (pid === COMPUTE_BUDGET) {
    const r = parseComputeBudget(data);
    type = r.type;
    info = r.info;
  } else if (pid === SYSTEM_PROGRAM) {
    const r = parseSystemProgram(toTransactionInstruction(ix, accountKeys));
    type = r.type;
    info = r.info;
  } else if (pid === TOKEN_PROGRAM || pid === TOKEN_2022) {
    const r = parseSplToken(
      toTransactionInstruction(ix, accountKeys),
      pid === TOKEN_2022
    );
    type = r.type;
    info = r.info;
  } else if (pid === ATA_PROGRAM) {
    const r = parseAta(data, accounts);
    type = r.type;
    info = r.info;
  } else if (pid === MEMO_PROGRAM || pid === MEMO_PROGRAM_V1) {
    const r = parseMemo(data);
    type = r.type;
    info = r.info;
  } else if (anchorDiscs.has(pid)) {
    const r = parseAnchor(pid, data, accounts);
    if (r) {
      type = r.type;
      info = r.info;
    }
  } else {
    // Try bridge warp route
    const r = parseBridgeWarpRoute(pid, data, accounts);
    if (r) {
      type = r.type;
      info = r.info;
    }
  }

  return {
    index,
    programName: getProgramName(pid),
    programId: pid,
    type,
    info,
    accounts,
    rawData,
  };
}

// ─── Public API ───────────────────────────────────────────────────

/**
 * Fetch a transaction by signature and parse it.
 *
 * @example
 * ```ts
 * const parsed = await parseTxFromHash(connection, "5abc...");
 * console.log(formatParsedTx(parsed));
 * ```
 */
export async function parseTxFromHash(
  connection: Connection,
  signature: string
): Promise<ParsedTransaction> {
  const tx = await connection.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });
  if (!tx) throw new Error(`Transaction not found: ${signature}`);
  return parseTxResponse(tx);
}

/**
 * Fetch and parse multiple transactions in a single batch RPC request.
 *
 * Uses `connection.getTransactions(sigs)` which sends one JSON-RPC batch
 * under the hood (via `_rpcBatchRequest`), so N signatures → 1 HTTP call.
 *
 * Returns a result array aligned with the input: each entry is either a
 * `ParsedTransaction` or `null` if the RPC could not find that signature.
 * This preserves index mapping so the caller can pair results with inputs.
 *
 * @example
 * ```ts
 * const results = await parseTxsFromHashes(connection, [sig1, sig2, sig3]);
 * results.forEach((r, i) => {
 *   if (!r) console.log(`${sigs[i]} not found`);
 *   else console.log(formatParsedTx(r));
 * });
 * ```
 */
export async function parseTxsFromHashes(
  connection: Connection,
  signatures: string[]
): Promise<(ParsedTransaction | null)[]> {
  if (signatures.length === 0) return [];

  const txs = await connection.getTransactions(signatures, {
    maxSupportedTransactionVersion: 0,
    commitment: "confirmed",
  });

  return txs.map((tx) => (tx ? parseTxResponse(tx) : null));
}

/**
 * Parse a VersionedTransactionResponse (from getTransaction) synchronously.
 *
 * @example
 * ```ts
 * const txResp = await connection.getTransaction(sig, { maxSupportedTransactionVersion: 0 });
 * const parsed = parseTxResponse(txResp);
 * ```
 */
export function parseTxResponse(tx: VersionedTransactionResponse): ParsedTransaction {
  const sig = tx.transaction.signatures[0] ?? "";

  // Collect all account keys (static + loaded via ALT)
  const msg = tx.transaction.message;
  const staticKeys = msg.getAccountKeys({
    accountKeysFromLookups: tx.meta?.loadedAddresses,
  });
  const accountKeys: string[] = [];
  for (let i = 0; i < staticKeys.length; i++) {
    accountKeys.push(staticKeys.get(i)!.toBase58());
  }

  // Parse each top-level instruction
  const compiled = msg.compiledInstructions;
  const instructions: ParsedInstruction[] = compiled.map((ix, i) =>
    decodeInstruction(ix, i, accountKeys)
  );

  // Attach inner instructions (CPI calls) under their parent ix.
  // RPC response: meta.innerInstructions is [{ index, instructions: [...] }, ...]
  // where `index` points to the top-level ix that made the CPI calls.
  if (tx.meta?.innerInstructions) {
    for (const inner of tx.meta.innerInstructions) {
      const parent = instructions[inner.index];
      if (!parent) continue;
      parent.innerInstructions = inner.instructions.map((innerIx, j) => {
        const dataBuf: Buffer =
          typeof innerIx.data === "string"
            ? Buffer.from(decodeBase58(innerIx.data))
            : Buffer.from(innerIx.data);
        const innerCompiled: MessageCompiledInstruction = {
          programIdIndex: innerIx.programIdIndex,
          accountKeyIndexes: innerIx.accounts,
          data: dataBuf,
        };
        return decodeInstruction(innerCompiled, j, accountKeys);
      });
    }
  }

  return {
    signature: sig,
    slot: tx.slot,
    blockTime: tx.blockTime ?? null,
    success: tx.meta?.err === null,
    error: tx.meta?.err ? JSON.stringify(tx.meta.err) : null,
    fee: tx.meta?.fee ?? 0,
    instructions,
    logs: tx.meta?.logMessages ?? [],
  };
}

function decodeBase58(str: string): Uint8Array {
  const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  const BASE = 58;
  const bytes: number[] = [0];
  for (const char of str) {
    let carry = ALPHABET.indexOf(char);
    if (carry < 0) throw new Error(`Invalid base58 character: ${char}`);
    for (let j = 0; j < bytes.length; j++) {
      carry += bytes[j]! * BASE;
      bytes[j] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }
  // Leading zeros
  for (const char of str) {
    if (char !== "1") break;
    bytes.push(0);
  }
  return new Uint8Array(bytes.reverse());
}

/**
 * Pretty-print a parsed transaction to a human-readable string.
 */
export function formatParsedTx(parsed: ParsedTransaction): string {
  const lines: string[] = [];
  const status = parsed.success ? "SUCCESS" : `FAILED: ${parsed.error}`;
  const time = parsed.blockTime
    ? new Date(parsed.blockTime * 1000).toISOString()
    : "unknown";

  lines.push(`Tx: ${parsed.signature}`);
  lines.push(`Status: ${status}`);
  lines.push(`Slot: ${parsed.slot} | Time: ${time} | Fee: ${parsed.fee} lamports`);
  lines.push(`Instructions (${parsed.instructions.length}):`);
  lines.push("");

  for (const ix of parsed.instructions) {
    formatIxLines(ix, 0, lines);
  }

  return lines.join("\n");
}

function formatIxLines(ix: ParsedInstruction, depth: number, lines: string[]): void {
  const indent = "  ".repeat(depth + 1);
  const prefix = depth === 0 ? `#${ix.index}` : `↳ ${ix.index}`;
  const infoStr = Object.entries(ix.info)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  lines.push(`${indent}${prefix} [${ix.programName}] ${ix.type}`);
  if (infoStr) lines.push(`${indent}    ${infoStr}`);
  if (ix.innerInstructions && ix.innerInstructions.length > 0) {
    for (const inner of ix.innerInstructions) {
      formatIxLines(inner, depth + 1, lines);
    }
  }
}
