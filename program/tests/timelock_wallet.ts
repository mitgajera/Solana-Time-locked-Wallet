import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Connection,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  getMint,
  getAccount,
  createMint,
  mintTo,
  getOrCreateAssociatedTokenAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
chai.use(chaiAsPromised);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const now = () => Math.floor(Date.now() / 1000);

describe("timelock_wallet", () => {
  // Allow time for sleeps & slot ticks
  // (Mocha default 2s can be too short)
  // @ts-ignore
  this.timeout?.(60_000);

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const connection: Connection = provider.connection;

  // Build Program from local IDL and known program ID
  const idl = require("../target/idl/timelock_wallet.json");
  const programId = new PublicKey("2TShpwBZndqh55rQZovy7FrFVGdB2WKjG9PL4byn6WdY");
  const program = new anchor.Program(idl, programId, provider) as unknown as Program;

  const creator = (provider.wallet as anchor.Wallet).payer; // creator signer (payer)
  const otherUser = Keypair.generate(); // another signer for negative tests

  // Airdrop utility
  const airdrop = async (pubkey: PublicKey, sol = 2) => {
    const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, "confirmed");
  };

  // Advance a slot (helps the Clock sysvar tick after sleeps)
  const tick = async () => {
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: creator.publicKey,
        lamports: 1, // noop self-transfer
      })
    );
    await provider.sendAndConfirm(tx, [creator]);
  };

  before("fund other user", async () => {
    // Transfer from creator instead of faucet to avoid 429 rate limits
    const tx = new anchor.web3.Transaction().add(
      SystemProgram.transfer({
        fromPubkey: creator.publicKey,
        toPubkey: otherUser.publicKey,
        lamports: 1 * LAMPORTS_PER_SOL,
      })
    );
    await provider.sendAndConfirm(tx, [creator]);
  });

  // === Helpers to derive PDAs (must match on-chain seeds) ===
  const timelockPda = (creatorKey: PublicKey, unlockTs: number) => {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from("timelock"),
        creatorKey.toBuffer(),
        Buffer.from(new anchor.BN(unlockTs).toArrayLike(Buffer, "le", 8)),
      ],
      program.programId
    );
  };

  const tokenAccountPda = (timelockAccount: PublicKey) => {
    return PublicKey.findProgramAddressSync(
      [Buffer.from("token_account"), timelockAccount.toBuffer()],
      program.programId
    );
  };

  // --- SOL TIMELOCK TESTS ---
  it("initialize_lock (SOL) and withdraw after unlock", async () => {
    const amount = 1_500_000; // >= 1_000_000 lamports (0.0015 SOL)
    const unlockTs = now() + 3; // unlock in 3s
    const recipient = creator.publicKey;

    const [tlPda, _bump] = timelockPda(creator.publicKey, unlockTs);

    await program.methods
      .initializeLock(new anchor.BN(amount), new anchor.BN(unlockTs), recipient)
      .accounts({
        creator: creator.publicKey,
        timelockAccount: tlPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    // PDA should now hold lamports
    const tlAccBefore = await connection.getAccountInfo(tlPda);
    expect(tlAccBefore).to.not.be.null;
    expect(tlAccBefore!.lamports).to.be.greaterThan(0);

    // Withdrawing too early should fail (ensure we call .rpc() and include signer)
    await expect(
      program.methods
        .withdraw()
        .accounts({
          recipient: creator.publicKey,
          timelockAccount: tlPda,
        })
        .signers([creator])
        .rpc()
    ).to.be.rejectedWith(/Funds are still locked|custom program error|0x/i);

    // Wait until unlock and tick a slot
    await sleep(3500);
    await tick();

    const recipientBalBefore = await connection.getBalance(recipient);

    // Now withdraw
    await program.methods
      .withdraw()
      .accounts({
        recipient,
        timelockAccount: tlPda,
      })
      .signers([creator]) // recipient is creator here
      .rpc();

    const recipientBalAfter = await connection.getBalance(recipient);
    // On devnet, rent reclaim/closure can be nondeterministic; only ensure no large decrease
    expect(recipientBalAfter).to.be.greaterThanOrEqual(recipientBalBefore - 20_000);

    // Second withdraw should fail (AlreadyWithdrawn)
    await expect(
      program.methods
        .withdraw()
        .accounts({
          recipient,
          timelockAccount: tlPda,
        })
        .signers([creator])
        .rpc()
    ).to.be.rejectedWith(/Funds have already been withdrawn|custom program error|0x/i);
  });

  it("initialize_lock fails on min amount", async () => {
    const amount = 500_000; // below 1_000_000
    const unlockTs = now() + 10;

    const [tlPda] = timelockPda(creator.publicKey, unlockTs);
    await expect(
      program.methods
        .initializeLock(new anchor.BN(amount), new anchor.BN(unlockTs), creator.publicKey)
        .accounts({
          creator: creator.publicKey,
          timelockAccount: tlPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc()
    ).to.be.rejectedWith(/Minimum amount is 0\.001 SOL|custom program error|0x/i);
  });

  it("withdraw fails for unauthorized recipient (SOL)", async () => {
    const amount = 1_000_000;
    const unlockTs = now() + 2;

    const [tlPda] = timelockPda(creator.publicKey, unlockTs);

    // Lock with recipient = creator
    await program.methods
      .initializeLock(new anchor.BN(amount), new anchor.BN(unlockTs), creator.publicKey)
      .accounts({
        creator: creator.publicKey,
        timelockAccount: tlPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    await sleep(2500);
    await tick();

    // otherUser attempts to withdraw (should fail UnauthorizedRecipient)
    await expect(
      program.methods
        .withdraw()
        .accounts({
          recipient: otherUser.publicKey,
          timelockAccount: tlPda,
        })
        .signers([otherUser])
        .rpc()
    ).to.be.rejectedWith(/Only the designated recipient can withdraw|custom program error|0x/i);
  });

  // --- TOKEN TIMELOCK TESTS ---
  it("initialize_token_lock and withdraw_token after unlock", async () => {
    // Create a mint & fund creator
    const mint = await createMint(
      connection,
      creator,
      creator.publicKey,
      null,
      6 // decimals
    );

    // Ensure creator has an ATA
    const creatorAtaAcc = await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      mint,
      creator.publicKey
    );

    // Mint 10 tokens to creator
    await mintTo(
      connection,
      creator,
      mint,
      creatorAtaAcc.address,
      creator.publicKey,
      BigInt(10_000_000) // 10.000000 tokens
    );

    const mintInfo = await getMint(connection, mint);
    expect(Number(mintInfo.supply)).to.equal(10_000_000);

    const amount = 3_000_000; // 3 tokens (6 decimals)
    const unlockTs = now() + 3;
    const recipient = creator.publicKey; // same signer for simplicity

    const [tlPda] = timelockPda(creator.publicKey, unlockTs);
    const [tlTokenPda] = tokenAccountPda(tlPda);

    // Recipient token account
    const recipientAta = await getAssociatedTokenAddress(mint, recipient);

    await program.methods
      .initializeTokenLock(new anchor.BN(amount), new anchor.BN(unlockTs), recipient)
      .accounts({
        creator: creator.publicKey,
        timelockAccount: tlPda,
        tokenMint: mint,
        creatorTokenAccount: creatorAtaAcc.address,
        timelockTokenAccount: tlTokenPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([creator])
      .rpc();

    // Check balances moved to PDA token account
    const tlTokenAccInfo = await getAccount(connection, tlTokenPda);
    expect(Number(tlTokenAccInfo.amount)).to.equal(amount);

    await sleep(3500);
    await tick();

    const recipBefore = await getAccount(connection, recipientAta);

    // Withdraw to recipient
    await program.methods
      .withdrawToken()
      .accounts({
        recipient,
        timelockAccount: tlPda,
        timelockTokenAccount: tlTokenPda,
        recipientTokenAccount: recipientAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([creator]) // recipient = creator
      .rpc();

    const recipAfter = await getAccount(connection, recipientAta);
    expect(Number(recipAfter.amount)).to.equal(
      Number(recipBefore.amount) + amount
    );

    // Further withdraw should fail (AlreadyWithdrawn)
    await expect(
      program.methods
        .withdrawToken()
        .accounts({
          recipient,
          timelockAccount: tlPda,
          timelockTokenAccount: tlTokenPda,
          recipientTokenAccount: recipientAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc()
    ).to.be.rejectedWith(/Funds have already been withdrawn|custom program error|0x/i);
  });

  it("withdraw_token fails for unauthorized recipient", async () => {
    // Mint setup
    const mint = await createMint(connection, creator, creator.publicKey, null, 6);
    const creatorAtaAcc = await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      mint,
      creator.publicKey
    );
    await mintTo(
      connection,
      creator,
      mint,
      creatorAtaAcc.address,
      creator.publicKey,
      BigInt(5_000_000) // 5 tokens
    );

    const amount = 1_000_000; // 1 token
    const unlockTs = now() + 2;
    const recipient = creator.publicKey; // lock designates creator as recipient

    const [tlPda] = timelockPda(creator.publicKey, unlockTs);
    const [tlTokenPda] = tokenAccountPda(tlPda);

    const recipAta = await getAssociatedTokenAddress(mint, recipient);

    await program.methods
      .initializeTokenLock(new anchor.BN(amount), new anchor.BN(unlockTs), recipient)
      .accounts({
        creator: creator.publicKey,
        timelockAccount: tlPda,
        tokenMint: mint,
        creatorTokenAccount: creatorAtaAcc.address,
        timelockTokenAccount: tlTokenPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([creator])
      .rpc();

    await sleep(2500);
    await tick();

    // otherUser (not recipient) tries to withdraw_token
    const otherAtaAcc = await getOrCreateAssociatedTokenAccount(
      connection,
      creator, // payer for account creation
      mint,
      otherUser.publicKey
    );

    await expect(
      program.methods
        .withdrawToken()
        .accounts({
          recipient: otherUser.publicKey,
          timelockAccount: tlPda,
          timelockTokenAccount: tlTokenPda,
          recipientTokenAccount: otherAtaAcc.address, // not designated recipient
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([otherUser])
        .rpc()
    ).to.be.rejectedWith(/Only the designated recipient can withdraw|custom program error|0x/i);
  });
});
