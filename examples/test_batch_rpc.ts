/**
 * Smoke test for all RPC-optimized interfaces.
 *
 * Covers:
 *   - getQuestInfo     (quest.ts)   — 1 RPC for Pool + GameConfig
 *   - getStakeInfo     (quest.ts)   — 1 RPC for stakeRecord + wSOL balance
 *   - getAgentInfo     (agent_registry.ts) — 1 RPC for record + bio + metadata
 *   - getSkillInfo     (skills.ts)  — 1 RPC for skill + desc + metadata
 *   - scanClaimableDeposits (zkid.ts) — 1 RPC for zkId + inbox, 1 RPC for all nullifiers
 *   - queryMessageStatus (bridge.ts) — 1 RPC (getTransactions batch) for mailbox txs
 *
 * Run: tsx examples/test_batch_rpc.ts
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  getQuestInfo,
  getStakeInfo,
  getAgentInfo,
  getSkillInfo,
  scanClaimableDeposits,
  queryMessageStatus,
} from "../index";

const NARA_RPC = process.env.NARA_RPC || "https://mainnet-api.nara.build/";

// Track HTTP request counts by monkey-patching both _rpcRequest and _rpcBatchRequest
function instrument(conn: Connection): { count: number; methods: Map<string, number>; reset: () => void } {
  const state = { count: 0, methods: new Map<string, number>() };
  const anyConn = conn as any;

  const origSingle = anyConn._rpcRequest.bind(anyConn);
  anyConn._rpcRequest = async (methodName: string, args: unknown[]) => {
    state.count++;
    state.methods.set(methodName, (state.methods.get(methodName) ?? 0) + 1);
    return origSingle(methodName, args);
  };

  const origBatch = anyConn._rpcBatchRequest.bind(anyConn);
  anyConn._rpcBatchRequest = async (requests: { methodName: string; args: unknown[] }[]) => {
    state.count++; // counts as 1 HTTP request regardless of batch size
    const label = `batch(${requests.map((r) => r.methodName).join("+")})[n=${requests.length}]`;
    state.methods.set(label, (state.methods.get(label) ?? 0) + 1);
    return origBatch(requests);
  };

  return {
    get count() { return state.count; },
    get methods() { return state.methods; },
    reset: () => {
      state.count = 0;
      state.methods.clear();
    },
  };
}

function printCounter(label: string, counter: { count: number; methods: Map<string, number> }) {
  const methods = [...counter.methods.entries()]
    .map(([m, n]) => `${m}=${n}`)
    .join(", ");
  console.log(`  RPC calls: ${counter.count}  [${methods}]`);
}

async function main() {
  const conn = new Connection(NARA_RPC, "confirmed");
  const counter = instrument(conn);

  console.log("=== RPC Optimization Smoke Test ===\n");
  console.log(`RPC: ${NARA_RPC}\n`);

  // ── 1. getQuestInfo ──
  try {
    counter.reset();
    const info = await getQuestInfo(conn);
    console.log("[1] getQuestInfo ✓");
    console.log(`    active=${info.active} round=${info.round} question="${(info.question ?? "").slice(0, 40)}..."`);
    console.log(`    stakeHigh=${info.stakeHigh} stakeLow=${info.stakeLow} effectiveStake=${info.effectiveStakeRequirement.toFixed(6)}`);
    printCounter("getQuestInfo", counter);
    console.log();
  } catch (e) {
    console.log("[1] getQuestInfo ✗", (e as Error).message);
    console.log();
  }

  // ── 2. getStakeInfo ──
  try {
    counter.reset();
    // Use the test wallet from bridge tests (FCgy8JSfZUEW11zpsMeWD6v8xJmf7LTHXFkCooaGF9Qz)
    const user = new PublicKey("FCgy8JSfZUEW11zpsMeWD6v8xJmf7LTHXFkCooaGF9Qz");
    const stake = await getStakeInfo(conn, user);
    console.log("[2] getStakeInfo ✓");
    if (stake) {
      console.log(`    amount=${stake.amount} NARA stakeRound=${stake.stakeRound} freeCredits=${stake.freeCredits}`);
    } else {
      console.log(`    no stake record for ${user.toBase58()}`);
    }
    printCounter("getStakeInfo", counter);
    console.log();
  } catch (e) {
    console.log("[2] getStakeInfo ✗", (e as Error).message);
    console.log();
  }

  // ── 3. getAgentInfo ──
  try {
    counter.reset();
    // Try a known agent id if any; fall back to expected error
    const agentId = process.env.TEST_AGENT_ID || "test-agent";
    const info = await getAgentInfo(conn, agentId);
    console.log("[3] getAgentInfo ✓");
    console.log(`    agentId=${agentId}`);
    console.log(`    authority=${info.record.authority.toBase58()}`);
    console.log(`    bio=${info.bio?.slice(0, 40) ?? "(none)"}`);
    console.log(`    metadata=${info.metadata ? "present" : "(none)"}`);
    printCounter("getAgentInfo", counter);
    console.log();
  } catch (e) {
    console.log("[3] getAgentInfo ✗", (e as Error).message);
    printCounter("getAgentInfo", counter);
    console.log();
  }

  // ── 4. getSkillInfo ──
  try {
    counter.reset();
    const skillName = process.env.TEST_SKILL_NAME || "test-skill";
    const info = await getSkillInfo(conn, skillName);
    console.log("[4] getSkillInfo ✓");
    console.log(`    skill=${skillName}`);
    console.log(`    authority=${info.record.authority.toBase58()}`);
    console.log(`    description=${info.description?.slice(0, 40) ?? "(none)"}`);
    console.log(`    metadata=${info.metadata ? "present" : "(none)"}`);
    printCounter("getSkillInfo", counter);
    console.log();
  } catch (e) {
    console.log("[4] getSkillInfo ✗", (e as Error).message);
    printCounter("getSkillInfo", counter);
    console.log();
  }

  // ── 5. scanClaimableDeposits ──
  // Exercise the batch path with a non-existent zkId; expected to throw
  // "ZK ID account not found" after exactly 1 RPC call.
  try {
    counter.reset();
    const zkName = process.env.TEST_ZKID_NAME || "__nonexistent_zkid_for_test__";
    const idSecret = 1n;
    const deposits = await scanClaimableDeposits(conn, zkName, idSecret);
    console.log("[5] scanClaimableDeposits ✓");
    console.log(`    zkName=${zkName}`);
    console.log(`    claimable deposits: ${deposits.length}`);
    printCounter("scanClaimableDeposits", counter);
    console.log();
  } catch (e) {
    console.log("[5] scanClaimableDeposits — expected error path:", (e as Error).message);
    printCounter("scanClaimableDeposits", counter);
    console.log();
  }

  // ── 6. queryMessageStatus ──
  // Find a real recently-processed message from the Nara Mailbox so we can
  // verify both the getSignaturesForAddress call AND the batched getTransactions.
  try {
    counter.reset();
    // Use a larger limit so the message is guaranteed to be found
    const messageId = process.env.TEST_MESSAGE_ID ||
      "0x1a9472a708273fd18030ddea6dd0b825bcfe8de9889cc10bc77ca60e449a6fae";
    const status = await queryMessageStatus(conn, messageId, "nara", { limit: 50 });
    console.log("[6] queryMessageStatus ✓");
    console.log(`    messageId=${messageId}`);
    console.log(`    delivered=${status.delivered}`);
    if (status.deliverySignature) console.log(`    deliverySig=${status.deliverySignature}`);
    else console.log(`    (not found in last 50 Mailbox txs; still validates batch path)`);
    printCounter("queryMessageStatus", counter);
    console.log();
  } catch (e) {
    console.log("[6] queryMessageStatus ✗", (e as Error).message);
    printCounter("queryMessageStatus", counter);
    console.log();
  }

  console.log("=== Done ===");
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
