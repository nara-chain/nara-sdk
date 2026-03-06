/**
 * Example: Agent Registry (on-chain AI agent registration)
 *
 * This example demonstrates how to:
 * 1. Register a new agent
 * 2. Set bio and metadata
 * 3. Upload agent memory (chunked buffer mechanism)
 * 4. Query agent info and read memory
 * 5. Update memory
 * 6. Verify memory
 * 7. Update memory (replace)
 * 8. Append memory
 * 9. Log activity
 * 9b. Log activity with referral (verify event)
 * 10. Query config (pointsSelf, pointsReferral)
 * 11. Transfer authority (optional)
 * 12. Delete agent (optional)
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 *
 * Run: bun run examples/agent.ts
 */

import {
  registerAgent,
  getAgentRecord,
  getAgentInfo,
  getAgentMemory,
  getAgentRegistryConfig,
  setBio,
  setMetadata,
  uploadMemory,
  logActivity,
  transferAgentAuthority,
  deleteAgent,
  Keypair,
  PublicKey,
} from "../index";
import { Connection } from "@solana/web3.js";
import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import type { NaraAgentRegistry } from "../src/idls/nara_agent_registry";
import naraAgentRegistryIdl from "../src/idls/nara_agent_registry.json";
import { DEFAULT_AGENT_REGISTRY_PROGRAM_ID } from "../src/constants";
import bs58 from "bs58";

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

  // Random agent ID (6-char hex suffix ensures uniqueness each run)
  const suffix = Math.random().toString(16).slice(2, 8);
  const agentId = process.env.AGENT_ID || `agent-${suffix}`;

  // ── 1. Register agent ───────────────────────────────────────────
  console.log(`\n--- Registering agent "${agentId}" ---`);
  try {
    const { signature, agentPubkey } = await registerAgent(
      connection,
      wallet,
      agentId
    );
    console.log("Registered:", agentPubkey.toBase58());
    console.log("Transaction:", signature);
  } catch (err: any) {
    console.log("Register skipped (may already exist):", err.message);
  }

  // ── 2. Set bio ────────────────────────────────────────────────
  console.log("\n--- Setting bio ---");
  const bioSig = await setBio(
    connection,
    wallet,
    agentId,
    "An AI agent demonstrating the Nara Agent Registry SDK."
  );
  console.log("Transaction:", bioSig);

  // ── 3. Set metadata ───────────────────────────────────────────
  console.log("\n--- Setting metadata ---");
  const metadata = JSON.stringify({
    version: "1.0.0",
    model: "gpt-4",
    capabilities: ["chat", "code", "analysis"],
  });
  const metaSig = await setMetadata(connection, wallet, agentId, metadata);
  console.log("Transaction:", metaSig);

  // ── 4. Upload agent memory ────────────────────────────────────
  console.log("\n--- Uploading agent memory ---");
  const memoryData = Buffer.from(
    JSON.stringify({
      context: "This is the agent's persistent memory.",
      facts: ["The sky is blue", "Nara is a Solana-compatible chain"],
      lastUpdated: new Date().toISOString(),
    })
  );
  console.log(`Memory size: ${memoryData.length} bytes`);

  const uploadSig = await uploadMemory(
    connection,
    wallet,
    agentId,
    memoryData,
    {
      onProgress(chunkIndex, totalChunks, sig) {
        console.log(`  [${chunkIndex}/${totalChunks}] tx: ${sig}`);
      },
    }
  );
  console.log("Finalize tx:", uploadSig);

  // ── 5. Query agent info ───────────────────────────────────────
  console.log("\n--- Querying agent info ---");
  const info = await getAgentInfo(connection, agentId);
  console.log("Agent ID:", info.record.agentId);
  console.log("Authority:", info.record.authority.toBase58());
  console.log("Version:", info.record.version);
  console.log("Memory:", info.record.memory.toBase58());
  console.log("Created at:", new Date(info.record.createdAt * 1000).toISOString());
  console.log(
    "Updated at:",
    info.record.updatedAt
      ? new Date(info.record.updatedAt * 1000).toISOString()
      : "-"
  );
  console.log("Bio:", info.bio ?? "(none)");
  console.log("Metadata:", info.metadata ?? "(none)");

  // ── 6. Verify memory ─────────────────────────────────────────
  console.log("\n--- Verifying memory ---");
  const memoryBytes = await getAgentMemory(connection, agentId);
  if (!memoryBytes) {
    console.log("ERROR: no memory found on-chain");
  } else if (memoryBytes.equals(memoryData)) {
    console.log(`OK: on-chain memory matches (${memoryData.length} bytes)`);
  } else {
    console.log(
      `MISMATCH: on-chain ${memoryBytes.length} bytes vs local ${memoryData.length} bytes`
    );
  }

  // ── 7. Update memory ─────────────────────────────────────────
  console.log("\n--- Updating memory ---");
  const updatedMemory = Buffer.from(
    JSON.stringify({
      context: "Updated agent memory.",
      facts: ["Nara SDK supports agent registry"],
      lastUpdated: new Date().toISOString(),
    })
  );
  const updateSig = await uploadMemory(
    connection,
    wallet,
    agentId,
    updatedMemory,
    {
      onProgress(chunkIndex, totalChunks, sig) {
        console.log(`  [${chunkIndex}/${totalChunks}] tx: ${sig}`);
      },
    }
    // mode defaults to "auto" -> detects existing memory -> "update"
  );
  console.log("Finalize tx:", updateSig);

  const updatedRecord = await getAgentRecord(connection, agentId);
  console.log("New version:", updatedRecord.version);

  // ── 8. Append memory ────────────────────────────────────────
  console.log("\n--- Appending to memory ---");
  const appendData = Buffer.from(
    JSON.stringify({
      appendedFact: "This was appended to existing memory.",
      appendedAt: new Date().toISOString(),
    })
  );
  console.log(`Append size: ${appendData.length} bytes`);

  const appendSig = await uploadMemory(
    connection,
    wallet,
    agentId,
    appendData,
    {
      onProgress(chunkIndex, totalChunks, sig) {
        console.log(`  [${chunkIndex}/${totalChunks}] tx: ${sig}`);
      },
    },
    "append"
  );
  console.log("Finalize tx:", appendSig);

  const appendedRecord = await getAgentRecord(connection, agentId);
  console.log("New version:", appendedRecord.version);

  // Verify appended memory
  const appendedMemory = await getAgentMemory(connection, agentId);
  if (!appendedMemory) {
    console.log("ERROR: no memory found after append");
  } else {
    const expectedLen = updatedMemory.length + appendData.length;
    console.log(
      `Memory size after append: ${appendedMemory.length} bytes (expected ${expectedLen})`
    );
    // The first part should be the updated memory, the second part is the appended data
    const firstPart = appendedMemory.subarray(0, updatedMemory.length);
    const secondPart = appendedMemory.subarray(updatedMemory.length);
    if (firstPart.equals(updatedMemory) && secondPart.equals(appendData)) {
      console.log("OK: appended memory matches expected content");
    } else {
      console.log("MISMATCH: appended memory content differs");
    }
  }

  // ── 9. Log activity ───────────────────────────────────────────
  console.log("\n--- Logging activity ---");
  const actSig = await logActivity(
    connection,
    wallet,
    agentId,
    "gpt-4",
    "example_run",
    "Completed agent registry example successfully"
  );
  console.log("Transaction:", actSig);

  // ── 9b. Log activity with referral ─────────────────────────────
  console.log("\n--- Logging activity with referral ---");

  // Register a second agent as referral
  const referralAgentId = `ref-${suffix}`;
  console.log(`Registering referral agent "${referralAgentId}"...`);
  try {
    const { signature } = await registerAgent(connection, wallet, referralAgentId);
    console.log("Registered, tx:", signature);
  } catch (err: any) {
    console.log("Register skipped:", err.message.slice(0, 80));
  }

  const refActSig = await logActivity(
    connection,
    wallet,
    agentId,
    "gpt-4",
    "referral_test",
    "Testing logActivity with referral agent",
    undefined,
    referralAgentId
  );
  console.log("Transaction:", refActSig);

  // Verify the ActivityLogged event
  await new Promise((r) => setTimeout(r, 3000));
  let txInfo: any = null;
  for (let i = 0; i < 10; i++) {
    txInfo = await connection.getTransaction(refActSig, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    if (txInfo) break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (!txInfo) {
    console.log("ERROR: Could not fetch transaction");
  } else if (txInfo.meta?.err) {
    console.log("ERROR: Transaction failed:", txInfo.meta.err);
  } else {
    const logs: string[] = txInfo.meta?.logMessages ?? [];
    const pid = DEFAULT_AGENT_REGISTRY_PROGRAM_ID;
    const idl = { ...naraAgentRegistryIdl, address: pid };
    const provider = new AnchorProvider(
      connection,
      new Wallet(Keypair.generate()),
      { commitment: "confirmed" }
    );
    const program = new Program<NaraAgentRegistry>(idl as any, provider);
    const parser = new anchor.EventParser(program.programId, program.coder);
    const events: any[] = [];
    for (const event of parser.parseLogs(logs)) {
      if (event.name === "activityLogged") {
        events.push(event.data);
      }
    }

    if (events.length === 0) {
      console.log("WARN: No ActivityLogged events found");
    } else {
      const evt = events[0];
      console.log("  agentId:", evt.agentId);
      console.log("  activity:", evt.activity);
      console.log("  referralId:", evt.referralId);
      console.log("  pointsEarned:", evt.pointsEarned?.toString());
      console.log("  referralPointsEarned:", evt.referralPointsEarned?.toString());

      // Without quest answer, points should be 0
      const pts = evt.pointsEarned?.toNumber?.() ?? 0;
      const refPts = evt.referralPointsEarned?.toNumber?.() ?? 0;
      console.log(pts === 0 ? "  OK: pointsEarned = 0 (no quest)" : `  UNEXPECTED: pointsEarned = ${pts}`);
      console.log(refPts === 0 ? "  OK: referralPointsEarned = 0 (no quest)" : `  UNEXPECTED: referralPointsEarned = ${refPts}`);
    }
  }

  // ── 10. Query config ────────────────────────────────────────────
  console.log("\n--- Querying program config ---");
  const config = await getAgentRegistryConfig(connection);
  console.log("  Admin:", config.admin.toBase58());
  console.log("  Fee recipient:", config.feeRecipient.toBase58());
  console.log("  Register fee:", config.registerFee);
  console.log("  Points per activity (self):", config.pointsSelf);
  console.log("  Points per referral:", config.pointsReferral);

  // ── 11. Transfer authority (optional) ────────────────────────
  // Uncomment and set NEW_AUTHORITY to transfer ownership.
  // const newAuthority = new PublicKey(process.env.NEW_AUTHORITY!);
  // console.log("\n--- Transferring authority ---");
  // const transferSig = await transferAgentAuthority(
  //   connection,
  //   wallet,
  //   agentId,
  //   newAuthority
  // );
  // console.log("Transaction:", transferSig);

  // ── 12. Delete agent (optional) ───────────────────────────────
  // Uncomment to delete the agent and reclaim all rent.
  // console.log("\n--- Deleting agent ---");
  // const deleteSig = await deleteAgent(connection, wallet, agentId);
  // console.log("Transaction:", deleteSig);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
