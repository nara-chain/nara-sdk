/**
 * npm test — smoke test for all read-only SDK interfaces.
 *
 * Runs against mainnet RPCs. No private keys needed.
 * Fixed test data:
 *   - agentId = "nara123"
 *   - known wallet: FCgy8JSfZUEW11zpsMeWD6v8xJmf7LTHXFkCooaGF9Qz (bridge/quest test wallet)
 *   - recent bridge tx for parser tests
 *
 * Run: npm test
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  // Quest
  getQuestInfo,
  getQuestConfig,
  getStakeInfo,
  hasAnswered,
  // Agent Registry
  getAgentRecord,
  getAgentInfo,
  getAgentTwitter,
  getTweetVerify,
  getAgentRegistryConfig,
  getSkillsConfig,
  getZkIdConfig,
  getPendingTwitterVerifications,
  getPendingTweetVerifications,
  // Skills
  getSkillRecord,
  getSkillInfo,
  getSkillContent,
  // ZK ID
  getZkIdInfo,
  // Bridge
  extractMessageId,
  queryMessageStatus,
  queryMessageSignatures,
  // TX parser
  parseTxFromHash,
  parseTxResponse,
  formatParsedTx,
  Keypair,
} from "../index";

// ─── Fixtures ─────────────────────────────────────────────────────

const NARA_RPC = process.env.NARA_RPC || "https://mainnet-api.nara.build/";
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

const FIXED_AGENT_ID = "nara123";
const TEST_WALLET = new PublicKey("FCgy8JSfZUEW11zpsMeWD6v8xJmf7LTHXFkCooaGF9Qz");
const TEST_SKILL_NAME = process.env.TEST_SKILL_NAME || "nara";
const TEST_ZKID_NAME = process.env.TEST_ZKID_NAME || "nara123";

// A known Solana bridge tx for parser tests
const BRIDGE_TX_SOLANA =
  "SRgY4DG5DR9xC7G74Acz4KeTGYnswDMqafji5CVTJT7e5nqfHgccqLpNodszGfKsV3JbZH4UT9skjyNXBFeWCdv";
const BRIDGE_MESSAGE_ID =
  "0x1a9472a708273fd18030ddea6dd0b825bcfe8de9889cc10bc77ca60e449a6fae";

// ─── Test harness ─────────────────────────────────────────────────

type TestFn = () => Promise<void>;
const results: { name: string; ok: boolean; ms: number; detail?: string }[] = [];

async function run(name: string, fn: TestFn): Promise<void> {
  const start = Date.now();
  try {
    await fn();
    const ms = Date.now() - start;
    results.push({ name, ok: true, ms });
    console.log(`  ✓ ${name} (${ms}ms)`);
  } catch (e) {
    const ms = Date.now() - start;
    const detail = (e as Error).message;
    results.push({ name, ok: false, ms, detail });
    console.log(`  ✗ ${name} (${ms}ms) — ${detail}`);
  }
}

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`assertion failed: ${msg}`);
}

// ─── Tests ────────────────────────────────────────────────────────

async function main() {
  const nara = new Connection(NARA_RPC, "confirmed");
  const sol = new Connection(SOLANA_RPC, "confirmed");

  console.log("=== nara-sdk read API tests ===");
  console.log(`Nara RPC:   ${NARA_RPC}`);
  console.log(`Solana RPC: ${SOLANA_RPC}`);
  console.log(`agentId:    ${FIXED_AGENT_ID}`);
  console.log();

  // ── Quest ──
  console.log("[quest]");
  await run("getQuestInfo", async () => {
    const info = await getQuestInfo(nara);
    assert(typeof info.round === "string", "round is string");
    assert(typeof info.stakeHigh === "number", "stakeHigh is number");
    assert(info.effectiveStakeRequirement >= info.stakeLow, "effective ≥ low");
    assert(info.effectiveStakeRequirement <= info.stakeHigh, "effective ≤ high");
  });

  await run("getQuestConfig", async () => {
    const cfg = await getQuestConfig(nara);
    assert(cfg.authority instanceof PublicKey, "authority is PublicKey");
    assert(typeof cfg.minRewardCount === "number", "minRewardCount is number");
  });

  await run("getStakeInfo", async () => {
    // Returns null for wallet with no stake — both paths valid
    const stake = await getStakeInfo(nara, TEST_WALLET);
    if (stake !== null) {
      assert(typeof stake.amount === "number", "amount is number");
      assert(typeof stake.stakeRound === "number", "stakeRound is number");
    }
  });

  await run("hasAnswered", async () => {
    const wallet = Keypair.generate();
    const answered = await hasAnswered(nara, wallet);
    assert(typeof answered === "boolean", "returns boolean");
  });

  console.log();

  // ── Agent Registry ──
  console.log("[agent_registry]");

  await run(`getAgentRegistryConfig`, async () => {
    const cfg = await getAgentRegistryConfig(nara);
    assert(cfg.admin instanceof PublicKey, "admin is PublicKey");
    assert(typeof cfg.registerFee === "number", "registerFee is number");
  });

  await run(`getAgentRecord(${FIXED_AGENT_ID})`, async () => {
    try {
      const record = await getAgentRecord(nara, FIXED_AGENT_ID);
      assert(record.authority instanceof PublicKey, "authority is PublicKey");
      assert(record.agentId === FIXED_AGENT_ID, `agentId matches`);
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("not found")) throw e;
      console.log(`    (agent "${FIXED_AGENT_ID}" not found — skipping)`);
    }
  });

  await run(`getAgentInfo(${FIXED_AGENT_ID})`, async () => {
    try {
      const info = await getAgentInfo(nara, FIXED_AGENT_ID);
      assert(info.record.agentId === FIXED_AGENT_ID, "agentId matches");
      // bio / metadata may be null — that's OK
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("not found")) throw e;
      console.log(`    (agent "${FIXED_AGENT_ID}" not found — skipping)`);
    }
  });

  await run(`getAgentTwitter(${FIXED_AGENT_ID})`, async () => {
    const info = await getAgentTwitter(nara, FIXED_AGENT_ID);
    // Returns null if no twitter set — both paths valid
    if (info !== null) {
      assert(info.agentId === FIXED_AGENT_ID, "agentId matches");
    }
  });

  await run(`getTweetVerify(${FIXED_AGENT_ID})`, async () => {
    const info = await getTweetVerify(nara, FIXED_AGENT_ID);
    if (info !== null) {
      assert(info.agentId === FIXED_AGENT_ID, "agentId matches");
    }
  });

  await run("getPendingTwitterVerifications", async () => {
    const list = await getPendingTwitterVerifications(nara);
    assert(Array.isArray(list), "returns array");
  });

  await run("getPendingTweetVerifications", async () => {
    const list = await getPendingTweetVerifications(nara);
    assert(Array.isArray(list), "returns array");
  });

  console.log();

  // ── Skills ──
  console.log("[skills]");
  await run(`getSkillRecord(${TEST_SKILL_NAME})`, async () => {
    try {
      const record = await getSkillRecord(nara, TEST_SKILL_NAME);
      assert(record.authority instanceof PublicKey, "authority is PublicKey");
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("not found") && !msg.includes("Account does not exist")) throw e;
      console.log(`    (skill "${TEST_SKILL_NAME}" not found — skipping)`);
    }
  });

  await run(`getSkillInfo(${TEST_SKILL_NAME})`, async () => {
    try {
      const info = await getSkillInfo(nara, TEST_SKILL_NAME);
      assert(info.record.authority instanceof PublicKey, "authority is PublicKey");
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("not found")) throw e;
      console.log(`    (skill "${TEST_SKILL_NAME}" not found — skipping)`);
    }
  });

  await run(`getSkillContent(${TEST_SKILL_NAME})`, async () => {
    try {
      const content = await getSkillContent(nara, TEST_SKILL_NAME);
      // null if no content — OK
      if (content !== null) {
        assert(content instanceof Buffer, "content is Buffer");
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("not found")) throw e;
      console.log(`    (skill "${TEST_SKILL_NAME}" not found — skipping)`);
    }
  });

  await run("getSkillsConfig", async () => {
    const cfg = await getSkillsConfig(nara);
    assert(cfg.admin instanceof PublicKey, "admin is PublicKey");
  });

  console.log();

  // ── ZK ID ──
  console.log("[zkid]");
  await run("getZkIdConfig", async () => {
    const cfg = await getZkIdConfig(nara);
    assert(cfg.admin instanceof PublicKey, "admin is PublicKey");
  });

  await run(`getZkIdInfo(${TEST_ZKID_NAME})`, async () => {
    const info = await getZkIdInfo(nara, TEST_ZKID_NAME);
    // null if not registered — OK
    if (info !== null) {
      assert(Array.isArray(info.nameHash), "nameHash is array");
      assert(typeof info.depositCount === "number", "depositCount is number");
    }
  });

  console.log();

  // ── Bridge / Hyperlane ──
  console.log("[bridge]");
  await run("extractMessageId (Solana bridge tx)", async () => {
    const msgId = await extractMessageId(sol, BRIDGE_TX_SOLANA);
    if (msgId !== null) {
      assert(msgId.startsWith("0x"), "message ID hex");
      assert(msgId.length === 66, "32-byte hex");
    }
  });

  await run("queryMessageStatus (Nara delivery)", async () => {
    const status = await queryMessageStatus(nara, BRIDGE_MESSAGE_ID, "nara", { limit: 20 });
    assert(typeof status.delivered === "boolean", "delivered is boolean");
  });

  await run("queryMessageSignatures (Solana validators)", async () => {
    const status = await queryMessageSignatures(BRIDGE_MESSAGE_ID, "solana");
    assert(typeof status.fullySigned === "boolean", "fullySigned is boolean");
    assert(status.totalValidators === 3, "3 validators total");
    assert(Array.isArray(status.validators), "validators is array");
  });

  console.log();

  // ── TX Parser ──
  console.log("[tx_parser]");
  await run("parseTxFromHash (Solana bridge tx)", async () => {
    const parsed = await parseTxFromHash(sol, BRIDGE_TX_SOLANA);
    assert(parsed.success === true, "tx succeeded");
    assert(parsed.instructions.length > 0, "has instructions");
    // Verify we correctly decode the bridge TransferRemote ix
    const bridgeIx = parsed.instructions.find((ix) => ix.type === "transferRemote");
    assert(bridgeIx !== undefined, "found transferRemote ix");
    assert(bridgeIx?.info.token === "USDC", "bridge token is USDC");
  });

  await run("parseTxResponse (sync, Solana bridge tx)", async () => {
    const txResp = await sol.getTransaction(BRIDGE_TX_SOLANA, {
      maxSupportedTransactionVersion: 0,
    });
    assert(txResp !== null, "tx found");
    const parsed = parseTxResponse(txResp!);
    assert(parsed.signature === BRIDGE_TX_SOLANA, "signature matches");
    // Smoke: formatting works
    const txt = formatParsedTx(parsed);
    assert(txt.includes("SUCCESS"), "format includes SUCCESS");
  });

  console.log();

  // ── Summary ──
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const totalMs = results.reduce((s, r) => s + r.ms, 0);

  console.log("─".repeat(60));
  console.log(`Total: ${results.length}   Passed: ${passed}   Failed: ${failed}   Time: ${totalMs}ms`);

  if (failed > 0) {
    console.log();
    console.log("Failures:");
    for (const r of results.filter((r) => !r.ok)) {
      console.log(`  ✗ ${r.name}`);
      console.log(`      ${r.detail}`);
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
