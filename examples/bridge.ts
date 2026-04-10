/**
 * Test: bridge USDC or SOL cross-chain (same recipient).
 *
 * Usage:
 *   tsx examples/bridge.ts [direction] [token]
 *
 * Examples:
 *   tsx examples/bridge.ts solana-nara USDC   # 0.01 USDC
 *   tsx examples/bridge.ts nara-solana USDC   # 0.001 USDC
 *   tsx examples/bridge.ts solana-nara SOL    # 0.001 SOL
 *   tsx examples/bridge.ts nara-solana SOL    # 0.001 SOL
 */

import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import bs58 from "bs58";
import {
  bridgeTransfer,
  BRIDGE_TOKENS,
  setAltAddress,
  DEFAULT_BRIDGE_FEE_BPS,
  DEFAULT_BRIDGE_FEE_RECIPIENT,
  type BridgeChain,
  type BridgeTokenConfig,
} from "../index";

// ─── Config ───────────────────────────────────────────────────────

const PRIVATE_KEY =
  "3kLdubNYrvGeDH3ETaXQZnMcG4uJPgRXsnkh22YqyVZKtDbgn5QXdcWeuS7zvhfq6Nw2SY7maTukkBwTn98Bv486";

const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";
const NARA_RPC = process.env.NARA_RPC || "https://mainnet-api.nara.build/";

type Direction = "solana-nara" | "nara-solana";

const directionArg = (process.argv[2] || "solana-nara") as Direction;
if (directionArg !== "solana-nara" && directionArg !== "nara-solana") {
  throw new Error(`Invalid direction: ${directionArg}`);
}

const tokenArg = (process.argv[3] || "USDC").toUpperCase();
if (!BRIDGE_TOKENS[tokenArg]) {
  throw new Error(`Unknown token: ${tokenArg}. Available: ${Object.keys(BRIDGE_TOKENS).join(", ")}`);
}
const tokenCfg: BridgeTokenConfig = BRIDGE_TOKENS[tokenArg]!;

// Default amounts (raw units)
function defaultAmount(token: string, direction: Direction): bigint {
  if (token === "USDC") {
    return direction === "solana-nara" ? 10_000n : 1_000n; // 0.01 or 0.001 USDC
  }
  if (token === "SOL") {
    return 1_000_000n; // 0.001 SOL (9 decimals)
  }
  throw new Error(`No default amount for ${token}`);
}

const AMOUNT: bigint = defaultAmount(tokenArg, directionArg);

// ─── Helpers ──────────────────────────────────────────────────────

function loadWallet(): Keypair {
  return Keypair.fromSecretKey(bs58.decode(PRIVATE_KEY));
}

function fmtAmount(raw: bigint | number | null, decimals: number, symbol: string): string {
  if (raw == null) return "—";
  const v = typeof raw === "bigint" ? raw : BigInt(raw);
  const d = BigInt(10) ** BigInt(decimals);
  const whole = v / d;
  const frac = (v % d).toString().padStart(decimals, "0");
  return `${whole}.${frac} ${symbol}`;
}

async function getBridgeBalance(
  conn: Connection,
  owner: PublicKey,
  chain: BridgeChain,
  token: BridgeTokenConfig
): Promise<bigint | null> {
  const side = token[chain];
  if (side.mode === "native") {
    // Native SOL on Solana: use raw lamports balance
    const lamports = await conn.getBalance(owner, "confirmed");
    return BigInt(lamports);
  }
  // SPL token (collateral or synthetic)
  if (!side.mint || !side.tokenProgram) return null;
  const ata = getAssociatedTokenAddressSync(side.mint, owner, false, side.tokenProgram);
  try {
    const bal = await conn.getTokenAccountBalance(ata, "confirmed");
    return BigInt(bal.value.amount);
  } catch {
    return null;
  }
}

// ─── Main ─────────────────────────────────────────────────────────

async function main() {
  const wallet = loadWallet();
  const solanaConn = new Connection(SOLANA_RPC, "confirmed");
  const naraConn = new Connection(NARA_RPC, "confirmed");

  const fromChain: BridgeChain = directionArg === "solana-nara" ? "solana" : "nara";
  const toChain: BridgeChain = fromChain === "solana" ? "nara" : "solana";

  const sourceConn = fromChain === "solana" ? solanaConn : naraConn;
  const destConn = toChain === "solana" ? solanaConn : naraConn;
  const decimals = tokenCfg.decimals;

  console.log(`=== Bridge Test: ${tokenArg} ${fromChain} → ${toChain} ===\n`);
  console.log(`Wallet:         ${wallet.publicKey.toBase58()}`);
  console.log(`Solana RPC:     ${SOLANA_RPC}`);
  console.log(`Nara RPC:       ${NARA_RPC}`);
  console.log(`Token:          ${tokenArg} (${decimals} decimals)`);
  console.log(`From side mode: ${tokenCfg[fromChain].mode}`);
  console.log(`To side mode:   ${tokenCfg[toChain].mode}`);
  console.log(`Fee BPS:        ${DEFAULT_BRIDGE_FEE_BPS} (${DEFAULT_BRIDGE_FEE_BPS / 100}%)`);
  console.log(`Fee recipient:  ${DEFAULT_BRIDGE_FEE_RECIPIENT}`);
  console.log();

  // --- Step 1: source balance ---
  const sourceBalBefore = await getBridgeBalance(sourceConn, wallet.publicKey, fromChain, tokenCfg);
  // Also show native balance (for gas/rent visibility)
  const sourceNativeBal = await sourceConn.getBalance(wallet.publicKey, "confirmed");
  console.log(`--- Source (${fromChain}) ---`);
  console.log(
    `Native balance: ${(sourceNativeBal / 1e9).toFixed(6)} ${fromChain === "solana" ? "SOL" : "NARA"}`
  );
  console.log(`${tokenArg} balance:   ${fmtAmount(sourceBalBefore, decimals, tokenArg)}`);

  if (sourceBalBefore == null) {
    throw new Error(`Source (${fromChain}) ${tokenArg} balance not available`);
  }
  if (sourceBalBefore < AMOUNT) {
    throw new Error(
      `Insufficient ${tokenArg}: have ${fmtAmount(sourceBalBefore, decimals, tokenArg)}, need ${fmtAmount(AMOUNT, decimals, tokenArg)}`
    );
  }
  console.log();

  // --- Step 2: dest balance (before) ---
  const destBalBefore = await getBridgeBalance(destConn, wallet.publicKey, toChain, tokenCfg);
  console.log(`--- Destination (${toChain}) ---`);
  console.log(`${tokenArg} balance:   ${fmtAmount(destBalBefore, decimals, tokenArg)} (before)`);
  console.log();

  // --- Step 3: send bridge tx ---
  // For Solana-side dispatch, disable Nara ALT (that ALT doesn't exist on Solana).
  if (fromChain === "solana") {
    setAltAddress(null);
  }

  console.log(`--- Bridging ${fmtAmount(AMOUNT, decimals, tokenArg)} ---`);
  const result = await bridgeTransfer(
    sourceConn,
    wallet,
    {
      token: tokenArg,
      fromChain,
      recipient: wallet.publicKey, // same address on destination
      amount: AMOUNT,
    },
    {
      computeUnitLimit: 600_000,
    }
  );

  console.log(`Signature:      ${result.signature}`);
  console.log(`Message ID:     ${result.messageId ?? "(not yet in log)"}`);
  console.log(`Fee deducted:   ${fmtAmount(result.feeAmount, decimals, tokenArg)}`);
  console.log(`Bridge amount:  ${fmtAmount(result.bridgeAmount, decimals, tokenArg)}`);
  console.log();

  // --- Step 4: poll dest side ---
  console.log(`--- Waiting for delivery on ${toChain} (up to 3 min) ---`);
  const targetBefore = destBalBefore ?? 0n;
  const deadline = Date.now() + 3 * 60 * 1000;
  let delivered: bigint | null = null;

  while (Date.now() < deadline) {
    const bal = await getBridgeBalance(destConn, wallet.publicKey, toChain, tokenCfg);
    if (bal != null && bal > targetBefore) {
      delivered = bal;
      break;
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 5000));
  }
  console.log();

  if (delivered == null) {
    console.log("⚠ Bridge not yet delivered within timeout.");
    console.log(`  Use message ID '${result.messageId}' to track status.`);
    process.exit(2);
  }

  const received = delivered - targetBefore;
  console.log(`✓ ${toChain} ${tokenArg}: ${fmtAmount(delivered, decimals, tokenArg)} (after)`);
  console.log(`  Received:     ${fmtAmount(received, decimals, tokenArg)}`);

  if (received !== result.bridgeAmount) {
    console.log(
      `⚠ Received amount ${fmtAmount(received, decimals, tokenArg)} != expected ${fmtAmount(result.bridgeAmount, decimals, tokenArg)}`
    );
  } else {
    console.log("✓ Amount matches expected bridgeAmount.");
  }
}

main().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
