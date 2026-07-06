# Halshi Tmp

A production-ready Next.js template for building decentralized applications on Hathor Network. Features seamless wallet integration with WalletConnect (Reown) and MetaMask Snaps, nano contract interaction, and a clean TypeScript architecture.

## Features

- **Multi-Wallet Support**: Built-in integration with WalletConnect (Reown) and MetaMask Snaps
- **Unified Adapter Pattern**: Abstract wallet implementation for easy extension
- **Network Switching**: Seamless testnet/mainnet switching with configuration
- **Nano Contract Integration**: Generic transaction interface for any Hathor contract
- **Balance Management**: Automatic balance caching with 15-minute TTL
- **Mock Mode**: Full development environment without wallet connection
- **TypeScript**: Complete type safety throughout the application
- **Modern Stack**: Next.js 14 App Router, React 18, Tailwind CSS
- **Toast Notifications**: Built-in user feedback system

## Prerequisites

- Node.js 18 or higher
- npm or yarn
- A WalletConnect (Reown) Project ID ([get one free](https://cloud.reown.com/))
- Basic understanding of Hathor Network and nano contracts

## Quick Start

1. **Clone and Install**
   ```bash
   git clone <your-repo-url>
   cd hathor-dapp-template
   npm install
   ```

2. **Configure Environment**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local` and add your WalletConnect Project ID:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open Browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
hathor-dapp-template/
├── app/
│   ├── layout.tsx              # Root layout with provider hierarchy
│   ├── page.tsx                # Main landing page
│   └── globals.css             # Global styles and Tailwind
├── components/
│   ├── Header.tsx              # Navigation with wallet connection
│   ├── GettingStartedGuide.tsx # Template documentation
│   ├── ContractExample.tsx     # Example contract interaction
│   ├── NetworkSelector.tsx     # Network switching UI
│   └── WalletConnectionModal.tsx # Wallet selection modal
├── contexts/
│   ├── HathorContext.tsx       # Hathor network and contract state
│   ├── WalletContext.tsx       # Wallet connection and transactions
│   ├── UnifiedWalletContext.tsx # Wallet adapter pattern
│   ├── WalletConnectContext.tsx # WalletConnect implementation
│   └── MetaMaskContext.tsx     # MetaMask Snaps implementation
├── lib/
│   ├── config.ts               # Environment configuration
│   ├── hathorRPC.ts            # Wallet RPC service
│   ├── hathorCoreAPI.ts        # Blockchain API service
│   ├── utils.ts                # Utility functions
│   └── toast.tsx               # Toast notification system
├── types/
│   ├── index.ts                # Shared TypeScript types
│   └── hathor.ts               # Hathor-specific types
└── .env.local                  # Your local configuration
```

## Configuration

### Environment Variables

See `.env.example` for basic configuration and `.env.local.example` for advanced options.

**Required:**
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`: Your WalletConnect project ID

**Optional:**
- `NEXT_PUBLIC_USE_MOCK_WALLET`: Enable mock wallet mode (default: false)
- `NEXT_PUBLIC_DEFAULT_NETWORK`: Default network (testnet | mainnet)
- `NEXT_PUBLIC_CONTRACT_IDS`: Array of your deployed contract IDs

### Network Configuration

The template supports testnet and mainnet. Configure node URLs in `lib/config.ts` or via environment variables. Network switching is available in the UI.

## Wallet Integration

### Architecture

The template uses a **unified adapter pattern** for wallet integration:

```
UnifiedWalletContext (Adapter Pattern)
    ├── WalletConnectContext (WalletConnect v2/Reown)
    └── MetaMaskContext (MetaMask Snaps)
```

### Adding a New Wallet

1. Create a new context implementing the wallet adapter interface
2. Add it to `UnifiedWalletContext.tsx`
3. Update `WalletConnectionModal.tsx` with the new option

See existing implementations in `contexts/` for reference.

## Contract Integration

### Basic Usage

The template provides a generic `sendContractTx` method in `WalletContext`:

```typescript
import { useWallet } from '@/contexts/WalletContext';

function YourComponent() {
  const { sendContractTx } = useWallet();

  const callContract = async () => {
    const result = await sendContractTx({
      contractId: 'your_contract_id',
      method: 'your_method',
      args: [arg1, arg2],
      actions: [{
        type: 'deposit',
        amount: '1000', // Amount in cents
        token: '00',    // HTR token UID
      }],
    });
  };
}
```

### Getting Contract State

Fetch current contract state using `HathorContext`:

```typescript
import { useHathor } from '@/contexts/HathorContext';

function YourComponent() {
  const { getContractState } = useHathor();

  const fetchState = async () => {
    const state = await getContractState('your_contract_id');
    console.log(state);
  };
}
```

### Example Implementation

See `components/ContractExample.tsx` for a complete working example of contract interaction.

## Development Workflow

### Mock Mode

Test your dApp without connecting a wallet:

```env
NEXT_PUBLIC_USE_MOCK_WALLET=true
```

Mock mode simulates:
- Wallet connection
- Balance queries (100,000 HTR mock balance)
- Transaction submissions
- Network information

### Type Safety

The template uses TypeScript throughout. Key types are defined in:
- `types/index.ts`: Shared application types
- `types/hathor.ts`: Hathor Network types
- Context files: Context-specific interfaces

### Styling

Uses Tailwind CSS with a dark theme. Customize colors and styles in:
- `app/globals.css`: Global styles
- `tailwind.config.ts`: Tailwind configuration

## Building for Production

1. **Build the Application**
   ```bash
   npm run build
   ```

2. **Test Production Build Locally**
   ```bash
   npm start
   ```

3. **Deploy**

   The template works with any Next.js hosting provider:
   - Vercel (recommended)
   - Netlify
   - AWS
   - Your own infrastructure

## Troubleshooting

### Wallet Connection Issues

**Problem**: Wallet not connecting

**Solutions**:
- Verify your WalletConnect Project ID is correct
- Check that the wallet extension is installed and unlocked
- Try refreshing the page
- Check browser console for errors
- Ensure you're on a supported browser (Chrome, Firefox, Brave)

### Transaction Failures

**Problem**: Transactions failing or timing out

**Solutions**:
- Verify sufficient balance
- Check network connectivity
- Confirm contract ID is correct
- Review transaction parameters in browser console
- Try switching networks and back

### Balance Not Loading

**Problem**: Balance shows as 0 or won't load

**Solutions**:
- Click the refresh button to force balance update
- Grant wallet permissions when prompted
- Clear localStorage and reconnect
- Check if mock mode is accidentally enabled

### Type Errors

**Problem**: TypeScript errors during development

**Solutions**:
- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript version is 5.x or higher
- Restart your IDE/editor
- Run `npx tsc --noEmit` to check for type errors

## API Reference

### WalletContext

```typescript
interface WalletContextType {
  connected: boolean;
  address: string | null;
  balance: bigint;
  walletBalance: number;
  connectWallet: () => void;
  disconnectWallet: () => void;
  setBalance: (balance: bigint) => void;
  sendContractTx: (params: ContractTxParams) => Promise<any>;
  refreshBalance: () => Promise<void>;
}
```

### HathorContext

```typescript
interface HathorContextType {
  isConnected: boolean;
  address: string | null;
  network: Network;
  contractStates: Record<string, ContractState>;
  getContractState: (contractId: string) => Promise<ContractState>;
  coreAPI: HathorCoreAPI;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => Promise<void>;
  switchNetwork: (network: Network) => Promise<void>;
}
```

## Documentation

- **QUICKSTART.md**: Step-by-step guide to get started quickly
- **CONTRACT_INTEGRATION.md**: Detailed guide for integrating your contracts
- **CLAUDE.md**: Architecture documentation for AI assistance

## Resources

- [Hathor Network Documentation](https://docs.hathor.network/)
- [Nano Contracts Guide](https://docs.hathor.network/guides/nano-contracts/)
- [WalletConnect (Reown) Docs](https://docs.reown.com/)
- [Next.js Documentation](https://nextjs.org/docs)

## Support

- **Issues**: [GitHub Issues](https://github.com/your-repo/issues)
- **Discord**: [Hathor Network Discord](https://discord.gg/hathor)
- **Documentation**: [Hathor Docs](https://docs.hathor.network/)

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built on Hathor Network with support from the Hathor development community.

---

**Ready to build?** Check out QUICKSTART.md to get your first contract integration working in minutes.
