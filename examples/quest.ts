/**
 * Example: Quest (Answer-to-Earn with ZK Proofs)
 *
 * This example demonstrates how to:
 * 1. Fetch the current quest question
 * 2. Generate a ZK proof for your answer
 * 3. Test A: stake=auto + answer in one tx (new address)
 * 4. Test B: stake=1 + answer in one tx (new address)
 *
 * Each test creates a fresh keypair, funds it from the main wallet, then runs.
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 *
 * Run: tsx examples/quest.ts
 */

import {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  parseQuestReward,
  getStakeInfo,
  sendTx,
  Keypair,
  getAltAddress,
} from "../index";
import {
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function lookupAnswer(question: string): string | null {
  try {
    const data = readFileSync(join(__dirname, "../.assets/test-questions.json"), "utf-8");
    const questions: { text: string; answer: string }[] = JSON.parse(data);
    const match = questions.find((q) => q.text === question);
    return match?.answer ?? null;
  } catch {
    return null;
  }
}

/** Fund a new address from the main wallet */
async function fundAddress(
  connection: Connection,
  funder: Keypair,
  recipient: Keypair,
  solAmount: number
) {
  const ix = SystemProgram.transfer({
    fromPubkey: funder.publicKey,
    toPubkey: recipient.publicKey,
    lamports: Math.round(solAmount * LAMPORTS_PER_SOL),
  });
  const sig = await sendTx(connection, funder, [ix]);
  console.log(`  Funded ${recipient.publicKey.toBase58()} with ${solAmount} SOL (tx: ${sig})`);
}

/** Run a single answer test with the given stake option */
async function runTest(
  label: string,
  connection: Connection,
  funder: Keypair,
  stakeOption: "auto" | number
) {
  console.log(`\n========== ${label} ==========`);

  // Re-fetch quest info (question may have changed between tests)
  console.log("  Fetching latest quest info...");
  const quest = await getQuestInfo(connection, funder);
  if (!quest.active) {
    console.log("  No active quest, skipping.");
    return;
  }
  if (quest.expired) {
    console.log("  Quest expired, skipping.");
    return;
  }
  console.log(`  Question: ${quest.question}, Round: #${quest.round}`);

  // Solve the question
  let answer = process.env.QUEST_ANSWER ?? null;
  if (!answer) {
    answer = lookupAnswer(quest.question);
    if (answer) {
      console.log(`  Auto-solved: "${answer}"`);
    }
  }
  if (!answer) {
    console.log("  No answer available, skipping.");
    return;
  }

  // Create and fund a fresh keypair
  const testWallet = Keypair.generate();
  console.log(`  Test wallet: ${testWallet.publicKey.toBase58()}`);
  await fundAddress(connection, funder, testWallet, 5);

  // Generate ZK proof for this new address
  console.log("  Generating ZK proof...");
  const proof = await generateProof(
    answer,
    quest.answerHash,
    testWallet.publicKey,
    quest.round
  );

  // Check stake status
  const stakeInfo = await getStakeInfo(connection, testWallet.publicKey);
  console.log(`  Stake before: ${stakeInfo?.amount ?? 0} SOL (required: ${quest.effectiveStakeRequirement.toFixed(4)} SOL)`);

  // Submit answer with stake in the same tx
  console.log(`  Submitting with stake=${stakeOption}...`);
  try {
    const result = await submitAnswer(connection, testWallet, proof.solana, "", "", {
      stake: stakeOption,
    });
    console.log(`  Transaction: ${result.signature}`);

    // Check stake after
    const stakeAfter = await getStakeInfo(connection, testWallet.publicKey);
    console.log(`  Stake after: ${stakeAfter?.amount ?? 0} SOL`);

    // Parse reward (only after tx confirmed successfully)
    const reward = await parseQuestReward(connection, result.signature);
    if (reward.rewarded) {
      console.log(`  Reward: ${reward.rewardNso} NSO (winner ${reward.winner})`);
    } else {
      console.log("  Correct answer, but no reward slots remaining");
    }
  } catch (err) {
    console.error(`  Transaction failed: ${err}`);
  }
}

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("PRIVATE_KEY environment variable is required");
  }

  const wallet = privateKey.startsWith("[")
    ? Keypair.fromSecretKey(new Uint8Array(JSON.parse(privateKey)))
    : Keypair.fromSecretKey(bs58.decode(privateKey));

  const rpcUrl = process.env.RPC_URL || "https://mainnet-api.nara.build/";
  const connection = new Connection(rpcUrl, "confirmed");

  console.log("Main wallet:", wallet.publicKey.toBase58());
  const altAddrs = getAltAddress();
  if (altAddrs.length) {
    console.log(`ALT enabled: ${altAddrs.join(", ")}`);
  } else {
    console.log("ALT: disabled (using legacy transactions)");
  }

  // Test A: stake=auto
  await runTest("Test A: stake=auto", connection, wallet, "auto");

  // Test B: stake=1 (fixed 1 SOL)
  await runTest("Test B: stake=1", connection, wallet, 1);

  console.log("\n--- All tests complete ---");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
