import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { assert } from "chai";

// Import the generated IDL types
import { TimelockWallet } from "../target/types/timelock_wallet";

describe("timelock (SOL)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Use the deployed program ID
  const programId = new PublicKey("84reSFSeFi5wL2TJZQHjp4NkcPx8kWkLc7k9XeG3wrpB");
  const program = new anchor.Program<TimelockWallet>(
    require("../target/idl/timelock_wallet.json"),
    programId,
    provider
  ) as unknown as Program<TimelockWallet>;

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

    const amount = Math.floor(0.01 * LAMPORTS_PER_SOL);

    console.log("Initializing SOL lock...");
    await program.methods
      .initializeLock(new anchor.BN(amount), new anchor.BN(unlockTs))
      .accounts({
        initializer: wallet.publicKey,
        recipient,
        timelock: timelockPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("SOL lock initialized successfully");

    const acct = await (program.account as any).timeLock.fetch(timelockPda);
    assert.strictEqual(acct.amount.toNumber(), amount, "Amount should match");
    console.log(`Locked amount: ${acct.amount.toNumber() / LAMPORTS_PER_SOL} SOL`);

    // wait until unlock
    console.log("Waiting for unlock time...");
    await new Promise((res) => setTimeout(res, 3500));

    console.log("Withdrawing SOL...");
    await program.methods
      .withdraw()
      .accounts({
        caller: wallet.publicKey,
        timelock: timelockPda,
        ownerRefund: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("SOL withdrawn successfully");

    // ✅ Account remains allocated, but amount should be zero
    const acctAfter = await (program.account as any).timeLock.fetch(timelockPda);
    assert.strictEqual(acctAfter.amount.toNumber(), 0, "Timelock amount should be zero after withdraw");
    console.log("Amount cleared; account still allocated (expected).");
  });
});

describe("timelock (SPL Token)", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const programId = new PublicKey("84reSFSeFi5wL2TJZQHjp4NkcPx8kWkLc7k9XeG3wrpB");
  const program = new anchor.Program<TimelockWallet>(
    require("../target/idl/timelock_wallet.json"),
    programId,
    provider
  ) as unknown as Program<TimelockWallet>;

  it("initializes SPL token lock (structure only)", async () => {
    const wallet = provider.wallet as anchor.Wallet;
    const recipient = wallet.publicKey;
    const unlockTs = Math.floor(Date.now() / 1000) + 5; // 5 sec in future

    const [timelockPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("timelock"),
        wallet.publicKey.toBuffer(),
        recipient.toBuffer(),
        Buffer.from(new anchor.BN(unlockTs).toArray("le", 8)),
      ],
      program.programId
    );

    // In a real SPL test you'd mint test tokens, create ATAs, and call initialize_lock_spl.
    console.log("SPL token lock test - instruction PDA computed.");
    console.log(`Timelock PDA: ${timelockPda.toString()}`);
    console.log(`Unlock timestamp: ${unlockTs}`);
  });
});
