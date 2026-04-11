/**
 * Standalone test for the transaction parser.
 *
 * Covers:
 *   - parseTxFromHash         (fetch + parse by signature)
 *   - parseTxResponse         (sync parse of an already-fetched tx)
 *   - parseTxsFromHashes      (batch fetch + parse)
 *   - formatParsedTx          (tree rendering)
 *   - Hierarchical innerInstructions (CPI nesting under parent ixs)
 *
 * Run: npm run test:parser
 */

import { Connection, PublicKey } from "@solana/web3.js";
import {
  parseTxFromHash,
  parseTxsFromHashes,
  parseTxResponse,
  formatParsedTx,
  type ParsedInstruction,
  type ParsedTransaction,
} from "../index";

const NARA_RPC = process.env.NARA_RPC || "https://mainnet-api.nara.build/";
const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

// Known bridge USDC Solana→Nara tx (has fee transfer + ATA create + warp route CPI)
const BRIDGE_TX_SOLANA =
  "SRgY4DG5DR9xC7G74Acz4KeTGYnswDMqafji5CVTJT7e5nqfHgccqLpNodszGfKsV3JbZH4UT9skjyNXBFeWCdv";

const NARA_MAILBOX = new PublicKey("EjtLD3MCBJregFKAce2pQqPtSnnmBWK5oAZ3wBifHnaH");

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

function countAll(ixs: ParsedInstruction[]): number {
  let n = 0;
  for (const ix of ixs) {
    n++;
    if (ix.innerInstructions) n += countAll(ix.innerInstructions);
  }
  return n;
}

function findRecursive(
  ixs: ParsedInstruction[],
  predicate: (ix: ParsedInstruction) => boolean
): ParsedInstruction | null {
  for (const ix of ixs) {
    if (predicate(ix)) return ix;
    if (ix.innerInstructions) {
      const hit = findRecursive(ix.innerInstructions, predicate);
      if (hit) return hit;
    }
  }
  return null;
}

// ─── Tests ────────────────────────────────────────────────────────

async function main() {
  const sol = new Connection(SOLANA_RPC, "confirmed");
  const nara = new Connection(NARA_RPC, "confirmed");

  console.log("=== nara-sdk tx parser tests ===");
  console.log(`Nara RPC:   ${NARA_RPC}`);
  console.log(`Solana RPC: ${SOLANA_RPC}`);
  console.log();

  // ── Fetch once, reuse across multiple tests to avoid rate limits ──
  console.log("[fetch fixtures]");
  let bridgeTx: ParsedTransaction;
  await run("parseTxFromHash (bridge USDC Solana→Nara)", async () => {
    bridgeTx = await parseTxFromHash(sol, BRIDGE_TX_SOLANA);
    assert(bridgeTx.success, "tx succeeded");
    assert(bridgeTx.signature === BRIDGE_TX_SOLANA, "signature matches");
  });

  console.log();

  // ── Hierarchy validation ──
  console.log("[hierarchy]");
  await run("top-level instructions are flat (no mixed inner)", async () => {
    // Sanity: every top-level ix's index equals its position
    for (let i = 0; i < bridgeTx.instructions.length; i++) {
      assert(bridgeTx.instructions[i]!.index === i, `ix[${i}].index == ${i}`);
    }
  });

  await run("inner ixs are nested under their parent", async () => {
    // The bridge warp route call is a top-level ix and must have CPI calls.
    const bridgeIx = bridgeTx.instructions.find((ix) => ix.type === "transferRemote");
    assert(bridgeIx !== undefined, "found top-level transferRemote");
    assert(bridgeIx!.innerInstructions !== undefined, "has innerInstructions");
    assert(bridgeIx!.innerInstructions!.length > 0, "has at least one inner ix");

    // Inner ix indices are local (0..n), not global
    bridgeIx!.innerInstructions!.forEach((inner, j) => {
      assert(inner.index === j, `inner[${j}].index == ${j}`);
    });
  });

  await run("total ix count (top + inner) > top-level count", async () => {
    const topN = bridgeTx.instructions.length;
    const totalN = countAll(bridgeTx.instructions);
    assert(totalN > topN, `totalN(${totalN}) > topN(${topN})`);
    console.log(`    top-level: ${topN}, total incl. inner: ${totalN}`);
  });

  await run("bridge transferChecked CPI is nested (not top-level)", async () => {
    // The warp route program invokes SPL transferChecked internally — it must
    // live under the transferRemote ix, not as a sibling.
    const bridgeIx = bridgeTx.instructions.find((ix) => ix.type === "transferRemote");
    assert(bridgeIx !== undefined, "found transferRemote");
    const innerTransfer = bridgeIx!.innerInstructions?.find(
      (ix) => ix.type === "transferChecked"
    );
    assert(innerTransfer !== undefined, "transferChecked is inner of transferRemote");
  });

  await run("Hyperlane Mailbox dispatch is nested under transferRemote", async () => {
    const bridgeIx = bridgeTx.instructions.find((ix) => ix.type === "transferRemote");
    assert(bridgeIx !== undefined, "found transferRemote");
    const mailboxCpi = bridgeIx!.innerInstructions?.find((ix) =>
      ix.programName.includes("Hyperlane Mailbox")
    );
    assert(mailboxCpi !== undefined, "Mailbox CPI is inner of transferRemote");
  });

  console.log();

  // ── Sync parse path ──
  console.log("[parseTxResponse]");
  await run("parseTxResponse preserves hierarchy", async () => {
    const resp = await sol.getTransaction(BRIDGE_TX_SOLANA, {
      maxSupportedTransactionVersion: 0,
    });
    assert(resp !== null, "tx fetched");
    const parsed = parseTxResponse(resp!);
    const bridgeIx = parsed.instructions.find((ix) => ix.type === "transferRemote");
    assert(bridgeIx?.innerInstructions, "hierarchy preserved");
    assert(bridgeIx!.innerInstructions!.length > 0, "has inner ixs");
  });

  console.log();

  // ── Formatter renders tree ──
  console.log("[formatParsedTx]");
  await run("formatParsedTx renders nested tree with indentation", async () => {
    const text = formatParsedTx(bridgeTx);
    assert(text.includes("SUCCESS"), "status line");
    assert(text.includes("transferRemote"), "bridge ix line");
    // Inner ixs use "↳" marker
    assert(text.includes("↳"), "inner ix marker present");

    // Print a preview for visual confirmation
    console.log();
    console.log(text.split("\n").map((l) => "      " + l).join("\n"));
    console.log();
  });

  // ── Batch parser ──
  console.log("[parseTxsFromHashes]");
  await run("parseTxsFromHashes (batch, real sigs)", async () => {
    // Use Nara RPC — its getSignaturesForAddress + getTransactions are not rate-limited.
    const sigInfos = await nara.getSignaturesForAddress(NARA_MAILBOX, { limit: 10 });
    const realSigs = sigInfos.filter((s) => !s.err).slice(0, 3).map((s) => s.signature);
    assert(realSigs.length >= 1, "at least one Nara Mailbox tx available");
    console.log(`    fetched ${realSigs.length} real signatures`);

    const batch = await parseTxsFromHashes(nara, realSigs);
    assert(batch.length === realSigs.length, "result length == input length");

    for (let i = 0; i < realSigs.length; i++) {
      assert(batch[i] !== null, `[${i}] found`);
      assert(batch[i]!.signature === realSigs[i], `[${i}] signature matches input`);
      assert(Array.isArray(batch[i]!.instructions), `[${i}] has instructions array`);
    }
  });

  await run("parseTxsFromHashes result matches single-fetch result", async () => {
    // Single-fetch one Nara tx, then batch-fetch the same one, compare shape
    const sigInfos = await nara.getSignaturesForAddress(NARA_MAILBOX, { limit: 10 });
    const target = sigInfos.find((s) => !s.err)?.signature;
    assert(target, "found target sig");

    const single = await parseTxFromHash(nara, target!);
    const batch = await parseTxsFromHashes(nara, [target!]);

    assert(batch[0] !== null, "batch returned tx");
    assert(batch[0]!.signature === single.signature, "signatures match");
    assert(
      batch[0]!.instructions.length === single.instructions.length,
      "top-level ix count matches"
    );
    assert(
      countAll(batch[0]!.instructions) === countAll(single.instructions),
      "total ix count (incl. inner) matches"
    );
  });

  await run("parseTxsFromHashes empty array returns empty", async () => {
    const r = await parseTxsFromHashes(nara, []);
    assert(Array.isArray(r), "array");
    assert(r.length === 0, "empty");
  });

  console.log();

  // ── Summary ──
  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;
  const totalMs = results.reduce((s, r) => s + r.ms, 0);

  console.log("─".repeat(60));
  console.log(
    `Total: ${results.length}   Passed: ${passed}   Failed: ${failed}   Time: ${totalMs}ms`
  );

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
