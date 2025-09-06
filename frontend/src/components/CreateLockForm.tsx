import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Lock, Calendar, User, DollarSign, Loader2 } from 'lucide-react';
import { getProgram, createTimeLock } from '../utils/program';
import { format, addMinutes } from 'date-fns';

interface CreateLockFormProps {
    onSuccess: (walletPDA: PublicKey, seed: string) => void;
}

export const CreateLockForm: React.FC<CreateLockFormProps> = ({ onSuccess }) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const [loading, setLoading] = useState(false);

    // Calculate default date and time
    const currentDateTime = new Date();
    const defaultUnlockDate = format(currentDateTime, 'yyyy-MM-dd');
    const defaultUnlockTime = format(addMinutes(currentDateTime, 2), 'HH:mm');

    const [formData, setFormData] = useState({
        amount: '',
        unlockDate: defaultUnlockDate,
        unlockTime: defaultUnlockTime,
        recipient: '',
        seed: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!wallet.connected || !wallet.publicKey) {
            alert('Please connect your wallet first');
            return;
        }

        try {
            setLoading(true);
            const program = getProgram(wallet, connection);

            // Validate amount
            const amount = parseFloat(formData.amount);
            if (isNaN(amount) || amount <= 0) {
                alert('Please enter a valid amount greater than 0');
                setLoading(false);
                return;
            }

            // Validate unlock date and time
            const unlockDateTime = new Date(`${formData.unlockDate}T${formData.unlockTime}`);
            if (isNaN(unlockDateTime.getTime())) {
                alert('Please enter a valid unlock date and time');
                setLoading(false);
                return;
            }

            const recipientKey = formData.recipient
                ? new PublicKey(formData.recipient)
                : wallet.publicKey;

            const { signature, walletPDA } = await createTimeLock(
                program,
                amount,
                unlockDateTime,
                recipientKey,
                formData.seed || 'default'
            );

            console.log('Transaction signature:', signature);
            onSuccess(walletPDA, formData.seed || 'default');

            // Reset form
            setFormData({
                amount: '',
                unlockDate: defaultUnlockDate,
                unlockTime: defaultUnlockTime,
                recipient: '',
                seed: ''
            });
        } catch (error) {
            console.error('Error creating time lock:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const minDateTime = new Date();
    const minDate = format(minDateTime, 'yyyy-MM-dd');
    const minTime = format(minDateTime, 'HH:mm');

    return (
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800">Create Time Lock</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <DollarSign className="w-4 h-4 inline mr-1" />
                        Amount (SOL)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="0.00"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Unlock Date
                        </label>
                        <input
                            type="date"
                            required
                            min={minDate}
                            value={formData.unlockDate}
                            onChange={(e) => setFormData({ ...formData, unlockDate: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Unlock Time
                        </label>
                        <input
                            type="time"
                            required
                            min={formData.unlockDate === minDate ? minTime : undefined}
                            value={formData.unlockTime}
                            onChange={(e) => setFormData({ ...formData, unlockTime: e.target.value })}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <User className="w-4 h-4 inline mr-1" />
                        Recipient (Optional - defaults to your wallet)
                    </label>
                    <input
                        type="text"
                        value={formData.recipient}
                        onChange={(e) => setFormData({ ...formData, recipient: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="Enter recipient wallet address"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seed (Optional - for multiple wallets)
                    </label>
                    <input
                        type="text"
                        value={formData.seed}
                        onChange={(e) => setFormData({ ...formData, seed: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        placeholder="default"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || !wallet.connected}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-4 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating Lock...
                        </>
                    ) : (
                        <>
                            <Lock className="w-5 h-5" />
                            Create Time Lock
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};