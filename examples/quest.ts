/**
 * Example: Quest (Boost PoMI Answer-to-Earn)
 *
 * Demonstrates:
 * 1. Fetch the current quest question
 * 2. Generate a ZK proof for the answer
 * 3. Submit the answer (requires boostCredits > 0 on the user's stake record)
 * 4. Parse the reward from the resulting tx
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 * - Wallet must have boost credits (granted by stake_authority via adjustBoostCredits)
 *
 * Run: tsx examples/quest.ts
 */

import {
  getQuestInfo,
  generateProof,
  submitAnswer,
  parseQuestReward,
  getStakeInfo,
  Keypair,
  getAltAddress,
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
  const altAddrs = getAltAddress();
  console.log(altAddrs.length ? `ALT enabled: ${altAddrs.join(", ")}` : "ALT: disabled");

  // Fetch quest info
  const quest = await getQuestInfo(connection, wallet);
  if (!quest.active) {
    console.log("No active quest, exiting.");
    return;
  }
  if (quest.expired) {
    console.log("Quest expired, exiting.");
    return;
  }
  console.log(`\nQuestion: ${quest.question}`);
  console.log(`Round: #${quest.round}`);
  console.log(`Boost slots: ${quest.boostRemainingSlots}/${quest.boostRewardCount}`);

  // Solve the question
  const answer = process.env.QUEST_ANSWER ?? lookupAnswer(quest.question);
  if (!answer) {
    console.log("No answer available, exiting.");
    return;
  }
  console.log(`Answer: "${answer}"`);

  // Verify boost credits
  const stakeInfo = await getStakeInfo(connection, wallet.publicKey);
  const credits = stakeInfo?.boostCredits ?? 0;
  console.log(`Boost credits: ${credits}`);
  if (credits <= 0) {
    console.log("No boost credits — cannot submit. Acquire credits first.");
    return;
  }

  // Generate ZK proof
  console.log("\nGenerating ZK proof...");
  const proof = await generateProof(answer, quest.answerHash, wallet.publicKey, quest.round);

  // Submit
  console.log("Submitting answer...");
  const result = await submitAnswer(connection, wallet, proof.solana);
  console.log(`Tx: ${result.signature}`);

  // Parse reward
  const reward = await parseQuestReward(connection, result.signature);
  if (reward.rewarded) {
    console.log(`Reward: ${reward.rewardNso} NARA (winner ${reward.winner})`);
  } else {
    console.log("Correct answer, but no reward slots remaining or vault insufficient");
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
