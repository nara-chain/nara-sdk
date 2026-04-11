/**
 * SDK default constants
 */

/**
 * Default RPC URL for Nara mainnet
 */
export const DEFAULT_RPC_URL =
  process.env.RPC_URL || "https://mainnet-api.nara.build/";

/**
 * Default quest relay URL
 */
export const DEFAULT_QUEST_RELAY_URL =
  process.env.QUEST_RELAY_URL || "https://quest-api.nara.build/";

/**
 * Quest program ID
 */
export const DEFAULT_QUEST_PROGRAM_ID =
  process.env.QUEST_PROGRAM_ID || "Quest11111111111111111111111111111111111111";

/**
 * Skills Hub program ID
 */
export const DEFAULT_SKILLS_PROGRAM_ID =
  process.env.SKILLS_PROGRAM_ID || "SkiLLHub11111111111111111111111111111111111";

/**
 * ZK ID program ID
 */
export const DEFAULT_ZKID_PROGRAM_ID =
  process.env.ZKID_PROGRAM_ID || "ZKidentity111111111111111111111111111111111";

/**
 * Agent Registry program ID
 */
export const DEFAULT_AGENT_REGISTRY_PROGRAM_ID =
  process.env.AGENT_REGISTRY_PROGRAM_ID || "AgentRegistry111111111111111111111111111111";

/**
 * Address Lookup Table addresses for transaction optimization.
 * Supports comma-separated list for multiple ALTs.
 * When set, all SDK transactions use VersionedTransaction with these ALTs.
 * When empty, uses legacy transactions.
 */
export const DEFAULT_ALT_ADDRESS = process.env.ALT_ADDRESS || "3uw7RatGTB4hdHnuVLXjsqcMZ87zXsMSc3XbyoPA8mB7";

/**
 * Bridge fee in basis points (1 bps = 0.01%). 50 = 0.5%.
 * Deducted from the bridged amount and transferred to the chain-specific
 * fee recipient in the same transaction.
 */
export const DEFAULT_BRIDGE_FEE_BPS = 50;

/** BPS denominator (10000 = 100%) */
export const BRIDGE_FEE_BPS_DENOMINATOR = 10000;

/**
 * Default fee recipient pubkey on Solana (when bridging FROM Solana).
 * Override at runtime via setBridgeFeeRecipient("solana", ...).
 */
export const DEFAULT_BRIDGE_FEE_RECIPIENT_SOLANA =
  "HaPQTvGJBunoWA3AyyWRL9etVEbQWsXVoj3fHpBprLy5";

/**
 * Default fee recipient pubkey on Nara (when bridging FROM Nara).
 * Override at runtime via setBridgeFeeRecipient("nara", ...).
 */
export const DEFAULT_BRIDGE_FEE_RECIPIENT_NARA =
  "FERLFwBpCyoEuvFP68eP6Fv4FCVocnNyyFUCYwpfmjqn";
