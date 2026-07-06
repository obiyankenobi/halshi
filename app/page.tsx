'use client';

import { useHathor } from '@/contexts/HathorContext';
import { useWallet } from '@/contexts/WalletContext';
import Header from '@/components/Header';
import GettingStartedGuide from '@/components/GettingStartedGuide';
import ContractExample from '@/components/ContractExample';
import { NetworkSelector } from '@/components/NetworkSelector';
import { formatBalance } from '@/lib/utils';

export default function Home() {
  const { network, switchNetwork, isConnected } = useHathor();
  const { balance, address } = useWallet();

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-6 py-8 space-y-12">
        <div className="flex justify-end items-center">
          <NetworkSelector value={network} onChange={switchNetwork} disabled={isConnected} />
        </div>

        <GettingStartedGuide />

        {isConnected && address && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-4xl mx-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Connected Wallet Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Address:</span>
                <span className="text-slate-200 font-mono">{address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Balance:</span>
                <span className="text-slate-200">
                  {balance > 0n ? `${formatBalance(balance)} HTR` : 'Authorize wallet to view balance'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Network:</span>
                <span className="text-slate-200 capitalize">{network}</span>
              </div>
            </div>
          </div>
        )}

        <ContractExample />

        <footer className="text-center text-sm text-slate-400 py-8 border-t border-slate-700">
          <p className="mb-2">Built on Hathor Network • Powered by Nano Contracts</p>
          <p className="text-xs text-slate-500">
            <a
              href="https://hathor.network"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-slate-400 transition-colors"
            >
              Learn more about Hathor Network
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
