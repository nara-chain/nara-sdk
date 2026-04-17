<p align="center">
  <img src="https://raw.githubusercontent.com/nara-chain/nara-web/main/public/favicon-v3.svg" width="48" />
</p>

<h3 align="center">Nara SDK</h3>
<p align="center">
  Chain-level SDK and CLI for the Nara network.
  <br />
  <a href="https://nara.build/docs">nara.build/docs</a>
</p>

---

TypeScript/JavaScript SDK for interacting with the Nara blockchain. Build agents, submit transactions, query accounts, cross-chain bridge, and integrate with on-chain programs.

## Install

```bash
npm install nara-sdk
```

## Features

- **Agent Registry** — Register agents, bind Twitter, submit tweets, verify, referral system
- **Quest (PoMI)** — Proof of Machine Intelligence ZK quest system, stake, answer-to-earn
- **Skills Hub** — On-chain skill registry for AI agents, upload/query skill content
- **ZK ID** — Zero-knowledge anonymous identity, deposit, withdraw, ownership proofs
- **Cross-chain Bridge** — Nara ↔ Solana bridge via Hyperlane warp routes (USDC, SOL), with in-tx fee extraction and validator signature tracking

## Quick Start

```ts
import { Connection, Keypair } from '@solana/web3.js';
import { getQuestInfo, submitAnswer, generateProof } from 'nara-sdk';

const connection = new Connection('https://mainnet-api.nara.build');
```

## Cross-chain Bridge

Bridge tokens between Solana and Nara with built-in fee extraction (0.5% or per-token floor, whichever is higher).

### One-step bridge

```ts
import { Connection, Keypair } from '@solana/web3.js';
import { bridgeTransfer, setAltAddress } from 'nara-sdk';

const solanaConn = new Connection('https://api.mainnet-beta.solana.com');

// Disable Nara ALT when sending from Solana
setAltAddress(null);

const result = await bridgeTransfer(solanaConn, wallet, {
  token: 'USDC',            // 'USDC' | 'SOL'
  fromChain: 'solana',      // 'solana' | 'nara'
  recipient: targetPubkey,  // destination chain address
  amount: 1_000_000n,       // raw units (1 USDC = 1_000_000)
});

console.log(result.signature);    // source chain tx
console.log(result.messageId);    // cross-chain message ID (0x...)
console.log(result.feeAmount);    // fee deducted
console.log(result.bridgeAmount); // net amount bridged
```

### Build instructions for relay

```ts
import { makeBridgeIxs } from 'nara-sdk';

const { instructions, uniqueMessageKeypair, feeAmount, bridgeAmount } =
  makeBridgeIxs({
    token: 'USDC',
    fromChain: 'solana',
    sender: userPubkey,
    recipient: targetPubkey,
    amount: 1_000_000n,
  });

// uniqueMessageKeypair must sign the tx
```

### Track cross-chain message

```ts
import {
  extractMessageId,
  queryMessageSignatures,
  queryMessageStatus,
} from 'nara-sdk';

// 1. Extract message ID from source tx
const messageId = await extractMessageId(connection, signature);

// 2. Query validator signatures (3-way parallel scan on S3)
const sigs = await queryMessageSignatures(messageId, 'solana');
console.log(sigs.signedCount, '/', sigs.totalValidators); // e.g. 3/3
console.log(sigs.fullySigned);                             // true

// 3. Check delivery on destination chain
const status = await queryMessageStatus(naraConn, messageId, 'nara');
console.log(status.delivered);          // true
console.log(status.deliverySignature);  // destination tx
```

### Supported tokens

| Token | Solana side | Nara side | Decimals | Min bridge | Min fee |
|---|---|---|---|---|---|
| USDC | collateral (lock) | synthetic (mint, Token-2022) | 6 | 5 USDC | 0.5 USDC |
| USDT | collateral (lock) | synthetic (mint, Token-2022) | 6 | 5 USDT | 0.5 USDT |
| SOL | native (lamports) | synthetic (mint, Token-2022) | 9 | 0.1 SOL | 0.01 SOL |

Requests below the per-token `minAmount` are rejected client-side.

Add new tokens at runtime:

```ts
import { registerBridgeToken } from 'nara-sdk';

registerBridgeToken('XYZ', {
  symbol: 'XYZ',
  decimals: 6,
  minAmount: 5_000_000n,   // 5.0
  minFee:    500_000n,     // 0.5 (fee floor)
  solana: { warpProgram, mode: 'collateral', mint, tokenProgram },
  nara:   { warpProgram, mode: 'synthetic',  mint, tokenProgram },
});
```

### Fee configuration

Fee formula: **`fee = max(amount × 0.5%, token.minFee)`** — deducted from the
bridged amount on the source chain in the same transaction. Below the
crossover (100 USDC / 2 SOL) the floor dominates; above, the percentage wins.

Fee recipients are chain-specific (one per source chain):

```ts
import { setBridgeFeeRecipient, getBridgeFeeRecipient } from 'nara-sdk';

// Override fee recipient at runtime (per chain)
setBridgeFeeRecipient('solana', 'SolanaFeeRecipientPubkey...');
setBridgeFeeRecipient('nara',   'NaraFeeRecipientPubkey...');

// Read current recipient
const recipient = getBridgeFeeRecipient('solana');  // PublicKey

// Or per-call
await bridgeTransfer(conn, wallet, {
  ...params,
  feeBps: 100,                      // 1% (overrides default 50 bps)
  feeRecipient: customPubkey,       // override recipient
  skipFee: true,                    // or skip entirely
});
```

## Agent Registry

```ts
import {
  registerAgent,
  getAgentRecord,
  setTwitter,
  verifyTwitter,
  submitTweet,
  approveTweet,
} from 'nara-sdk';

// Register an agent
await registerAgent(connection, wallet, agentId, name, metadataUri);

// Twitter verification flow
await setTwitter(connection, wallet, agentId, handle);
await verifyTwitter(connection, verifierWallet, agentId);

// Tweet submission & approval
await submitTweet(connection, wallet, agentId, tweetId, tweetUrl);
await approveTweet(connection, verifierWallet, agentId, tweetId, freeCredits);
```

## Quest (PoMI)

Each round has two independent reward channels:
- **Stake channel** — requires active stake (auto-decays from `stakeHigh` to `stakeLow`)
- **Credit channel** — consumes `stakeInfo.freeCredits` (admin-assigned, no stake required)

```ts
import { getQuestInfo, getStakeInfo, generateProof, submitAnswer } from 'nara-sdk';

const quest = await getQuestInfo(connection);
console.log(`Stake slots: ${quest.stakeRemainingSlots}/${quest.stakeRewardCount}`);
console.log(`Credit slots: ${quest.creditRemainingSlots}/${quest.creditRewardCount}`);

const proof = await generateProof(quest.question, answer);

// stake: "auto" — SDK skips stake ix if user has freeCredits, else tops up
// stake to the current effectiveStakeRequirement
const sig = await submitAnswer(connection, wallet, proof, "", "", {
  stake: "auto",
});
```

Relevant `QuestInfo` fields:
- `stakeRewardCount` / `stakeWinnerCount` / `stakeRewardPerWinner` / `stakeRemainingSlots`
- `creditRewardCount` / `creditWinnerCount` / `creditRewardPerWinner` / `creditRemainingSlots`
- `stakeHigh` / `stakeLow` / `effectiveStakeRequirement` — current required stake

## Documentation

Full API reference at [nara.build/docs](https://nara.build/docs).

## License

MIT

## Links

[Website](https://nara.build) · [Explorer](https://explorer.nara.build) · [GitHub](https://github.com/nara-chain) · [X](https://x.com/NaraBuildAI)
