import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { WalletContextProvider } from './components/WalletProvider';
import { WalletConnection } from './components/WalletConnection';
import { CreateLockForm } from './components/CreateLockForm';
import { WalletViewer } from './components/WalletViewer';
import { Clock, Github, ExternalLink } from 'lucide-react';

function App() {
  const [currentWalletPDA, setCurrentWalletPDA] = useState<PublicKey | undefined>();
  const [currentSeed, setCurrentSeed] = useState<string | undefined>();

  const handleLockCreated = (walletPDA: PublicKey, seed: string) => {
    setCurrentWalletPDA(walletPDA);
    setCurrentSeed(seed);
  };

  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-purple-100 via-pink-50 to-teal-100">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-white/20 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-800">Time-Locked Wallet</h1>
                  <p className="text-sm text-gray-600">Secure your SOL with time-based locks</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a 
                  href="https://github.com/mitgajera/Solana-Time-locked-Wallet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <Github className="w-5 h-5" />
                </a>
                <a 
                  href="https://explorer.solana.com/?cluster=devnet" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  Devnet Explorer
                </a>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Lock Your SOL, Control Your Future
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Create time-locked wallets for grants, savings, trust funds, or any scenario where you need delayed access to funds.
            </p>
          </div>

          {/* Wallet Connection */}
          <WalletConnection />

          {/* Main Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
            <CreateLockForm onSuccess={handleLockCreated} />
            <WalletViewer walletPDA={currentWalletPDA} seed={currentSeed} />
          </div>

          {/* Features Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Time-Based Security</h3>
              <p className="text-gray-600">
                Funds are locked on-chain until your specified unlock time. No one can access them before then.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Trustless & Secure</h3>
              <p className="text-gray-600">
                Built on Solana blockchain with Program Derived Addresses (PDAs) for maximum security.
              </p>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Flexible Recipients</h3>
              <p className="text-gray-600">
                Lock funds for yourself or designate another wallet as the recipient for inheritance or gifts.
              </p>
            </div>
          </div>

          {/* Footer */}
          <footer className="text-center mt-16 pb-8">
            <p className="text-gray-600">
              Built on Solana Devnet • Connect with Phantom or Backpack Wallet
            </p>
          </footer>
        </main>
      </div>
    </WalletContextProvider>
  );
}

export default App;