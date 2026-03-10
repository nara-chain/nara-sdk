/**
 * Integration test: Quest + Referral
 *
 * This test:
 * 1. Generates a random wallet and transfers 2 NARA to it
 * 2. Registers an agent for the main wallet
 * 3. Registers a referral agent for the new wallet
 * 4. Fetches the current quest and answers it with referral
 * 5. Reads the transaction and verifies the ActivityLogged event
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 * - An active quest round with a known answer
 *
 * Run: tsx examples/quest_referral.ts
 */

import {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  registerAgent,
  setReferral,
  getAgentRecord,
  getAgentRegistryConfig,
  Keypair,
  PublicKey,
} from "../index";
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import type { NaraAgentRegistry } from "../src/idls/nara_agent_registry";
import naraAgentRegistryIdl from "../src/idls/nara_agent_registry.json";
import { DEFAULT_AGENT_REGISTRY_PROGRAM_ID } from "../src/constants";
import { getAltAddress } from "../src/tx";

const TRANSFER_AMOUNT = 2 * LAMPORTS_PER_SOL;

function loadWallet(): Keypair {
  const pk = process.env.PRIVATE_KEY;
  if (!pk) throw new Error("PRIVATE_KEY environment variable is required");
  return pk.startsWith("[")
    ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(pk)))
    : Keypair.fromSecretKey(bs58.decode(pk));
}

function createRegistryProgram(connection: Connection): Program<NaraAgentRegistry> {
  const pid = DEFAULT_AGENT_REGISTRY_PROGRAM_ID;
  const idl = { ...naraAgentRegistryIdl, address: pid };
  const provider = new AnchorProvider(
    connection,
    new Wallet(Keypair.generate()),
    { commitment: "confirmed" }
  );
  return new Program<NaraAgentRegistry>(idl as any, provider);
}

/** Parse ActivityLogged events from transaction logs using Anchor event CPI decoding. */
function parseActivityLoggedEvents(
  program: Program<NaraAgentRegistry>,
  logs: string[]
): any[] {
  const parser = new anchor.EventParser(program.programId, program.coder);
  const events: any[] = [];
  for (const event of parser.parseLogs(logs)) {
    if (event.name === "activityLogged") {
      events.push(event.data);
    }
  }
  return events;
}

async function main() {
  const mainWallet = loadWallet();
  const rpcUrl = process.env.RPC_URL || "https://mainnet-api.nara.build/";
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("Main wallet:", mainWallet.publicKey.toBase58());
  const altAddr = getAltAddress();
  if (altAddr) {
    console.log(`ALT enabled: ${altAddr}`);
  } else {
    console.log("ALT: disabled (using legacy transactions)");
  }

  // ── 1. Generate random wallet and fund it ──────────────────────
  console.log("\n--- Generating referral wallet ---");
  const referralWallet = Keypair.generate();
  console.log("Referral wallet:", referralWallet.publicKey.toBase58());

  console.log(`Transferring ${TRANSFER_AMOUNT / LAMPORTS_PER_SOL} NARA...`);
  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: mainWallet.publicKey,
      toPubkey: referralWallet.publicKey,
      lamports: TRANSFER_AMOUNT,
    })
  );
  transferTx.feePayer = mainWallet.publicKey;
  transferTx.recentBlockhash = (
    await connection.getLatestBlockhash("confirmed")
  ).blockhash;
  transferTx.sign(mainWallet);
  const transferSig = await connection.sendRawTransaction(
    transferTx.serialize()
  );
  await connection.confirmTransaction(transferSig, "confirmed");
  console.log("Transfer tx:", transferSig);

  // ── 2. Register main agent ─────────────────────────────────────
  const suffix = Math.random().toString(16).slice(2, 8);
  const mainAgentId = `test-main-${suffix}`;
  console.log(`\n--- Registering main agent "${mainAgentId}" ---`);
  const { signature: mainRegSig } = await registerAgent(
    connection,
    mainWallet,
    mainAgentId
  );
  console.log("Registered, tx:", mainRegSig);

  // ── 3. Register referral agent ─────────────────────────────────
  const referralAgentId = `test-ref-${suffix}`;
  console.log(`\n--- Registering referral agent "${referralAgentId}" ---`);
  const { signature: refRegSig } = await registerAgent(
    connection,
    referralWallet,
    referralAgentId
  );
  console.log("Registered, tx:", refRegSig);

  // ── 4. Set referral relationship ────────────────────────────────
  console.log(`\n--- Setting referral: ${mainAgentId} -> ${referralAgentId} ---`);
  const referralSig = await setReferral(connection, mainWallet, mainAgentId, referralAgentId);
  console.log("Referral set, tx:", referralSig);

  // ── 5. Query points config ──────────────────────────────────────
  console.log("\n--- Points config ---");
  const config = await getAgentRegistryConfig(connection);
  console.log(`  Points per activity (self): ${config.pointsSelf}`);
  console.log(`  Points per referral: ${config.pointsReferral}`);
  console.log(`  Referral register fee: ${config.referralRegisterFee}`);
  console.log(`  Referral fee share: ${config.referralFeeShare}`);
  console.log(`  Referral register points: ${config.referralRegisterPoints}`);

  // ── 5. Fetch quest and answer with referral ────────────────────
  console.log("\n--- Fetching quest ---");
  const quest = await getQuestInfo(connection, mainWallet);

  if (!quest.active) {
    console.log("No active quest. Exiting.");
    return;
  }

  console.log(`Question: ${quest.question}`);
  console.log(`Round: #${quest.round}`);
  console.log(`Remaining slots: ${quest.remainingSlots}`);

  if (quest.expired) {
    console.log("Quest expired. Exiting.");
    return;
  }

  const alreadyAnswered = await hasAnswered(connection, mainWallet);
  if (alreadyAnswered) {
    console.log("Already answered this round. Exiting.");
    return;
  }

  // Answer from env or try to auto-solve from test-questions.json
  let answer = process.env.QUEST_ANSWER;
  if (!answer) {
    try {
      const { readFileSync } = await import("fs");
      const { dirname: d, join: j } = await import("path");
      const { fileURLToPath: f } = await import("url");
      const dir = d(f(import.meta.url));
      const questions = JSON.parse(
        readFileSync(j(dir, "../.assets/test-questions.json"), "utf-8")
      );
      const match = questions.find(
        (q: any) => q.text === quest.question
      );
      if (match) {
        answer = match.answer;
        console.log(`Auto-solved answer: "${answer}"`);
      }
    } catch {
      // ignore
    }
  }

  if (!answer) {
    console.log(
      "Set QUEST_ANSWER env var or ensure test-questions.json has the answer. Exiting."
    );
    return;
  }

  console.log(`\n--- Generating ZK proof for answer: "${answer}" ---`);
  const proof = await generateProof(
    answer,
    quest.answerHash,
    mainWallet.publicKey,
    quest.round
  );
  console.log("Proof generated");

  console.log("\n--- Submitting answer with referral activity log ---");
  const result = await submitAnswer(
    connection,
    mainWallet,
    proof.solana,
    mainAgentId,
    "integration-test",
    { stake: "auto" }, // auto-stake if needed
    {
      agentId: mainAgentId,
      model: "integration-test",
      activity: "quest_answer",
      log: `Answered quest round ${quest.round}`,
      referralAgentId,
    }
  );
  console.log("Submit tx:", result.signature);

  // ── 5. Read transaction and verify ActivityLogged event ────────
  console.log("\n--- Verifying transaction events ---");

  // Wait for tx finalization
  await new Promise((r) => setTimeout(r, 3000));

  let txInfo: any = null;
  for (let i = 0; i < 10; i++) {
    txInfo = await connection.getTransaction(result.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (txInfo) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!txInfo) {
    console.error("FAIL: Could not fetch transaction");
    process.exit(1);
  }

  const logs: string[] = txInfo.meta?.logMessages ?? [];
  console.log(`Transaction logs (${logs.length} lines)`);

  // Check for errors
  if (txInfo.meta?.err) {
    console.error("FAIL: Transaction has error:", txInfo.meta.err);
    process.exit(1);
  }

  // Parse ActivityLogged events
  const program = createRegistryProgram(connection);
  const events = parseActivityLoggedEvents(program, logs);

  if (events.length === 0) {
    console.error("FAIL: No ActivityLogged events found");
    process.exit(1);
  }

  console.log(`\nFound ${events.length} ActivityLogged event(s):`);
  for (const event of events) {
    console.log("  agentId:", event.agentId);
    console.log("  authority:", event.authority.toBase58());
    console.log("  model:", event.model);
    console.log("  activity:", event.activity);
    console.log("  log:", event.log);
    console.log("  referralId:", event.referralId);
    console.log("  pointsEarned:", event.pointsEarned?.toString());
    console.log(
      "  referralPointsEarned:",
      event.referralPointsEarned?.toString()
    );
    console.log("  timestamp:", event.timestamp?.toString());
  }

  // ── 6. Verify event fields ─────────────────────────────────────
  console.log("\n--- Verifying event fields ---");
  const evt = events[0];
  let pass = true;

  function check(name: string, actual: any, expected: any) {
    const actualStr = actual?.toString?.() ?? String(actual);
    const expectedStr = expected?.toString?.() ?? String(expected);
    if (actualStr === expectedStr) {
      console.log(`  OK: ${name} = ${actualStr}`);
    } else {
      console.log(`  FAIL: ${name} = ${actualStr}, expected ${expectedStr}`);
      pass = false;
    }
  }

  check("agentId", evt.agentId, mainAgentId);
  check("authority", evt.authority.toBase58(), mainWallet.publicKey.toBase58());
  check("model", evt.model, "integration-test");
  check("activity", evt.activity, "quest_answer");
  check("referralId", evt.referralId, referralAgentId);

  // Points should be > 0
  const pointsEarned = evt.pointsEarned?.toNumber?.() ?? 0;
  if (pointsEarned > 0) {
    console.log(`  OK: pointsEarned = ${pointsEarned} (> 0)`);
  } else {
    console.log(`  WARN: pointsEarned = ${pointsEarned} (expected > 0)`);
  }

  const referralPoints = evt.referralPointsEarned?.toNumber?.() ?? 0;
  if (referralPoints > 0) {
    console.log(`  OK: referralPointsEarned = ${referralPoints} (> 0)`);
  } else {
    console.log(
      `  WARN: referralPointsEarned = ${referralPoints} (expected > 0)`
    );
  }

  // ── 7. Verify agent records on-chain ───────────────────────────
  // Note: Points are now minted as SPL tokens (Token-2022), not stored on AgentRecord.
  // Check token balances via the point mint ATA if needed.
  console.log("\n--- Verifying on-chain agent records ---");
  const mainRecord = await getAgentRecord(connection, mainAgentId);
  console.log(`  Main agent: ${mainRecord.agentId}, version: ${mainRecord.version}`);
  console.log(`  Main agent referral: ${mainRecord.referralId ?? "(none)"}`);

  const referralRecord = await getAgentRecord(connection, referralAgentId);
  console.log(`  Referral agent: ${referralRecord.agentId}, version: ${referralRecord.version}`);

  // ── Summary ────────────────────────────────────────────────────
  console.log(`\n${pass ? "ALL CHECKS PASSED" : "SOME CHECKS FAILED"}`);
  if (!pass) process.exit(1);
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
