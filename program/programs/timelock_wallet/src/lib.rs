use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer as TokenTransfer};

// Use your deployed program id
declare_id!("3Pe4uajDJG6aMN34GMmxTzhSUHEiUqUvV3tTSgjuJkMU");

#[program]
pub mod timelock_wallet {
    use super::*;

    /// Lock native SOL until `unlock_ts`. Funds are held by the program-owned `timelock` account.
    pub fn initialize_lock(
        ctx: Context<InitializeLock>,
        amount: u64,
        unlock_ts: i64,
    ) -> Result<()> {
        require!(amount > 0, TimelockError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(unlock_ts > now, TimelockError::UnlockInPast);

        let tl = &mut ctx.accounts.timelock;
        tl.owner = ctx.accounts.initializer.key();
        tl.recipient = ctx.accounts.recipient.key();
        tl.mint = Pubkey::default(); // default() ⇒ SOL lock
        tl.amount = amount;
        tl.unlock_ts = unlock_ts;
        tl.bump = ctx.bumps.timelock;

        // Transfer SOL from initializer → timelock account (program-owned data account)
        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.initializer.to_account_info(),
                    to: ctx.accounts.timelock.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    /// Lock SPL tokens (e.g., USDC) until `unlock_ts`. Tokens are held in an ATA owned by the PDA.
    pub fn initialize_lock_spl(
        ctx: Context<InitializeLockSpl>,
        amount: u64,
        unlock_ts: i64,
    ) -> Result<()> {
        require!(amount > 0, TimelockError::InvalidAmount);

        let now = Clock::get()?.unix_timestamp;
        require!(unlock_ts > now, TimelockError::UnlockInPast);

        let tl = &mut ctx.accounts.timelock;
        tl.owner = ctx.accounts.initializer.key();
        tl.recipient = ctx.accounts.recipient.key();
        tl.mint = ctx.accounts.mint.key();
        tl.amount = amount;
        tl.unlock_ts = unlock_ts;
        tl.bump = ctx.bumps.timelock;

        // Transfer tokens from user ATA → vault ATA (authority: timelock PDA)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.user_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.initializer.to_account_info(),
                },
            ),
            amount,
        )?;

        Ok(())
    }

    /// Withdraw locked SOL to the caller (must be owner or recipient) after unlock.
    /// We manually move lamports because `close = ...` cannot close a program-owned data account via SystemProgram.
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let tl = &mut ctx.accounts.timelock;
        require!(tl.mint == Pubkey::default(), TimelockError::WrongMint);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= tl.unlock_ts, TimelockError::TooEarly);

        let caller = ctx.accounts.caller.key();
        require!(
            caller == tl.owner || caller == tl.recipient,
            TimelockError::Unauthorized
        );

        require!(
            ctx.accounts.owner_refund.key() == tl.owner,
            TimelockError::OwnerMismatch
        );

        let amount = tl.amount;
        require!(amount > 0, TimelockError::InvalidAmount);

        // Mark paid before borrowing to_account_info()
        tl.amount = 0;

        let from_ai = &mut ctx.accounts.timelock.to_account_info();
        let to_ai = &mut ctx.accounts.caller.to_account_info();

        // Move the locked lamports out of the program-owned account by direct lamport mutation
        **from_ai.try_borrow_mut_lamports()? -= amount;
        **to_ai.try_borrow_mut_lamports()? += amount;

        Ok(())
    }

    /// Withdraw locked SPL tokens to the caller (must be owner or recipient) after unlock.
    /// We close only the SPL vault (via token::close_account). The program account remains allocated.
    pub fn withdraw_spl(ctx: Context<WithdrawSpl>) -> Result<()> {
        let tl = &ctx.accounts.timelock;
        require!(tl.mint == ctx.accounts.mint.key(), TimelockError::WrongMint);

        let now = Clock::get()?.unix_timestamp;
        require!(now >= tl.unlock_ts, TimelockError::TooEarly);

        let caller = ctx.accounts.caller.key();
        require!(
            caller == tl.owner || caller == tl.recipient,
            TimelockError::Unauthorized
        );

        require!(
            ctx.accounts.owner_refund.key() == tl.owner,
            TimelockError::OwnerMismatch
        );

        let seeds: &[&[u8]] = &[
            b"timelock",
            tl.owner.as_ref(),
            tl.recipient.as_ref(),
            &tl.unlock_ts.to_le_bytes(),
            &[tl.bump],
        ];

        // Transfer tokens from vault → caller's ATA
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                TokenTransfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.caller_ata.to_account_info(),
                    authority: ctx.accounts.timelock.to_account_info(),
                },
                &[seeds],
            ),
            tl.amount,
        )?;

        // Close the vault token account; rent goes back to owner_refund
        token::close_account(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                CloseAccount {
                    account: ctx.accounts.vault.to_account_info(),
                    destination: ctx.accounts.owner_refund.to_account_info(),
                    authority: ctx.accounts.timelock.to_account_info(),
                },
                &[seeds],
            ),
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_ts: i64)]
pub struct InitializeLock<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// Any pubkey can be a recipient
    /// CHECK: recipient is only stored; checked on withdraw
    pub recipient: UncheckedAccount<'info>,

    #[account(
        init,
        payer = initializer,
        space = 8 + TimeLock::SIZE,
        seeds = [
            b"timelock",
            initializer.key().as_ref(),
            recipient.key().as_ref(),
            &unlock_ts.to_le_bytes()
        ],
        bump
    )]
    pub timelock: Account<'info, TimeLock>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_ts: i64)]
pub struct InitializeLockSpl<'info> {
    #[account(mut)]
    pub initializer: Signer<'info>,

    /// CHECK: stored only
    pub recipient: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        init,
        payer = initializer,
        space = 8 + TimeLock::SIZE,
        seeds = [
            b"timelock",
            initializer.key().as_ref(),
            recipient.key().as_ref(),
            &unlock_ts.to_le_bytes()
        ],
        bump
    )]
    pub timelock: Account<'info, TimeLock>,

    #[account(
        init,
        payer = initializer,
        associated_token::mint = mint,
        associated_token::authority = timelock
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = initializer
    )]
    pub user_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"timelock",
            timelock.owner.as_ref(),
            timelock.recipient.as_ref(),
            &timelock.unlock_ts.to_le_bytes()
        ],
        bump = timelock.bump
        // NOTE: no `close = ...` here; we manually move lamports above.
    )]
    pub timelock: Account<'info, TimeLock>,

    /// CHECK: must equal timelock.owner (asserted in handler)
    #[account(mut)]
    pub owner_refund: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawSpl<'info> {
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            b"timelock",
            timelock.owner.as_ref(),
            timelock.recipient.as_ref(),
            &timelock.unlock_ts.to_le_bytes()
        ],
        bump = timelock.bump
        // NOTE: no `close = ...` for the program account
    )]
    pub timelock: Account<'info, TimeLock>,

    /// CHECK: must equal timelock.owner (asserted in handler)
    #[account(mut)]
    pub owner_refund: UncheckedAccount<'info>,

    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = timelock
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init_if_needed,
        payer = caller,
        associated_token::mint = mint,
        associated_token::authority = caller
    )]
    pub caller_ata: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(Default)]
pub struct TimeLock {
    pub owner: Pubkey,
    pub recipient: Pubkey,
    /// `mint = Pubkey::default()` ⇒ SOL; otherwise SPL mint
    pub mint: Pubkey,
    pub amount: u64,
    pub unlock_ts: i64,
    pub bump: u8,
}

impl TimeLock {
    // 32*3 + 8 + 8 + 1 = 121
    pub const SIZE: usize = 32 + 32 + 32 + 8 + 8 + 1;
}

#[error_code]
pub enum TimelockError {
    #[msg("Amount must be > 0")]
    InvalidAmount,
    #[msg("Unlock timestamp must be in the future")]
    UnlockInPast,
    #[msg("Current time is before unlock time")]
    TooEarly,
    #[msg("Caller is not authorized")]
    Unauthorized,
    #[msg("Mint mismatch or unsupported for this operation")]
    WrongMint,
    #[msg("Owner account provided does not match stored owner")]
    OwnerMismatch,
}
