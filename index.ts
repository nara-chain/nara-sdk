/**
 * Nara SDK - SDK for the Nara chain (Solana-compatible)
 *
 * This SDK provides functions to interact with the Nara chain.
 */

// Export main client
export { NaraSDK, type NaraSDKConfig } from "./src/client";

// Export constants
export {
  DEFAULT_RPC_URL,
  DEFAULT_QUEST_PROGRAM_ID,
  DEFAULT_SKILLS_PROGRAM_ID,
  DEFAULT_ZKID_PROGRAM_ID,
  DEFAULT_AGENT_REGISTRY_PROGRAM_ID,
} from "./src/constants";

// Export quest functions and types
export {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  submitAnswerViaRelay,
  parseQuestReward,
  type QuestInfo,
  type ZkProof,
  type ZkProofHex,
  type SubmitAnswerResult,
  type SubmitRelayResult,
  type QuestOptions,
  type ActivityLog,
} from "./src/quest";

// Export skills functions and types
export {
  registerSkill,
  getSkillRecord,
  getSkillInfo,
  getSkillContent,
  setDescription,
  updateMetadata,
  uploadSkillContent,
  transferAuthority,
  closeBuffer,
  deleteSkill,
  initConfig as initSkillsConfig,
  updateAdmin as updateSkillsAdmin,
  updateFeeRecipient as updateSkillsFeeRecipient,
  updateRegisterFee as updateSkillsRegisterFee,
  type SkillRecord,
  type SkillInfo,
  type SkillOptions,
} from "./src/skills";

// Export zkid functions and types
export {
  createZkId,
  getZkIdInfo,
  deposit,
  scanClaimableDeposits,
  withdraw,
  transferZkId,
  transferZkIdByCommitment,
  deriveIdSecret,
  computeIdCommitment,
  isValidRecipient,
  generateValidRecipient,
  getConfig as getZkIdConfig,
  initializeConfig as initZkIdConfig,
  updateConfig as updateZkIdConfig,
  ZKID_DENOMINATIONS,
  type ZkIdInfo,
  type ClaimableDeposit,
  type ZkIdOptions,
} from "./src/zkid";

// Export agent registry functions and types
export {
  registerAgent,
  getAgentRecord,
  getAgentInfo,
  getAgentMemory,
  getConfig as getAgentRegistryConfig,
  setBio,
  setMetadata,
  uploadMemory,
  closeBuffer as closeAgentBuffer,
  transferAgentAuthority,
  deleteAgent,
  logActivity,
  makeLogActivityIx,
  initConfig as initAgentRegistryConfig,
  updateAdmin,
  updateFeeRecipient,
  updateRegisterFee,
  updatePointsConfig,
  type AgentRecord,
  type AgentInfo,
  type MemoryMode,
  type AgentRegistryOptions,
} from "./src/agent_registry";

// Re-export commonly used types from dependencies
export { PublicKey, Keypair, Transaction } from "@solana/web3.js";
export { default as BN } from "bn.js";
