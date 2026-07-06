# Contract Integration Guide

This guide walks you through integrating your Hathor nano contract with the dApp template. By the end, you'll have a custom UI for interacting with your contract methods.

## Prerequisites

Before integrating your contract:

- [ ] Your contract is deployed to testnet or mainnet
- [ ] You have the contract ID
- [ ] You know your contract's public methods
- [ ] You understand your contract's state structure
- [ ] The template is set up and running (see QUICKSTART.md)

## Understanding the Architecture

The template provides two main interfaces for contract interaction:

1. **WalletContext**: For sending transactions to your contract
2. **HathorContext**: For reading contract state from the blockchain

```
Your Component
    ├── useWallet() → sendContractTx()
    └── useHathor() → getContractState()
```

## Step 1: Add Your Contract ID (2 minutes)

Edit `.env.local` and add your contract ID:

```env
NEXT_PUBLIC_CONTRACT_IDS=["your_contract_id_here"]
```

If you have multiple contracts:

```env
NEXT_PUBLIC_CONTRACT_IDS=["contract_1", "contract_2", "contract_3"]
```

Restart your dev server after changing environment variables.

## Step 2: Define Contract Types (5 minutes)

Create type definitions for your contract. Add to `types/hathor.ts`:

```typescript
// Example: A simple voting contract
export interface VotingContractState {
  proposal_count: bigint;
  total_votes: bigint;
  voting_open: boolean;
  min_vote_amount: bigint;
}

export interface VoteParams {
  proposalId: number;
  amount: bigint;
  voteFor: boolean;
}
```

These types ensure type safety when working with your contract data.

## Step 3: Create a Contract Component (15 minutes)

Create a new component for your contract interaction in `components/`.

Example: `components/VotingContract.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useHathor } from '@/contexts/HathorContext';
import { toast } from '@/lib/toast';
import { VotingContractState } from '@/types/hathor';

export default function VotingContract() {
  const { address, sendContractTx } = useWallet();
  const { getContractState, isConnected } = useHathor();
  const [contractState, setContractState] = useState<VotingContractState | null>(null);
  const [proposalId, setProposalId] = useState('');
  const [voteAmount, setVoteAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Your contract ID from .env
  const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_IDS?.[0] || '';

  // Fetch contract state on mount
  useEffect(() => {
    if (CONTRACT_ID && isConnected) {
      loadContractState();
    }
  }, [CONTRACT_ID, isConnected]);

  const loadContractState = async () => {
    try {
      const state = await getContractState(CONTRACT_ID);
      setContractState(state as VotingContractState);
    } catch (error) {
      console.error('Failed to load contract state:', error);
      toast.error('Failed to load contract state');
    }
  };

  const handleVote = async (voteFor: boolean) => {
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!proposalId || !voteAmount) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      // Convert vote amount to cents
      const amountInCents = BigInt(Math.floor(parseFloat(voteAmount) * 100));

      // Call the contract
      const result = await sendContractTx({
        contractId: CONTRACT_ID,
        method: 'cast_vote',
        args: [parseInt(proposalId), voteFor], // Your contract's method arguments
        actions: [{
          type: 'deposit',
          amount: amountInCents.toString(),
          token: '00', // HTR token UID
        }],
      });

      toast.success(`Vote cast successfully! TX: ${result.tx_id || 'pending'}`);

      // Refresh contract state
      await loadContractState();

      // Reset form
      setProposalId('');
      setVoteAmount('');
    } catch (error: any) {
      console.error('Vote failed:', error);
      toast.error(error.message || 'Failed to cast vote');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <p className="text-slate-300">Connect your wallet to interact with the voting contract</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-6">
      <h2 className="text-2xl font-bold text-white">Voting Contract</h2>

      {/* Contract State Display */}
      {contractState && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2">
          <h3 className="text-lg font-semibold text-white mb-3">Contract Info</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Proposals:</span>
              <span className="text-white ml-2">{contractState.proposal_count.toString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Total Votes:</span>
              <span className="text-white ml-2">{contractState.total_votes.toString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 ${contractState.voting_open ? 'text-green-400' : 'text-red-400'}`}>
                {contractState.voting_open ? 'Open' : 'Closed'}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Min Vote:</span>
              <span className="text-white ml-2">
                {(Number(contractState.min_vote_amount) / 100).toFixed(2)} HTR
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Vote Form */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Proposal ID
          </label>
          <input
            type="number"
            value={proposalId}
            onChange={(e) => setProposalId(e.target.value)}
            placeholder="Enter proposal ID"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Vote Amount (HTR)
          </label>
          <input
            type="number"
            value={voteAmount}
            onChange={(e) => setVoteAmount(e.target.value)}
            placeholder="0.00"
            step="0.01"
            min="0"
            className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={isLoading || !proposalId || !voteAmount}
            className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Vote For
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={isLoading || !proposalId || !voteAmount}
            className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            Vote Against
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center text-slate-400 text-sm">
          Sending transaction...
        </div>
      )}
    </div>
  );
}
```

## Step 4: Add Component to Page (2 minutes)

Import and add your component to `app/page.tsx`:

```typescript
import VotingContract from '@/components/VotingContract';

export default function Home() {
  // ... existing code ...

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-12">
        <GettingStartedGuide />

        {/* Add your contract component */}
        <VotingContract />

        <ContractExample />
      </main>
    </div>
  );
}
```

## Step 5: Test Your Integration (5 minutes)

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Connect your wallet**

3. **Test contract state loading**:
   - Check that contract info displays correctly
   - Verify all values are properly formatted

4. **Test a transaction**:
   - Fill in the form
   - Submit a transaction
   - Check browser console for logs
   - Verify transaction in your wallet
   - Confirm state updates after transaction

## Common Contract Patterns

### Pattern 1: Read-Only Contract Query

For contracts where you only need to read state:

```typescript
const { getContractState } = useHathor();

const fetchData = async () => {
  const state = await getContractState(CONTRACT_ID);
  // Use state data
};
```

### Pattern 2: Transaction with Deposit

For methods that require depositing tokens:

```typescript
await sendContractTx({
  contractId: CONTRACT_ID,
  method: 'your_method',
  args: [arg1, arg2],
  actions: [{
    type: 'deposit',
    amount: '1000', // In cents
    token: '00',
  }],
});
```

### Pattern 3: Transaction with Withdrawal

For methods that withdraw tokens:

```typescript
await sendContractTx({
  contractId: CONTRACT_ID,
  method: 'your_method',
  args: [arg1, arg2],
  actions: [{
    type: 'withdrawal',
    amount: '1000', // In cents
    token: '00',
    address: walletAddress,
  }],
});
```

### Pattern 4: Multiple Actions

For methods that require multiple token operations:

```typescript
await sendContractTx({
  contractId: CONTRACT_ID,
  method: 'your_method',
  args: [arg1, arg2],
  actions: [
    {
      type: 'deposit',
      amount: '1000',
      token: '00',
    },
    {
      type: 'withdrawal',
      amount: '500',
      token: '01', // Different token
      address: walletAddress,
    },
  ],
});
```

## Working with Contract Arguments

Contract methods accept arguments as an array. Ensure you match your contract's expected types:

```typescript
// Number argument
args: [42]

// String argument (if your contract accepts strings)
args: ['hello']

// Boolean argument
args: [true]

// Multiple arguments
args: [42, 'hello', true]

// BigInt/large numbers (pass as numbers, the RPC service handles conversion)
args: [1000000]
```

## Handling Token Amounts

Hathor uses cents for token amounts. Always convert user input:

```typescript
// User enters: 10.50 HTR
const userInput = '10.50';
const amountInCents = BigInt(Math.floor(parseFloat(userInput) * 100));
// Result: 1050n

// To display: convert back
const displayAmount = Number(amountInCents) / 100;
// Result: 10.5
```

## Error Handling Best Practices

Always handle errors gracefully:

```typescript
try {
  const result = await sendContractTx(params);
  toast.success('Transaction successful!');
} catch (error: any) {
  console.error('Transaction failed:', error);

  // Handle specific errors
  if (error.message.includes('insufficient balance')) {
    toast.error('Insufficient balance for this transaction');
  } else if (error.message.includes('contract voided')) {
    toast.error('This contract is no longer active');
  } else {
    toast.error(error.message || 'Transaction failed');
  }
}
```

## Testing Strategies

### 1. Mock Mode Testing

Test UI without blockchain interaction:

```env
NEXT_PUBLIC_USE_MOCK_WALLET=true
```

### 2. Testnet Testing

Always test on testnet before mainnet:

```env
NEXT_PUBLIC_HATHOR_NETWORK=testnet
```

### 3. Console Logging

Add detailed logging during development:

```typescript
console.log('Calling contract:', {
  contractId: CONTRACT_ID,
  method: 'your_method',
  args,
  actions,
});

const result = await sendContractTx(params);
console.log('Transaction result:', result);
```

### 4. State Validation

Validate contract state after transactions:

```typescript
// Before transaction
const stateBefore = await getContractState(CONTRACT_ID);

// Execute transaction
await sendContractTx(params);

// After transaction (wait a moment for blockchain)
await new Promise(resolve => setTimeout(resolve, 2000));
const stateAfter = await getContractState(CONTRACT_ID);

// Validate changes
console.log('State changed:', {
  before: stateBefore,
  after: stateAfter,
});
```

## Advanced: Custom Contract Service

For complex contracts, create a dedicated service:

```typescript
// lib/myContractService.ts
import { HathorCoreAPI } from './hathorCoreAPI';

export class MyContractService {
  private coreAPI: HathorCoreAPI;

  constructor(network: 'testnet' | 'mainnet') {
    this.coreAPI = new HathorCoreAPI(network);
  }

  async getProposals(contractId: string) {
    const state = await this.coreAPI.getContractState(contractId);
    // Process and return proposals
    return state;
  }

  async getVoteHistory(contractId: string, proposalId: number) {
    const history = await this.coreAPI.getContractHistory(contractId, 100);
    // Filter and return votes for this proposal
    return history.transactions.filter(tx =>
      tx.nc_method === 'cast_vote' && tx.nc_args_decoded[0] === proposalId
    );
  }
}
```

## Multi-Contract Applications

If your dApp uses multiple contracts:

```typescript
const CONTRACT_IDS = JSON.parse(process.env.NEXT_PUBLIC_CONTRACT_IDS || '[]');

const VOTING_CONTRACT = CONTRACT_IDS[0];
const GOVERNANCE_CONTRACT = CONTRACT_IDS[1];
const TOKEN_CONTRACT = CONTRACT_IDS[2];
```

## Troubleshooting

### Contract State Not Loading

**Problem**: getContractState() fails or returns null

**Solutions**:
- Verify contract ID is correct
- Check contract exists on the current network
- Ensure network URLs are accessible
- Try switching networks and back

### Transaction Failing

**Problem**: sendContractTx() throws an error

**Solutions**:
- Check wallet has sufficient balance
- Verify method name matches contract
- Confirm arguments match contract expectations
- Check actions array is properly formatted
- Review browser console for detailed error

### State Not Updating

**Problem**: Contract state doesn't reflect transaction changes

**Solutions**:
- Add delay before fetching state (blockchain confirmation time)
- Manually refresh state with a button
- Check transaction was actually confirmed
- Verify you're checking the correct contract

## Next Steps

- Customize the UI to match your brand
- Add more contract methods
- Implement advanced features (history, analytics, etc.)
- Test thoroughly on testnet
- Deploy to production

## Resources

- [Hathor Nano Contracts Documentation](https://docs.hathor.network/guides/nano-contracts/)
- [Hathor Network API Reference](https://docs.hathor.network/references/api/)
- [Example Components in this template](./components/)

---

Need help? Check the [README.md](./README.md) troubleshooting section or ask in the [Hathor Discord](https://discord.gg/hathor).
