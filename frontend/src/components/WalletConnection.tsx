import React from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const WalletConnection: React.FC = () => {
    return (
        <div className="flex justify-center mb-8">
            <WalletMultiButton className="!bg-gradient-to-r !from-purple-500 !to-pink-500 !rounded-lg !font-semibold !px-6 !py-3 hover:!from-purple-600 hover:!to-pink-600 transition-all duration-200 !border-0" />
        </div>
    );
};