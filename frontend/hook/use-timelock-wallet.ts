import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useCallback, useState } from "react";
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
  VersionedTransaction
} from "@solana/web3.js";
import { 
  PROGRAM_ID, 
  TOKEN_MINTS, 
  DURATION_OPTIONS,
  MINIMUM_AMOUNTS 
} from "@/lib/constants";
import { IDL } from "@/lib/idl";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";

export interface TimelockInfo {
  creator: PublicKey;
  recipient: PublicKey;
  amount: number;
  unlockTimestamp: number;
  createdAt: number;
  isWithdrawn: boolean;
  isUnlocked: boolean;
  timeRemaining: number;
  tokenMint: PublicKey | null;
  publicKey: string; 
}

export const useTimelockWallet = () => {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create Anchor provider and program instance
  const getProgram = useCallback(() => {
    if (!publicKey) return null;
    
    try {
      const provider = new AnchorProvider(
        connection,
        {
          publicKey,
          signTransaction: async <T extends Transaction | VersionedTransaction>(tx: T): Promise<T> => {
            // This will be handled by the wallet adapter
            return tx;
          },
          signAllTransactions: async <T extends Transaction | VersionedTransaction>(txs: T[]): Promise<T[]> => {
            // This will be handled by the wallet adapter
            return txs;
          },
        },
        { commitment: "confirmed" }
      );

      return new Program(IDL as any, provider);
    } catch (error) {
      console.error("Failed to create program:", error);
      return null;
    }
  }, [connection, publicKey]);

  // Create SOL timelock
  const createSollock = useCallback(async (
    amount: number,
    duration: number,
    durationType: keyof typeof DURATION_OPTIONS,
    recipient?: PublicKey
  ) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      // Comprehensive validation
      if (!publicKey.toBuffer || typeof publicKey.toBuffer !== 'function') {
        throw new Error("Invalid public key - missing toBuffer method");
      }

      if (!publicKey.toBytes || typeof publicKey.toBytes !== 'function') {
        throw new Error("Invalid public key - missing toBytes method");
      }

      const amountInLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const unlockTimestamp = Math.floor(Date.now() / 1000) + (duration * DURATION_OPTIONS[durationType]);

      // Validate minimum amount
      if (amount < MINIMUM_AMOUNTS.SOL) {
        throw new Error(`Minimum amount is ${MINIMUM_AMOUNTS.SOL} SOL`);
      }

      // Validate duration
      if (duration <= 0) {
        throw new Error("Duration must be greater than 0");
      }

      // Validate unlock timestamp
      if (unlockTimestamp <= Math.floor(Date.now() / 1000)) {
        throw new Error("Unlock timestamp must be in the future");
      }

      // Create PDA for timelock account with error handling
      let timelockAccount: PublicKey;
      try {
        const [pda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("timelock"),
            publicKey.toBuffer(),
            new BN(unlockTimestamp).toArrayLike(Buffer, "le", 8)
          ],
          new PublicKey(PROGRAM_ID)
        );
        timelockAccount = pda;
      } catch (pdaError) {
        console.error("PDA creation error:", pdaError);
        throw new Error("Failed to create program derived address");
      }

      const program = getProgram();
      if (!program) {
        throw new Error("Failed to initialize program");
      }

      // Create instruction using Anchor program
      let instruction;
      try {
        instruction = await program.methods
          .initializeLock(
            new BN(amountInLamports),
            new BN(unlockTimestamp),
            recipient || null
          )
          .accounts({
            creator: publicKey,
            timelockAccount,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
      } catch (instructionError) {
        console.error("Instruction creation error:", instructionError);
        throw new Error(`Failed to create instruction: ${instructionError instanceof Error ? instructionError.message : 'Unknown error'}`);
      }

      if (!instruction) {
        throw new Error("Failed to create instruction");
      }

      // Create and send transaction with better error handling
      try {
        const transaction = new Transaction();
        transaction.add(instruction);
        
        // Set recent blockhash
        const { blockhash } = await connection.getLatestBlockhash();
        transaction.recentBlockhash = blockhash;
        transaction.feePayer = publicKey;

        console.log("Transaction created:", {
          instructionCount: transaction.instructions.length,
          blockhash,
          feePayer: publicKey.toString()
        });

        const signature = await sendTransaction(transaction, connection);
        console.log("Transaction sent, signature:", signature);
        
        // Wait for confirmation
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        console.log("Transaction confirmed:", confirmation);

        return {
          signature,
          timelockAccount: timelockAccount.toString(),
          unlockTimestamp,
        };
      } catch (transactionError) {
        console.error("Transaction error:", transactionError);
        throw new Error(`Transaction failed: ${transactionError instanceof Error ? transactionError.message : 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Error in createSollock:", err);
      setError(err instanceof Error ? err.message : "Failed to create timelock");
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, getProgram]);

  // Create token timelock (USDC)
  const createTokenLock = useCallback(async (
    amount: number,
    duration: number,
    durationType: keyof typeof DURATION_OPTIONS,
    tokenType: "USDC",
    recipient?: PublicKey
  ) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const unlockTimestamp = Math.floor(Date.now() / 1000) + (duration * DURATION_OPTIONS[durationType]);

      // Validate minimum amount
      if (amount < MINIMUM_AMOUNTS.USDC) {
        throw new Error(`Minimum amount is ${MINIMUM_AMOUNTS.USDC} USDC`);
      }

      // Validate publicKey has valid buffer
      if (!publicKey.toBuffer || typeof publicKey.toBuffer !== 'function') {
        throw new Error("Invalid public key");
      }

      // Get token mint
      const tokenMint = TOKEN_MINTS.USDC;
      if (!tokenMint) {
        throw new Error("USDC token mint not found");
      }

      // Create PDA for timelock account
      const [timelockAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("timelock"),
          publicKey.toBuffer(),
          new BN(unlockTimestamp).toArrayLike(Buffer, "le", 8)
        ],
        new PublicKey(PROGRAM_ID)
      );

      // Create PDA for token account
      const [timelockTokenAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("token_account"),
          timelockAccount.toBuffer(),
        ],
        new PublicKey(PROGRAM_ID)
      );

      const program = getProgram();
      if (!program) {
        throw new Error("Failed to initialize program");
      }

      // Note: You'll need to get the actual creator token account and recipient token account
      // This is a simplified version - you'll need to implement the full token transfer logic
      
      return {
        timelockAccount: timelockAccount.toString(),
        timelockTokenAccount: timelockTokenAccount.toString(),
        unlockTimestamp,
      };
    } catch (err) {
      console.error("Error in createTokenLock:", err);
      setError(err instanceof Error ? err.message : "Failed to create token timelock");
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, getProgram]);

  // Get timelock info
  const getTimelockInfo = useCallback(async (timelockAccount: string): Promise<TimelockInfo | null> => {
    try {
      const program = getProgram();
      if (!program) {
        throw new Error("Failed to initialize program");
      }

      // Note: The exact account name depends on your IDL structure
      // You may need to adjust this based on your actual IDL
      const accountInfo = await (program as any).account.timelockAccount.fetch(new PublicKey(timelockAccount));
      if (!accountInfo) {
        return null;
      }

      const clock = await connection.getSlot();
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const isUnlocked = currentTimestamp >= accountInfo.unlockTimestamp.toNumber();
      const timeRemaining = isUnlocked ? 0 : accountInfo.unlockTimestamp.toNumber() - currentTimestamp;

      return {
        creator: accountInfo.creator,
        recipient: accountInfo.recipient,
        amount: accountInfo.amount.toNumber() / LAMPORTS_PER_SOL,
        unlockTimestamp: accountInfo.unlockTimestamp.toNumber(),
        createdAt: accountInfo.createdAt.toNumber(),
        isWithdrawn: accountInfo.isWithdrawn,
        isUnlocked,
        timeRemaining,
        tokenMint: accountInfo.tokenMint,
        publicKey: timelockAccount, // Add public key for reference
      };
    } catch (err) {
      setError("Failed to get timelock info");
      return null;
    }
  }, [connection, getProgram]);

  // Withdraw from timelock
  const withdraw = useCallback(async (timelockAccount: string) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const program = getProgram();
      if (!program) {
        throw new Error("Failed to initialize program");
      }

      // Get account info to check if it's a token account
      const accountInfo = await (program as any).account.timelockAccount.fetch(new PublicKey(timelockAccount));
      
      if (accountInfo.tokenMint) {
        // This is a token account, use withdraw_token
        throw new Error("This is a token timelock, use withdrawToken instead");
      }

      // Create withdraw instruction
      const instruction = await program.methods
        .withdraw()
        .accounts({
          recipient: publicKey,
          timelockAccount: new PublicKey(timelockAccount),
        })
        .instruction();

      const transaction = new Transaction().add(instruction);
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature);

      return { success: true, signature };
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to withdraw");
      return null;
    } finally {
      setLoading(false);
    }
  }, [publicKey, sendTransaction, connection, getProgram]);

  // Get all timelock accounts for the current user
  const getUserTimelocks = useCallback(async (): Promise<TimelockInfo[]> => {
    if (!publicKey) {
      return [];
    }

    try {
      const program = getProgram();
      if (!program) {
        throw new Error("Failed to initialize program");
      }

      // Get all timelock accounts where the user is the creator
      const timelockAccounts = await (program as any).account.timelockAccount.all([
        {
          memcmp: {
            offset: 8, // Offset for creator field in the account data
            bytes: publicKey.toBase58(),
          },
        },
      ]);

      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      return timelockAccounts.map((account: any) => {
        const accountInfo = account.account;
        const isUnlocked = currentTimestamp >= accountInfo.unlockTimestamp.toNumber();
        const timeRemaining = isUnlocked ? 0 : accountInfo.unlockTimestamp.toNumber() - currentTimestamp;

        return {
          creator: accountInfo.creator,
          recipient: accountInfo.recipient,
          amount: accountInfo.amount.toNumber() / LAMPORTS_PER_SOL,
          unlockTimestamp: accountInfo.unlockTimestamp.toNumber(),
          createdAt: accountInfo.createdAt.toNumber(),
          isWithdrawn: accountInfo.isWithdrawn,
          isUnlocked,
          timeRemaining,
          tokenMint: accountInfo.tokenMint,
          publicKey: account.publicKey.toString(), // Add public key for reference
        };
      });
    } catch (err) {
      console.error("Failed to get user timelocks:", err);
      return [];
    }
  }, [publicKey, getProgram]);

  return {
    createSollock,
    createTokenLock,
    getTimelockInfo,
    getUserTimelocks,
    withdraw,
    loading,
    error,
    clearError: () => setError(null),
  };
};
