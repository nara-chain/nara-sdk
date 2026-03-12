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
export const DEFAULT_ALT_ADDRESS = process.env.ALT_ADDRESS || "G3vhs4TbRpuXt3coHzXpuiTnq15rnVehr5bRVR18Y5Ku";
