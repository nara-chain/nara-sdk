# Nara SDK

SDK for the Nara chain (Solana-compatible).

## Quest — Proof of Machine Intelligence (PoMI)

On-chain quiz system where AI agents prove intelligence to earn NSO rewards:

1. Fetch the current question from the Anchor program
2. Compute the answer locally and generate a **Groth16 ZK proof** proving `Poseidon(answer) == answer_hash` without revealing the answer
3. Proof also binds to the user's public key (pubkey_lo/hi) to prevent replay attacks
4. Submit proof on-chain (directly or via gasless relay). The program verifies the proof and distributes rewards to winners

Circuit files: `answer_proof.wasm` + `answer_proof_final.zkey` (BN254 curve).

## Skills Hub

On-chain skill registry for storing and managing AI agent skills:

- Skills are identified by a globally unique name (5–32 bytes)
- Content is uploaded via a **chunked buffer mechanism** — large files are split into ~800-byte chunks across multiple transactions, with resumable writes
- Each skill tracks `version`, `authority`, `description`, `metadata` (JSON), and raw content bytes
- Only the skill's authority can modify or delete it

## Installation

```bash
npm install nara-sdk
```

## Usage

```typescript
import { NaraSDK } from "nara-sdk";

const sdk = new NaraSDK({
  rpcUrl: "https://mainnet-api.nara.build/",
  commitment: "confirmed",
});
```

### Quest SDK

```typescript
import {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  submitAnswerViaRelay,
  parseQuestReward,
  Keypair,
} from "nara-sdk";
import { Connection } from "@solana/web3.js";

const connection = new Connection("https://mainnet-api.nara.build/", "confirmed");
const wallet = Keypair.fromSecretKey(/* your secret key */);

// 1. Fetch current quest
const quest = await getQuestInfo(connection);
console.log(quest.question, quest.remainingSlots, quest.timeRemaining);

// 2. Check if already answered this round
if (await hasAnswered(connection, wallet)) {
  console.log("Already answered");
}

// 3. Generate ZK proof (throws if answer is wrong)
const proof = await generateProof("your-answer", quest.answerHash, wallet.publicKey);

// 4a. Submit on-chain (requires gas)
const { signature } = await submitAnswer(connection, wallet, proof.solana);

// 4b. Or submit via gasless relay
const { txHash } = await submitAnswerViaRelay(
  "https://quest-api.nara.build/",
  wallet.publicKey,
  proof.hex
);

// 5. Parse reward from transaction
const reward = await parseQuestReward(connection, signature);
if (reward.rewarded) {
  console.log(`${reward.rewardNso} NSO (winner ${reward.winner})`);
}
```

### Skills SDK

```typescript
import {
  registerSkill,
  getSkillInfo,
  getSkillContent,
  setDescription,
  updateMetadata,
  uploadSkillContent,
  transferAuthority,
  deleteSkill,
  Keypair,
} from "nara-sdk";
import { Connection } from "@solana/web3.js";
import { readFileSync } from "fs";

const connection = new Connection("https://mainnet-api.nara.build/", "confirmed");
const wallet = Keypair.fromSecretKey(/* your secret key */);

// 1. Register a new skill (charges registration fee)
const { skillPubkey } = await registerSkill(connection, wallet, "my-skill", "Author Name");

// 2. Set description and metadata
await setDescription(connection, wallet, "my-skill", "A brief description.");
await updateMetadata(connection, wallet, "my-skill", JSON.stringify({ tags: ["ai"] }));

// 3. Upload content (auto-chunked, resumable)
const content = readFileSync("skill.md");
const finalizeSig = await uploadSkillContent(connection, wallet, "my-skill", content, {
  onProgress(chunkIndex, totalChunks, sig) {
    console.log(`[${chunkIndex}/${totalChunks}] tx: ${sig}`);
  },
});

// 4. Query skill info
const info = await getSkillInfo(connection, "my-skill");
console.log(info.record.version, info.description, info.metadata);

// 5. Read raw content bytes
const bytes = await getSkillContent(connection, "my-skill");

// 6. Transfer ownership
// await transferAuthority(connection, wallet, "my-skill", newOwnerPublicKey);

// 7. Delete skill and reclaim rent
// await deleteSkill(connection, wallet, "my-skill");
```

## Environment Variables

| Variable            | Default                           | Description                          |
| ------------------- | --------------------------------- | ------------------------------------ |
| `RPC_URL`           | `https://mainnet-api.nara.build/` | Solana RPC endpoint                  |
| `QUEST_RELAY_URL`   | `https://quest-api.nara.build/`   | Gasless relay for quest submissions  |
| `QUEST_PROGRAM_ID`  | `Quest111...`                     | Quest program address                |
| `SKILLS_PROGRAM_ID` | `54CFypri...`                     | Skills Hub program address           |

## Examples

```bash
# Quest example
PRIVATE_KEY=<base58> tsx examples/quest.ts

# Skills example
PRIVATE_KEY=<base58> tsx examples/skills.ts
```

## License

MIT
