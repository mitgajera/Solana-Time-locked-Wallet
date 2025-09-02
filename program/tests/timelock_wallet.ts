import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

// Types from generated IDL after build
// import { TimelockWallet } from "../target/types/timelock_wallet";

describe("timelock (SOL)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.TimelockWallet as Program<any>;

  it("initializes and withdraws after unlock", async () => {
    const wallet = provider.wallet as anchor.Wallet;
    const recipient = wallet.publicKey; // self for test
    const unlockTs = Math.floor(Date.now() / 1000) + 3; // 3 sec in future

    const [timelockPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("timelock"),
        wallet.publicKey.toBuffer(),
        recipient.toBuffer(),
        Buffer.from(new anchor.BN(unlockTs).toArray("le", 8)),
      ],
      program.programId
    );

    const amount = 0.01 * LAMPORTS_PER_SOL;

    await program.methods
      .initializeLock(new anchor.BN(amount), new anchor.BN(unlockTs))
      .accounts({
        initializer: wallet.publicKey,
        recipient,
        timelock: timelockPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const acct = await program.account.timeLock.fetch(timelockPda) as { amount: anchor.BN };
    assert.ok(acct.amount.toNumber() === amount);

    // wait until unlock
    await new Promise((res) => setTimeout(res, 3500));

    await program.methods
      .withdraw()
      .accounts({
        caller: wallet.publicKey,
        timelock: timelockPda,
        ownerRefund: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  });
});
