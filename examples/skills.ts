/**
 * Example: Skills Hub (on-chain skill registry)
 *
 * This example demonstrates how to:
 * 1. Register a new skill
 * 2. Upload skill content (chunked buffer mechanism)
 * 3. Set a description and JSON metadata
 * 4. Query skill info and read content
 * 5. Update skill content
 * 6. Transfer authority to another wallet
 * 7. Delete a skill
 *
 * Prerequisites:
 * - Set PRIVATE_KEY environment variable (base58 or JSON array)
 *
 * Run: tsx examples/skills.ts
 */

import {
  registerSkill,
  getSkillRecord,
  getSkillInfo,
  getSkillContent,
  setDescription,
  updateMetadata,
  uploadSkillContent,
  transferAuthority,
  deleteSkill,
  Keypair,
  PublicKey,
} from "../index";
import { Connection } from "@solana/web3.js";
import bs58 from "bs58";
import { readFileSync } from "fs";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

  // Random skill name (6-char hex suffix ensures uniqueness each run)
  const suffix = Math.random().toString(16).slice(2, 8);
  const skillName = process.env.SKILL_NAME || `skill-${suffix}`;

  // ── 1. Register skill ───────────────────────────────────────────
  console.log(`\n--- Registering skill "${skillName}" ---`);
  try {
    const { signature, skillPubkey } = await registerSkill(
      connection,
      wallet,
      skillName,
      "Example Author"
    );
    console.log("Registered:", skillPubkey.toBase58());
    console.log("Transaction:", signature);
  } catch (err: any) {
    // Skill may already exist; continue to show other operations
    console.log("Register skipped (may already exist):", err.message);
  }

  // ── 2. Set description ──────────────────────────────────────────
  console.log("\n--- Setting description ---");
  const descSig = await setDescription(
    connection,
    wallet,
    skillName,
    "A sample skill demonstrating the Nara Skills Hub SDK."
  );
  console.log("Transaction:", descSig);

  // ── 3. Set JSON metadata ────────────────────────────────────────
  console.log("\n--- Setting metadata ---");
  const metadata = JSON.stringify({
    version: "1.0.0",
    tags: ["example", "demo"],
    homepage: "https://nara.build",
  });
  const metaSig = await updateMetadata(connection, wallet, skillName, metadata);
  console.log("Transaction:", metaSig);

  // ── 4. Upload skill content ─────────────────────────────────────
  console.log("\n--- Uploading skill content ---");
  const contentPath = `${__dirname}/test_skill.md`;
  const content = readFileSync(contentPath);
  console.log(`Content size: ${content.length} bytes (${contentPath})`);

  const uploadSig = await uploadSkillContent(
    connection,
    wallet,
    skillName,
    content,
    {
      onProgress(chunkIndex, totalChunks, sig) {
        console.log(`  [${chunkIndex}/${totalChunks}] tx: ${sig}`);
      },
    }
  );
  console.log("Finalize tx:", uploadSig);

  // ── 5. Query skill info ─────────────────────────────────────────
  console.log("\n--- Querying skill info ---");
  const info = await getSkillInfo(connection, skillName);
  console.log("Name:", info.record.name);
  console.log("Author:", info.record.author);
  console.log("Authority:", info.record.authority.toBase58());
  console.log("Version:", info.record.version);
  console.log("Created at:", new Date(info.record.createdAt * 1000).toISOString());
  console.log(
    "Updated at:",
    info.record.updatedAt
      ? new Date(info.record.updatedAt * 1000).toISOString()
      : "—"
  );
  console.log("Description:", info.description ?? "(none)");
  console.log("Metadata:", info.metadata ?? "(none)");

  // ── 6. Verify content matches uploaded file ─────────────────────
  console.log("\n--- Verifying content ---");
  const contentBytes = await getSkillContent(connection, skillName);
  if (!contentBytes) {
    console.log("ERROR: no content found on-chain");
  } else if (contentBytes.equals(content)) {
    console.log(`OK: on-chain content matches ${contentPath} (${content.length} bytes)`);
  } else {
    console.log(
      `MISMATCH: on-chain ${contentBytes.length} bytes vs local ${content.length} bytes`
    );
  }

  // ── 7. Update skill content ─────────────────────────────────────
  console.log("\n--- Updating skill content ---");
  const updatedContent = readFileSync(contentPath);
  const updateSig = await uploadSkillContent(
    connection,
    wallet,
    skillName,
    updatedContent,
    {
      onProgress(chunkIndex, totalChunks, sig) {
        console.log(`  [${chunkIndex}/${totalChunks}] tx: ${sig}`);
      },
    }
  );
  console.log("Finalize tx:", updateSig);

  const updatedRecord = await getSkillRecord(connection, skillName);
  console.log("New version:", updatedRecord.version);

  // ── 8. Transfer authority (optional) ───────────────────────────
  // Uncomment and set NEW_AUTHORITY to transfer ownership.
  // const newAuthority = new PublicKey(process.env.NEW_AUTHORITY!);
  // console.log("\n--- Transferring authority ---");
  // const transferSig = await transferAuthority(
  //   connection,
  //   wallet,
  //   skillName,
  //   newAuthority
  // );
  // console.log("Transaction:", transferSig);

  // ── 9. Delete skill (optional) ──────────────────────────────────
  // Uncomment to delete the skill and reclaim all rent.
  // console.log("\n--- Deleting skill ---");
  // const deleteSig = await deleteSkill(connection, wallet, skillName);
  // console.log("Transaction:", deleteSig);

  console.log("\nDone.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
