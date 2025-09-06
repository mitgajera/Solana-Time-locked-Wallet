import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { Connection, PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { TimeLockWallet } from '../types/program';
import Idl from '../idl/timelock_wallet.json';
import * as anchor from '@coral-xyz/anchor';
export const PROGRAM_ID = new PublicKey('3Pe4uajDJG6aMN34GMmxTzhSUHEiUqUvV3tTSgjuJkMU');

export function getProgram(wallet: WalletContextState, connection: Connection) {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

    const provider = new AnchorProvider(
      connection,
      wallet as unknown as anchor.Wallet,
      { preflightCommitment: 'processed' }
    );
    anchor.setProvider(provider);

  return new Program(Idl, PROGRAM_ID, provider);
}

export function getWalletPDA(owner: PublicKey, seed: string) {
  return web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from('wallet'),
      owner.toBuffer(),
      Buffer.from(seed)
    ],
    PROGRAM_ID
  );
}

export async function createTimeLock(
  program: Program,
  amount: number,
  unlockDate: Date,
  recipient: PublicKey,
  seed: string
) {
  const [walletPDA] = getWalletPDA(program.provider.publicKey!, seed);
  
  const tx = await program.methods
    .initializeLock(
      new BN(amount * LAMPORTS_PER_SOL),
      new BN(unlockDate.getTime() / 1000)
    )
    .accounts({
      initializer: program.provider.publicKey!,
      recipient: recipient,
      timelock: walletPDA,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return { signature: tx, walletPDA };
}

export async function withdrawFunds(program: Program, walletPDA: PublicKey) {
  const tx = await program.methods
    .withdraw()
    .accounts({
      caller: program.provider.publicKey!,
      timelock: walletPDA,
      ownerRefund: program.provider.publicKey!,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  return tx;
}

export async function getTimeLockWallet(
  program: Program,
  walletPDA: PublicKey
): Promise<TimeLockWallet | null> {
  try {
    const account = await program.accounts.timelock.fetch(walletPDA);
    return {
      bump: account.bump,
      owner: account.owner.toString(),
      recipient: account.recipient.toString(),
      amount: account.amount.toString(),
      unlockTimestamp: account.unlockTs.toString(),
    };
  } catch (error) {
    console.error('Error fetching wallet:', error);
    return null;
  }
}