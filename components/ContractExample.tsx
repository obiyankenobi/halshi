'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { useHathor } from '@/contexts/HathorContext';
import { toast } from '@/lib/toast';

export default function ContractExample() {
  const { address, sendContractTx } = useWallet();
  const { isConnected, network } = useHathor();
  const [contractId, setContractId] = useState('');
  const [methodName, setMethodName] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!contractId || !methodName) {
      toast.error('Contract ID and method name are required');
      return;
    }

    setIsLoading(true);

    try {
      // Convert deposit amount from HTR to cents (BigInt)
      const amountInCents = depositAmount
        ? BigInt(Math.floor(parseFloat(depositAmount) * 100))
        : 0n;

      // Prepare contract transaction parameters
      const params = {
        contractId,
        method: methodName,
        args: [], // Add method arguments here based on your contract
        actions: amountInCents > 0 ? [{
          type: 'deposit' as const,
          amount: amountInCents.toString(),
          token: '00', // HTR token UID
        }] : [],
      };

      console.log('Sending contract transaction:', params);

      // Send transaction using the wallet infrastructure
      const result = await sendContractTx(params);

      console.log('Transaction result:', result);

      toast.success(`Transaction sent successfully! TX ID: ${result.tx_id || 'pending'}`);

      // Reset form
      setContractId('');
      setMethodName('');
      setDepositAmount('');
    } catch (error: any) {
      console.error('Contract transaction failed:', error);
      toast.error(error.message || 'Failed to send transaction');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-3">Contract Interaction Example</h3>
          <p className="text-slate-300 mb-6">
            Connect your wallet to see a working example of nano contract interaction.
          </p>
          <div className="text-sm text-slate-400">
            This example demonstrates how to call contract methods using the template wallet infrastructure.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-xl font-semibold text-white mb-2">Contract Interaction Example</h3>
          <p className="text-slate-300 text-sm">
            This demonstrates how to call nano contract methods. Update the code in{' '}
            <code className="text-blue-400 bg-slate-900 px-2 py-1 rounded">
              components/ContractExample.tsx
            </code>
            {' '}to match your contract interface.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Contract ID
            </label>
            <input
              type="text"
              value={contractId}
              onChange={(e) => setContractId(e.target.value)}
              placeholder="Enter your nano contract ID"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-slate-400">
              The unique identifier of your deployed nano contract
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Method Name
            </label>
            <input
              type="text"
              value={methodName}
              onChange={(e) => setMethodName(e.target.value)}
              placeholder="e.g., initialize, execute, claim"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-slate-400">
              The public method to call on your contract
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Deposit Amount (HTR) - Optional
            </label>
            <input
              type="number"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <p className="mt-1 text-xs text-slate-400">
              Amount of HTR to deposit with this transaction (leave empty for 0)
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium text-white">Connected Wallet Info</h4>
            <div className="text-xs text-slate-400 space-y-1">
              <p>Address: <span className="text-slate-300">{address}</span></p>
              <p>Network: <span className="text-slate-300">{network}</span></p>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !contractId || !methodName}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
          >
            {isLoading ? 'Sending Transaction...' : 'Send Contract Transaction'}
          </button>
        </form>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-blue-300 mb-2">Implementation Notes</h4>
        <ul className="text-xs text-slate-300 space-y-1">
          <li>• This example uses the generic <code className="text-blue-400">sendContractTx</code> method from WalletContext</li>
          <li>• Modify the <code className="text-blue-400">args</code> array to pass your contract method parameters</li>
          <li>• Add validation logic specific to your contract requirements</li>
          <li>• See CONTRACT_INTEGRATION.md for detailed integration instructions</li>
        </ul>
      </div>
    </div>
  );
}
