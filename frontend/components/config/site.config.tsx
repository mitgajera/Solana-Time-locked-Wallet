import { SiteConfig } from "@/types";
import Github from "../icons/github";
import Telegram from "../icons/telegram";
import X from "../icons/x";

export const siteConfig: SiteConfig = {
  name: "Time-Locked Wallet",
  title: "Time-Locked Wallet - Solana",
  description:
    "A secure time-locked wallet solution built on Solana blockchain. Features programmable time-based access controls, multi-signature support, and advanced security mechanisms for digital asset management.",
  origin: "https://solana-timelock.vercel.app",
  keywords: [
    "Time-Locked Wallet",
    "Solana Wallet",
    "Time-based Access Control",
    "Solana dApp",
    "Web3 Security",
    "Blockchain Wallet",
    "Digital Asset Management",
    "Solana Smart Contracts",
    "Programmable Wallets",
    "DeFi Security",
  ],
  og: "https://solana-timelock.vercel.app/og.png",
  creator: {
    name: "Xuan Vuong",
    url: "https://solana-timelock.vercel.app",
  },
  socials: {
    github: {
      href: "https://github.com/mitgajera/Solana-Time-locked-Wallet",
      icon: Github,
    },
    x: {
      href: "https://x.com/0xmeett",
      icon: X,
    },
    telegram: {
      href: "https://t.me/Oxmeett",
      icon: Telegram,
    },
  },
};
