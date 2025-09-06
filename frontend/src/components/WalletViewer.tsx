import React, { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { getProgram, getTimeLockWallet } from '../utils/program';

interface TimeLockWalletDetails {
  owner: string;
  recipient: string;
  amount: number;
  unlockTimestamp: number | string;
  bump: number;
}

interface WalletViewerProps {
  walletPDA?: PublicKey;
  seed?: string;
}

export const WalletViewer: React.FC<WalletViewerProps> = ({ walletPDA }) => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [walletDetails, setWalletDetails] = useState<TimeLockWalletDetails | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchWalletDetails = async () => {
      if (!walletPDA || !wallet.connected) return;

      try {
        setLoading(true);
        const program = getProgram(wallet, connection);
        const details = await getTimeLockWallet(program, walletPDA);
        if (details) {
          setWalletDetails({
            ...details,
            amount: Number(details.amount),
          });
        } else {
          setWalletDetails(null);
        }
      } catch (error) {
        console.error('Error fetching wallet details:', error);
        setWalletDetails(null);
      } finally {
        setLoading(false);
      }
    };

    fetchWalletDetails();
  }, [walletPDA, wallet, connection]);

  if (!walletPDA) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Viewer</h2>
        <p className="text-gray-600">No wallet selected. Create or select a wallet to view details.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Wallet Viewer</h2>
      {loading ? (
        <p className="text-gray-600">Loading wallet details...</p>
      ) : walletDetails ? (
        <div className="space-y-4">
          <p>
            <strong>Owner:</strong> {walletDetails.owner}
          </p>
          <p>
            <strong>Recipient:</strong> {walletDetails.recipient}
          </p>
          <p>
            <strong>Amount:</strong> {walletDetails.amount} lamports
          </p>
          <p>
            <strong>Unlock Timestamp:</strong> {new Date(Number(walletDetails.unlockTimestamp) * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Bump:</strong> {walletDetails.bump}
          </p>
        </div>
      ) : (
        <p className="text-gray-600">No details available for the selected wallet.</p>
      )}
    </div>
  );
};