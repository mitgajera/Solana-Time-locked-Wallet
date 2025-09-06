# ⏳ Solana Time-Locked Wallet

A secure Solana program (Anchor) that allows you to **lock SOL or SPL tokens until a future time**.  
Only the designated owner or recipient can withdraw funds, and only **after the unlock timestamp** has passed.

---

## 📖 Overview

This project demonstrates how to create a **time-locked wallet** on Solana with Anchor.  
It includes the on-chain program (Rust) and optional off-chain clients (CLI / Web UI) for easy interaction.

Typical use cases:
- Vesting contracts
- Escrow-style payments
- Delayed token distribution
- Trustless time-based vaults

---

## ✨ Features

- **Time-locked accounts** → Funds are locked until a given UNIX timestamp.  
- **SOL + SPL support** → Works with both native SOL and SPL tokens.  
- **Owner & recipient** → Either party can withdraw, once unlocked.  
- **PDA vaults** → Funds are secured in program-derived accounts (PDAs).  
- **CLI & Web UI** → Interact via the command line or browser.  
- **Flexible** → Multiple wallets per user, with different unlock times.  

---

## ⚙️ How It Works

1. **Initialize a lock** → Create a new time-locked vault with an unlock timestamp.  
2. **Deposit** → Send SOL or SPL tokens into the vault.  
3. **Unlock & Withdraw** → After the unlock time, funds can be withdrawn by the owner or recipient.  

---

## 🚀 Getting Started

### Prerequisites
- [Rust](https://www.rust-lang.org/tools/install) (to build Solana programs)  
- [Anchor](https://book.anchor-lang.com/getting_started/installation.html) (for Solana development)  
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)  
- [Node.js](https://nodejs.org/) + yarn/npm (for web client, if used)  

### Build & Deploy (Localnet)

```bash
# Clone the repo
git clone https://github.com/mitgajera/Solana-Time-locked-Wallet.git
cd Solana-Time-locked-Wallet

# Build the program
anchor build

# Start devnet validator
solana config set --url https://api.devnet.solana.com

# Deploy program to localnet
anchor deploy
```
---

### Web UI

```bash
cd frontend
npm install
npm run dev
```

- Open your browser to `http://localhost:5173` to interact with the wallet.

**Gotchas:**
- The unlock time must be a valid UNIX timestamp in the future.
- Depositing tokens other than SOL may require additional instructions.
- Always test on localnet/devnet before
