# Time-Locked Wallet - Solana Frontend

A beautiful, production-ready frontend for interacting with your Time-Locked Wallet Solana program. This application allows users to create time-locked SOL deposits and withdraw them after the unlock period.

## ✨ Features

- **🔐 Time-Locked Deposits**: Lock SOL until a specified future date and time
- **👛 Multi-Wallet Support**: Compatible with Phantom and Backpack wallets  
- **🔍 Wallet Discovery**: Search for existing wallets by seed
- **⏰ Real-time Countdown**: Live countdown timer showing time until unlock
- **💸 Secure Withdrawals**: Withdraw funds only after unlock time
- **🎨 Beautiful UI**: Modern, responsive design with smooth animations
- **⚡ Real-time Updates**: Automatic refresh of wallet states
- **🔗 Devnet Ready**: Pre-configured for Solana Devnet

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- A Solana wallet (Phantom or Backpack)
- Your deployed Time-Locked Wallet program ID

### Installation

1. **Update Program Configuration**

   Open `src/utils/program.ts` and update the `PROGRAM_ID`:

   ```typescript
   export const PROGRAM_ID = new PublicKey('YOUR_ACTUAL_PROGRAM_ID_HERE');
   ```

2. **Start the Development Server**

   The development server should start automatically. If not, run:

   ```bash
   npm run dev
   ```

3. **Connect Your Wallet**

   - Open the application in your browser
   - Click "Select Wallet" and choose Phantom or Backpack
   - Make sure you're on Solana Devnet

## 🎯 How to Use

### Creating a Time Lock

1. **Connect Wallet**: Connect your Phantom or Backpack wallet
2. **Fill the Form**:
   - Enter the amount of SOL to lock
   - Select unlock date and time (must be in the future)
   - Optionally specify a different recipient wallet
   - Optionally provide a custom seed for multiple wallets
3. **Create Lock**: Click "Create Time Lock" and confirm the transaction
4. **View Details**: The wallet will automatically appear in the viewer

### Viewing & Managing Locks

1. **Automatic Display**: Newly created wallets appear automatically
2. **Search Existing**: Use the search feature to find wallets by seed
3. **Monitor Status**: View countdown timer and wallet details
4. **Withdraw Funds**: Click "Withdraw Funds" when unlocked (only recipient can withdraw)

## 🏗 Architecture

### Components

- **WalletProvider**: Solana wallet adapter configuration
- **WalletConnection**: Wallet connect/disconnect interface  
- **CreateLockForm**: Form for creating new time locks
- **WalletViewer**: Display wallet status and handle withdrawals

### Key Features

- **PDA Management**: Automatic Program Derived Address generation
- **Real-time Updates**: Live countdown and status updates
- **Error Handling**: Comprehensive error handling and user feedback
- **Responsive Design**: Works on all screen sizes
- **Type Safety**: Full TypeScript support

## 🛠 Configuration

### Program Integration

Update your program details in `src/utils/program.ts`:

```typescript
// Your deployed program ID
export const PROGRAM_ID = new PublicKey('YOUR_PROGRAM_ID_HERE');

// Your program's IDL
export const IDL = {
  // ... your actual IDL here
};
```

### Network Configuration

The app is configured for Devnet by default. To change networks, update `src/components/WalletProvider.tsx`.

## 🔧 Development

### Project Structure

```
src/
├── components/          # React components
│   ├── WalletProvider.tsx
│   ├── WalletConnection.tsx  
│   ├── CreateLockForm.tsx
│   └── WalletViewer.tsx
├── utils/              # Utility functions
│   ├── program.ts      # Program interaction
│   └── constants.ts    # App constants
├── types/              # TypeScript types
│   └── program.ts      
└── App.tsx            # Main app component
```

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎨 UI Features

- **Gradient Backgrounds**: Beautiful gradient designs
- **Loading States**: Smooth loading animations
- **Countdown Timers**: Real-time countdown to unlock
- **Status Indicators**: Visual indicators for lock status
- **Responsive Grid**: Adaptive layout for all devices
- **Hover Effects**: Interactive hover states
- **Form Validation**: Real-time form validation

## 🔐 Security Features

- **On-chain Validation**: All time locks enforced on-chain
- **PDA Security**: Uses Program Derived Addresses
- **Wallet Integration**: Secure wallet adapter integration
- **Transaction Signing**: All transactions require user approval

## 📱 Supported Wallets

- **Phantom**: Full support with auto-connect
- **Backpack**: Full support with auto-connect  
- **Other Wallets**: Can be added by updating the wallet adapter config

## 🚀 Deployment

### Building for Production

```bash
npm run build
```

The `dist` folder contains the production build ready for deployment.

### Deployment Options

- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Drag and drop the `dist` folder
- **GitHub Pages**: Use the built files in `dist`

## 🐛 Troubleshooting

### Common Issues

1. **Wallet Connection Issues**
   - Ensure your wallet is on Devnet
   - Check that you have SOL for transaction fees

2. **Program Not Found**
   - Verify your program ID is correct
   - Ensure your program is deployed to Devnet

3. **Transaction Failures**
   - Check you have sufficient SOL for fees
   - Verify unlock time is in the future
   - Ensure recipient address is valid

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

---

**Ready to start locking your SOL? Connect your wallet and create your first time lock! 🚀**