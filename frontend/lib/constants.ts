// Solana Time-Locked Wallet Program Configuration
export const PROGRAM_ID = "81YhjpVcTKih7aR8ruyHW9m5cmD6SskiJtwGj4sGFGgy";

// Solana Network Configuration
export const SOLANA_NETWORK = "devnet";

// RPC Endpoints
export const RPC_ENDPOINTS = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
};

// Token Mints
export const TOKEN_MINTS = {
  SOL: null, // Native SOL
  USDC: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU", // Devnet USDC
};

// Minimum amounts
export const MINIMUM_AMOUNTS = {
  SOL: 0.001, // 0.001 SOL in SOL
  USDC: 0.01, // 0.01 USDC
};

// Duration options in seconds
export const DURATION_OPTIONS = {
  minutes: 60,
  hours: 3600,
  days: 86400,
  weeks: 604800,
  months: 2592000, // 30 days
};
