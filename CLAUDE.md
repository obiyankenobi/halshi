# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a production-ready Next.js 14 template for building decentralized applications on Hathor Network. It provides a complete wallet integration infrastructure (WalletConnect/Reown and MetaMask Snaps), nano contract interaction patterns, and a clean TypeScript architecture. Developers clone this template to build their own Hathor dApps.

## Development Commands

```bash
# Development server (default: http://localhost:3000)
npm run dev

# Production build
npm run build

# Run production server
npm start

# Lint code
npm run lint

# Type checking
npx tsc --noEmit
```

## Architecture Overview

### Context Providers Hierarchy

The template uses a layered context architecture for state management:

```
ToastProvider (outermost)
  └── WalletConnectProvider
      └── MetaMaskProvider
          └── UnifiedWalletProvider (adapter pattern)
              └── WalletContext (transaction layer)
                  └── HathorContext (blockchain layer)
```

**Key Contexts**:

1. **UnifiedWalletContext** (`contexts/UnifiedWalletContext.tsx`)
   - Adapter pattern for wallet abstraction
   - Provides unified interface across wallet implementations
   - Consumers don't need to know which wallet is connected

2. **WalletContext** (`contexts/WalletContext.tsx`)
   - High-level transaction interface
   - Generic `sendContractTx()` method for any contract
   - Balance management with 15-minute cache
   - Integrates with UnifiedWalletContext for wallet operations

3. **HathorContext** (`contexts/HathorContext.tsx`)
   - Network state management (testnet/mainnet)
   - Contract state fetching and caching
   - Wallet connection status aggregation
   - Network switching with HathorCoreAPI recreation

4. **WalletConnectContext** (`contexts/WalletConnectContext.tsx`)
   - WalletConnect v2 (Reown) implementation
   - Mobile wallet support

5. **MetaMaskContext** (`contexts/MetaMaskContext.tsx`)
   - MetaMask Snaps integration
   - Browser extension support

### API Service Layer

Two distinct API services handle different concerns:

1. **HathorRPCService** (`lib/hathorRPC.ts`)
   - Wallet-to-dApp communication via RPC protocol
   - Methods: `getConnectedNetwork`, `getBalance`, `getAddress`, `sendNanoContractTx`
   - Uses active wallet adapter's request method
   - Mock mode for development testing

2. **HathorCoreAPI** (`lib/hathorCoreAPI.ts`)
   - Direct blockchain queries (read-only)
   - Methods: `getContractState`, `getContractHistory`, `getTransaction`
   - Network-aware (testnet vs mainnet node URLs)
   - No wallet required

## Contract Integration Pattern

The template provides a generic contract interaction interface:

```typescript
// Send any contract transaction
await sendContractTx({
  contractId: 'your_contract_id',
  method: 'your_method',
  args: [arg1, arg2],
  actions: [{
    type: 'deposit' | 'withdrawal',
    amount: '1000', // In cents
    token: '00',
    address?: '...' // Required for withdrawals
  }]
});

// Read contract state
const state = await getContractState(contractId);
```

### Token Amount Conventions

All token amounts in Hathor contracts are in **cents**:
- User input: `10.50 HTR`
- Convert to cents: `BigInt(1050)`
- Display: `Number(1050n) / 100 = 10.5`

Utility functions in `lib/utils.ts`:
- `formatBalance(bigint)` - Formats balance for display
- `formatTokenAmount(bigint)` - Formats token amounts
- `formatAddress(string)` - Shortens addresses

## Configuration

Environment variables (see `.env.example`):

```env
# Required: WalletConnect Project ID from cloud.reown.com
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Optional: Default network
NEXT_PUBLIC_HATHOR_NETWORK=testnet

# Optional: Mock mode for development
NEXT_PUBLIC_USE_MOCK_WALLET=false

# Optional: Your deployed contract IDs
NEXT_PUBLIC_CONTRACT_IDS=["contract_id_1"]
```

Configuration is centralized in `lib/config.ts`:
- Network URLs
- Default network
- Contract IDs
- Mock mode flag

## Key Files and Patterns

### Project Structure

```
hathor-dapp-template/
├── app/
│   ├── layout.tsx              # Provider hierarchy
│   ├── page.tsx                # Main landing page
│   └── globals.css             # Global styles + Tailwind
├── components/
│   ├── Header.tsx              # Wallet connection UI
│   ├── GettingStartedGuide.tsx # Template documentation
│   ├── ContractExample.tsx     # Example contract interaction
│   ├── NetworkSelector.tsx     # Network switching
│   └── WalletConnectionModal.tsx # Wallet selection
├── contexts/                   # State management
├── lib/                        # Services and utilities
└── types/                      # TypeScript definitions
```

### Type System

TypeScript types are organized by concern:

- `types/index.ts` - Shared application types (WalletState, ContractTxParams)
- `types/hathor.ts` - Hathor-specific types (ContractState, RPC types)

All amounts use `bigint` for precision. Convert to/from display formats carefully.

### Path Aliases

Uses `@/*` for imports (configured in `tsconfig.json`):
```typescript
import { useWallet } from '@/contexts/WalletContext';
import { formatBalance } from '@/lib/utils';
```

### Toast Notifications

Built-in toast system (`lib/toast.tsx` using Sonner):
```typescript
import { toast } from '@/lib/toast';

toast.success('Transaction successful!');
toast.error('Failed to send transaction');
```

## Common Development Tasks

### Adding a New Contract Method

1. Define types in `types/hathor.ts` (if contract-specific)
2. Create component in `components/YourContract.tsx`
3. Use `sendContractTx` from WalletContext
4. Test in mock mode first
5. Test on testnet with real wallet

Example structure:
```typescript
'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useHathor } from '@/contexts/HathorContext';
import { toast } from '@/lib/toast';

export default function YourContract() {
  const { sendContractTx } = useWallet();
  const { getContractState, isConnected } = useHathor();

  const handleAction = async () => {
    try {
      const result = await sendContractTx({
        contractId: process.env.NEXT_PUBLIC_CONTRACT_IDS[0],
        method: 'your_method',
        args: [],
        actions: [{
          type: 'deposit',
          amount: '1000',
          token: '00',
        }],
      });
      toast.success('Success!');
    } catch (error) {
      toast.error('Failed');
    }
  };

  return (
    // Your UI
  );
}
```

### Debugging Transaction Issues

1. Check browser console for detailed errors
2. Verify contract ID is correct in `.env.local`
3. Confirm wallet is on the correct network
4. Check transaction structure matches contract expectations
5. Use mock mode to isolate wallet issues
6. Review RPC params in Network tab (browser DevTools)

### Adding a New Wallet Provider

1. Create context implementing wallet adapter interface:
   ```typescript
   interface WalletAdapter {
     isConnected: boolean;
     address: string | null;
     connect: () => Promise<void>;
     disconnect: () => Promise<void>;
     request: (method: string, params?: any) => Promise<any>;
   }
   ```

2. Add to `UnifiedWalletContext.tsx`
3. Update `WalletConnectionModal.tsx` with new option
4. Test connection flow thoroughly

### Network Switching

Network changes affect:
- HathorCoreAPI instance (recreated with new URLs)
- Contract state queries (different nodes)
- Wallet connection (wallet must match)

Network switching is handled in HathorContext (`switchNetwork` method). The UI uses NetworkSelector component.

## Mock Mode

Enable for development without wallet:
```env
NEXT_PUBLIC_USE_MOCK_WALLET=true
```

Mock mode features:
- Simulated wallet connection
- 100,000 HTR mock balance
- Transaction logging (no real txs)
- Immediate responses
- Contract state mocking in HathorContext

Perfect for UI development and testing contract interaction logic.

## Important Constraints

1. **BigInt Serialization**: `bigint` cannot be JSON.stringify'd. Convert to string first.
2. **Cent-based Amounts**: Always multiply display amounts by 100 before sending to contract.
3. **No Automatic State Updates**: Contract state is cached. Refresh manually after transactions.
4. **Network Consistency**: Ensure wallet and dApp are on the same network.
5. **Environment Variables**: All `NEXT_PUBLIC_*` vars are compiled into client bundle.

## Testing Strategy

1. **Mock Mode**: Test UI and interaction logic without blockchain
2. **Testnet**: Test real transactions safely
3. **Manual Testing**: No automated test suite currently
4. **Console Logging**: Add detailed logs during development:
   ```typescript
   console.log('Transaction params:', { contractId, method, args, actions });
   console.log('Result:', result);
   ```

## Documentation for Users

The template includes comprehensive user documentation:

- **README.md**: Complete setup and API reference
- **QUICKSTART.md**: 5-minute setup guide
- **CONTRACT_INTEGRATION.md**: Detailed integration patterns

These docs are designed for developers using this template to build their dApps.

## Common Pitfalls

1. **Forgetting to convert amounts**: User enters 10 HTR, must send 1000 cents
2. **Not handling BigInt**: JSON.stringify will fail on BigInt values
3. **Missing contract ID**: Set `NEXT_PUBLIC_CONTRACT_IDS` in `.env.local`
4. **Wrong network**: Wallet must be on same network as dApp
5. **Not refreshing state**: Call `getContractState` after transactions
6. **Missing WalletConnect ID**: Template won't work without it

## Performance Considerations

- Balance is cached for 15 minutes (localStorage)
- Contract state is cached until manual refresh
- No polling or automatic updates (deliberate design)
- Next.js static generation where possible
- Code splitting via Next.js dynamic imports

## Security Notes

- Never commit `.env.local` with sensitive data
- Validate user input before sending to contracts
- Always use testnet for development
- Review transaction details in wallet before signing
- Amounts in cents prevent decimal precision issues

## Related Documentation

- User setup: `README.md`
- Quick start: `QUICKSTART.md`
- Contract integration: `CONTRACT_INTEGRATION.md`
- Hathor docs: https://docs.hathor.network/

---

This is a **template project**. Users should customize branding, add their contract logic, and deploy their own dApps. The wallet infrastructure and architectural patterns are production-ready.
