use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, Transfer};

declare_id!("81YhjpVcTKih7aR8ruyHW9m5cmD6SskiJtwGj4sGFGgy");

#[program]
pub mod timelock_wallet {
    use super::*;

    /// Initialize a SOL timelock
    pub fn initialize_lock(
        ctx: Context<InitializeLock>,
        amount: u64,
        unlock_timestamp: i64,
        recipient: Option<Pubkey>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Validation
        require!(unlock_timestamp > clock.unix_timestamp, TimelockError::InvalidUnlockTime);
        require!(amount > 0, TimelockError::InvalidAmount);
        require!(amount >= 1_000_000, TimelockError::MinimumAmount);

        // Store values before mutable borrow
        let creator_key = ctx.accounts.creator.key();
        let recipient_key = recipient.unwrap_or(creator_key);
        let timelock_key = ctx.accounts.timelock_account.key();

        // Initialize account data
        let timelock_account = &mut ctx.accounts.timelock_account;
        timelock_account.creator = creator_key;
        timelock_account.recipient = recipient_key;
        timelock_account.amount = amount;
        timelock_account.unlock_timestamp = unlock_timestamp;
        timelock_account.is_withdrawn = false;
        timelock_account.bump = ctx.bumps.timelock_account;
        timelock_account.token_mint = None;
        timelock_account.created_at = clock.unix_timestamp;

        // Transfer SOL to PDA
        let cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.timelock_account.to_account_info(),
            },
        );
        anchor_lang::system_program::transfer(cpi_context, amount)?;

        emit!(TimelockCreated {
            timelock_account: timelock_key,
            creator: creator_key,
            recipient: recipient_key,
            amount,
            unlock_timestamp,
            token_mint: None,
        });

        msg!("SOL timelock created: {} lamports, unlocks at {}", amount, unlock_timestamp);
        Ok(())
    }

    /// Initialize a token timelock (USDC, etc.)
    pub fn initialize_token_lock(
        ctx: Context<InitializeTokenLock>,
        amount: u64,
        unlock_timestamp: i64,
        recipient: Option<Pubkey>,
    ) -> Result<()> {
        let clock = Clock::get()?;

        // Validation
        require!(unlock_timestamp > clock.unix_timestamp, TimelockError::InvalidUnlockTime);
        require!(amount > 0, TimelockError::InvalidAmount);

        // Store values before mutable borrow
        let creator_key = ctx.accounts.creator.key();
        let recipient_key = recipient.unwrap_or(creator_key);
        let timelock_key = ctx.accounts.timelock_account.key();
        let token_mint_key = ctx.accounts.token_mint.key();

        // Initialize account data
        let timelock_account = &mut ctx.accounts.timelock_account;
        timelock_account.creator = creator_key;
        timelock_account.recipient = recipient_key;
        timelock_account.amount = amount;
        timelock_account.unlock_timestamp = unlock_timestamp;
        timelock_account.is_withdrawn = false;
        timelock_account.bump = ctx.bumps.timelock_account;
        timelock_account.token_mint = Some(token_mint_key);
        timelock_account.created_at = clock.unix_timestamp;

        // Transfer tokens to PDA token account
        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.timelock_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        emit!(TimelockCreated {
            timelock_account: timelock_key,
            creator: creator_key,
            recipient: recipient_key,
            amount,
            unlock_timestamp,
            token_mint: Some(token_mint_key),
        });

        msg!("Token timelock created: {} tokens, unlocks at {}", amount, unlock_timestamp);
        Ok(())
    }

    /// Withdraw SOL from timelock
    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        let timelock_account = &mut ctx.accounts.timelock_account;
        let clock = Clock::get()?;

        // Validation
        require!(!timelock_account.is_withdrawn, TimelockError::AlreadyWithdrawn);
        require!(clock.unix_timestamp >= timelock_account.unlock_timestamp, TimelockError::StillLocked);
        require!(
            ctx.accounts.recipient.key() == timelock_account.recipient,
            TimelockError::UnauthorizedRecipient
        );
        require!(timelock_account.token_mint.is_none(), TimelockError::UseTokenWithdraw);

        let amount = timelock_account.amount;
        timelock_account.is_withdrawn = true;

        // Keep minimum rent for account to remain valid
        let rent_exempt_minimum = Rent::get()?.minimum_balance(timelock_account.to_account_info().data_len());
        let transfer_amount = amount.saturating_sub(rent_exempt_minimum);

        if transfer_amount > 0 {
            **ctx.accounts.timelock_account.to_account_info().try_borrow_mut_lamports()? -= transfer_amount;
            **ctx.accounts.recipient.to_account_info().try_borrow_mut_lamports()? += transfer_amount;
        }

        emit!(FundsWithdrawn {
            timelock_account: ctx.accounts.timelock_account.key(),
            recipient: ctx.accounts.recipient.key(),
            amount: transfer_amount,
        });

        msg!("Withdrawn {} lamports to recipient", transfer_amount);
        Ok(())
    }

    /// Withdraw tokens from timelock
    pub fn withdraw_token(ctx: Context<WithdrawToken>) -> Result<()> {
        let clock = Clock::get()?;

        // Get account info before mutable borrow
        let timelock_account_info = ctx.accounts.timelock_account.to_account_info();
        
        let timelock_account = &mut ctx.accounts.timelock_account;

        // Validation
        require!(!timelock_account.is_withdrawn, TimelockError::AlreadyWithdrawn);
        require!(clock.unix_timestamp >= timelock_account.unlock_timestamp, TimelockError::StillLocked);
        require!(
            ctx.accounts.recipient.key() == timelock_account.recipient,
            TimelockError::UnauthorizedRecipient
        );
        require!(timelock_account.token_mint.is_some(), TimelockError::NotTokenAccount);

        let amount = timelock_account.amount;
        timelock_account.is_withdrawn = true;

        // Create PDA signer seeds
        let seeds = &[
            b"timelock",
            timelock_account.creator.as_ref(),
            &timelock_account.unlock_timestamp.to_le_bytes(),
            &[timelock_account.bump],
        ];
        let signer = &[&seeds[..]];

        // Transfer tokens from PDA token account to recipient
        let cpi_accounts = Transfer {
            from: ctx.accounts.timelock_token_account.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: timelock_account_info.clone(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        emit!(FundsWithdrawn {
            timelock_account: timelock_account_info.key(),
            recipient: ctx.accounts.recipient.key(),
            amount,
        });

        msg!("Withdrawn {} tokens to recipient", amount);
        Ok(())
    }

    /// Get timelock information (read-only)
    pub fn get_timelock_info(ctx: Context<GetTimelockInfo>) -> Result<TimelockInfo> {
        let timelock_account = &ctx.accounts.timelock_account;
        let clock = Clock::get()?;
        
        Ok(TimelockInfo {
            creator: timelock_account.creator,
            recipient: timelock_account.recipient,
            amount: timelock_account.amount,
            unlock_timestamp: timelock_account.unlock_timestamp,
            created_at: timelock_account.created_at,
            is_withdrawn: timelock_account.is_withdrawn,
            is_unlocked: clock.unix_timestamp >= timelock_account.unlock_timestamp,
            time_remaining: if clock.unix_timestamp < timelock_account.unlock_timestamp {
                timelock_account.unlock_timestamp - clock.unix_timestamp
            } else { 0 },
            token_mint: timelock_account.token_mint,
        })
    }
}

// Account Structures
#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64)]
pub struct InitializeLock<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + TimelockAccount::INIT_SPACE,
        seeds = [b"timelock", creator.key().as_ref(), &unlock_timestamp.to_le_bytes()],
        bump
    )]
    pub timelock_account: Account<'info, TimelockAccount>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_timestamp: i64)]
pub struct InitializeTokenLock<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(
        init,
        payer = creator,
        space = 8 + TimelockAccount::INIT_SPACE,
        seeds = [b"timelock", creator.key().as_ref()],
        bump
    )]
    pub timelock_account: Account<'info, TimelockAccount>,
    
    /// CHECK: Token mint account from SPL, validated by token program
    pub token_mint: UncheckedAccount<'info>,
    
    /// CHECK: Creator token account, validated by token program
    #[account(mut)]
    pub creator_token_account: UncheckedAccount<'info>,
    
    /// CHECK: Timelock token account, validated by token program
    #[account(mut)]
    pub timelock_token_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"timelock", timelock_account.creator.as_ref(), &timelock_account.unlock_timestamp.to_le_bytes()],
        bump = timelock_account.bump
    )]
    pub timelock_account: Account<'info, TimelockAccount>,
}

#[derive(Accounts)]
pub struct WithdrawToken<'info> {
    #[account(mut)]
    pub recipient: Signer<'info>,
    
    #[account(mut)]
    pub timelock_account: Account<'info, TimelockAccount>,
    
    /// CHECK: Token account, validated by token program
    #[account(mut)]
    pub timelock_token_account: UncheckedAccount<'info>,
    
    /// CHECK: Recipient token account, validated by token program
    #[account(mut)]
    pub recipient_token_account: UncheckedAccount<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct GetTimelockInfo<'info> {
    pub timelock_account: Account<'info, TimelockAccount>,
}

// Data Structures
#[account]
#[derive(InitSpace)]
pub struct TimelockAccount {
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub created_at: i64,
    pub is_withdrawn: bool,
    pub bump: u8,
    pub token_mint: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct TimelockInfo {
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub created_at: i64,
    pub is_withdrawn: bool,
    pub is_unlocked: bool,
    pub time_remaining: i64,
    pub token_mint: Option<Pubkey>,
}

// Events
#[event]
pub struct TimelockCreated {
    pub timelock_account: Pubkey,
    pub creator: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub unlock_timestamp: i64,
    pub token_mint: Option<Pubkey>,
}

#[event]
pub struct FundsWithdrawn {
    pub timelock_account: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
}

// Error Types
#[error_code]
pub enum TimelockError {
    #[msg("Unlock time must be in the future")]
    InvalidUnlockTime,
    
    #[msg("Amount must be greater than 0")]
    InvalidAmount,
    
    #[msg("Minimum amount is 0.001 SOL (1,000,000 lamports)")]
    MinimumAmount,
    
    #[msg("Funds are still locked")]
    StillLocked,
    
    #[msg("Funds have already been withdrawn")]
    AlreadyWithdrawn,
    
    #[msg("Only the designated recipient can withdraw")]
    UnauthorizedRecipient,
    
    #[msg("This is a token account, use withdraw_token instruction")]
    UseTokenWithdraw,
    
    #[msg("This is not a token timelock account")]
    NotTokenAccount,
    
    #[msg("Invalid token account")]
    InvalidTokenAccount,
}