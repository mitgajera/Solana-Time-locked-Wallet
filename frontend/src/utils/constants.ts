import { PublicKey } from '@solana/web3.js';

// Update these with your actual program details
export const PROGRAM_CONFIG = {
  // Replace with your deployed program ID
  PROGRAM_ID: 'YOUR_PROGRAM_ID_HERE',
  
  // Devnet RPC endpoint
  RPC_ENDPOINT: 'https://api.devnet.solana.com',
  
  // Network
  NETWORK: 'devnet' as const,
};

// Helper function to validate program ID
export function validateProgramId(programId: string): boolean {
  try {
    new PublicKey(programId);
    return true;
  } catch {
    return false;
  }
}