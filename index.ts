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
  DEFAULT_ALT_ADDRESS,
  DEFAULT_BRIDGE_FEE_BPS,
  DEFAULT_BRIDGE_FEE_RECIPIENT_SOLANA,
  DEFAULT_BRIDGE_FEE_RECIPIENT_NARA,
  BRIDGE_FEE_BPS_DENOMINATOR,
} from "./src/constants";

// Export signing utilities
export { signParams, signUrl } from "./src/sign";

// Export transaction helper
export { sendTx, setAltAddress, getAltAddress, getRecentPriorityFee, setSkipPreflight, getSkipPreflight } from "./src/tx";

// Export quest functions and types
export {
  getQuestInfo,
  hasAnswered,
  generateProof,
  submitAnswer,
  submitAnswerViaRelay,
  parseQuestReward,
  computeAnswerHash,
  makeCreateQuestionIx,
  createQuestion,
  stake,
  unstake,
  getStakeInfo,
  initializeQuest,
  setRewardConfig,
  setStakeConfig,
  transferQuestAuthority,
  setQuestAuthority,
  setQuestInterval,
  setRewardPerShare,
  setStakeAuthority,
  makeAdjustFreeStakeIx,
  adjustFreeStake,
  claimAirdrop,
  setAirdropConfig,
  getQuestConfig,
  type QuestInfo,
  type StakeInfo,
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
  getConfig as getSkillsConfig,
  initConfig as initSkillsConfig,
  updateAdmin as updateSkillsAdmin,
  withdrawFees as withdrawSkillsFees,
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
  makeWithdrawIx,
  deriveIdSecret,
  computeIdCommitment,
  isValidRecipient,
  generateValidRecipient,
  getConfig as getZkIdConfig,
  initializeConfig as initZkIdConfig,
  updateConfig as updateZkIdConfig,
  withdrawFees as withdrawZkIdFees,
  ZKID_DENOMINATIONS,
  type ZkIdInfo,
  type ClaimableDeposit,
  type ZkIdOptions,
} from "./src/zkid";

// Export agent registry functions and types
export {
  makeRegisterAgentIx,
  makeRegisterAgentWithReferralIx,
  makeSetTwitterIx,
  makeSubmitTweetIx,
  registerAgent,
  registerAgentWithReferral,
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
  logActivityWithReferral,
  makeLogActivityIx,
  makeLogActivityWithReferralIx,
  setReferral,
  // Twitter verification
  getAgentTwitter,
  getTweetVerify,
  getTweetRecord,
  getPendingTwitterVerifications,
  getPendingTweetVerifications,
  setTwitter,
  submitTweet,
  unbindTwitter,
  verifyTwitter,
  rejectTwitter,
  approveRejectedTwitter,
  approveTweet,
  rejectTweet,
  // Admin
  initConfig as initAgentRegistryConfig,
  updateAdmin,
  withdrawFees as withdrawAgentRegistryFees,
  updateRegisterFee,
  updatePointsConfig,
  updateReferralConfig,
  updateActivityConfig,
  expandConfig,
  updateTwitterVerifier,
  updateTwitterVerificationConfig,
  updateTweetVerifyConfig,
  withdrawTwitterVerifyFees,
  type AgentRecord,
  type AgentInfo,
  type AgentTwitterInfo,
  type TweetVerifyInfo,
  type TweetRecordInfo,
  type MemoryMode,
  type AgentRegistryOptions,
} from "./src/agent_registry";

// Export bridge functions and types
export {
  // Constants
  SOLANA_DOMAIN,
  NARA_DOMAIN,
  SOLANA_MAILBOX,
  NARA_MAILBOX,
  SPL_NOOP,
  SOLANA_USDC_MINT,
  NARA_USDC_MINT,
  SOLANA_USDT_MINT,
  NARA_USDT_MINT,
  NARA_SOL_MINT,
  BRIDGE_TOKENS,
  // Token registry
  registerBridgeToken,
  // Fee recipient runtime override
  setBridgeFeeRecipient,
  getBridgeFeeRecipient,
  // PDA helpers
  deriveOutboxPda,
  deriveDispatchAuthorityPda,
  deriveDispatchedMessagePda,
  deriveTokenPda,
  deriveEscrowPda,
  deriveNativeCollateralPda,
  // Encoders
  encodeTransferRemote,
  // Fee + ix builders
  calculateBridgeFee,
  makeBridgeFeeIxs,
  makeTransferRemoteIx,
  makeBridgeIxs,
  // High level
  bridgeTransfer,
  extractMessageId,
  queryMessageStatus,
  queryMessageSignatures,
  type BridgeChain,
  type BridgeMode,
  type BridgeTokenSide,
  type BridgeTokenConfig,
  type BridgeTransferParams,
  type BridgeIxsResult,
  type BridgeTransferResult,
  type FeeSplit,
  type MessageStatus,
  type ValidatorSignature,
  type MessageSignatureStatus,
} from "./src/bridge";

// Export transaction parser
export {
  parseTxFromHash,
  parseTxResponse,
  formatParsedTx,
  type ParsedInstruction,
  type ParsedTransaction,
} from "./src/tx_parser";

// Export IDLs and types
export { default as NaraQuestIDL } from "./src/idls/nara_quest.json";
export { default as NaraSkillsHubIDL } from "./src/idls/nara_skills_hub.json";
export { default as NaraZkIDL } from "./src/idls/nara_zk.json";
export { default as NaraAgentRegistryIDL } from "./src/idls/nara_agent_registry.json";
export type { NaraQuest } from "./src/idls/nara_quest";
export type { NaraSkillsHub } from "./src/idls/nara_skills_hub";
export type { NaraZk } from "./src/idls/nara_zk";
export type { NaraAgentRegistry } from "./src/idls/nara_agent_registry";

// Re-export commonly used types from dependencies
export { PublicKey, Keypair, Transaction } from "@solana/web3.js";
export { default as BN } from "bn.js";
