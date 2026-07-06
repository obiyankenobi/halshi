'use client';

export default function GettingStartedGuide() {
  return (
    <div className="w-full max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-white">
          Hathor dApp Template
        </h2>
        <p className="text-lg text-slate-300 max-w-2xl mx-auto">
          A production-ready Next.js template for building decentralized applications on Hathor Network.
          Includes WalletConnect (Reown) and MetaMask Snaps integration out of the box.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold text-white">Features</h3>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Multi-wallet support (WalletConnect + MetaMask Snaps)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Unified wallet adapter pattern for easy integration</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Network switching (testnet/mainnet)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Balance caching and automatic refresh</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Generic nano contract transaction interface</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>TypeScript + Next.js 14 with App Router</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>Mock wallet mode for development</span>
            </li>
          </ul>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-3">
          <h3 className="text-xl font-semibold text-white">Quick Start</h3>
          <ol className="space-y-3 text-slate-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">1</span>
              <div>
                <p className="font-medium text-white">Clone and Install</p>
                <code className="text-sm text-blue-400">npm install</code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">2</span>
              <div>
                <p className="font-medium text-white">Configure Environment</p>
                <p className="text-sm">Set up your WalletConnect project ID in <code className="text-blue-400">.env.local</code></p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">3</span>
              <div>
                <p className="font-medium text-white">Start Development</p>
                <code className="text-sm text-blue-400">npm run dev</code>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm font-semibold">4</span>
              <div>
                <p className="font-medium text-white">Build Your dApp</p>
                <p className="text-sm">Use the contract interaction example below as a starting point</p>
              </div>
            </li>
          </ol>
        </div>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 space-y-4">
        <h3 className="text-xl font-semibold text-white">Documentation</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-white">README.md</h4>
            <p className="text-sm text-slate-300">
              Complete setup guide, architecture overview, and configuration options
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-white">QUICKSTART.md</h4>
            <p className="text-sm text-slate-300">
              Step-by-step guide to get your first dApp running in minutes
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium text-white">CONTRACT_INTEGRATION.md</h4>
            <p className="text-sm text-slate-300">
              Detailed guide on integrating your nano contracts with the template
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-6 space-y-3">
        <h3 className="text-xl font-semibold text-blue-300">Next Steps</h3>
        <p className="text-slate-300">
          Connect your wallet using the button in the header to see the contract interaction example below.
          The example demonstrates how to call nano contract methods using the wallet infrastructure.
        </p>
      </div>
    </div>
  );
}
