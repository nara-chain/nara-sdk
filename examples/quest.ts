/**
 * Example: Quest (Answer-to-Earn with ZK Proofs)
 *
 * This example demonstrates how to:
 * 1. Fetch the current quest question
 * 2. Check if you've already answered
 * 3. Generate a ZK proof for your answer
 * 4. Submit the answer on-chain (direct or via relay)
 * 5. Parse the reward from the transaction
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 *
 * Run: tsx examples/8-quest.ts
 */

import {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  submitAnswerViaRelay,
  parseQuestReward,
  Keypair,
} from "../index";
import { Connection } from "@solana/web3.js";
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

  console.log("Wallet:", wallet.publicKey.toBase58());

  // 1. Fetch quest info
  console.log("\n--- Fetching quest info ---");
  const quest = await getQuestInfo(connection, wallet);

  if (!quest.active) {
    console.log("No active quest at the moment");
    return;
  }

  console.log(`Question: ${quest.question}`);
  console.log(`Round: #${quest.round}`);
  console.log(`Reward per winner: ${quest.rewardPerWinner} NSO`);
  console.log(`Remaining slots: ${quest.remainingSlots}`);
  console.log(`Time remaining: ${quest.timeRemaining}s`);

  if (quest.expired) {
    console.log("Quest has expired, waiting for next round...");
    return;
  }

  // 2. Check if already answered
  console.log("\n--- Checking answer status ---");
  const alreadyAnswered = await hasAnswered(connection, wallet);
  if (alreadyAnswered) {
    console.log("Already answered this round, waiting for next round...");
    return;
  }

  // 3. Solve the question
  let answer = process.env.QUEST_ANSWER ?? null;
  if (!answer) {
    answer = lookupAnswer(quest.question);
    if (answer) {
      console.log(`Auto-solved from test-questions.json: "${answer}"`);
    }
  }
  if (!answer) {
    console.log("Set QUEST_ANSWER env or ensure .assets/test-questions.json has the answer.");
    return;
  }
  console.log(`\n--- Generating ZK proof for answer: "${answer}" ---`);

  const proof = await generateProof(
    answer,
    quest.answerHash,
    wallet.publicKey,
    quest.round
  );
  console.log("Proof generated successfully");

  // 4. Submit answer
  // Option A: Direct on-chain submission (requires gas)
  console.log("\n--- Submitting answer on-chain ---");
  const result = await submitAnswer(connection, wallet, proof.solana);
  console.log(`Transaction: ${result.signature}`);

  // Option B: Gasless relay submission (uncomment to use)
  // const relayResult = await submitAnswerViaRelay(
  //   "https://quest-api.nara.build",
  //   wallet.publicKey,
  //   proof.hex
  // );
  // console.log(`Transaction: ${relayResult.txHash}`);

  // 5. Parse reward
  console.log("\n--- Checking reward ---");
  const reward = await parseQuestReward(connection, result.signature);

  if (reward.rewarded) {
    console.log(`Reward: ${reward.rewardNso} NSO (winner ${reward.winner})`);
  } else {
    console.log("Correct answer, but no reward slots remaining");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
