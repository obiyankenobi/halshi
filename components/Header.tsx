'use client';

import { useState } from 'react';
import { useHathor } from '@/contexts/HathorContext';
import { formatAddress } from '@/lib/utils';
import { WalletConnectionModal } from './WalletConnectionModal';
import Logo from './Logo';

export default function Header() {
  const { isConnected, address, disconnectWallet } = useHathor();
  const [showModal, setShowModal] = useState(false);

  const handleConnect = async () => {
    setShowModal(true);
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
  };

  return (
    <>
      <header className="border-b border-line bg-ink/70 backdrop-blur sticky top-0 z-10">
        <div className="shell flex items-center justify-between py-4">
          <a href="/" className="flex items-center gap-3 group">
            <Logo size={40} className="group-hover:-translate-y-0.5 transition-transform duration-200" />
            <span className="text-3xl font-bold tracking-tight text-snow">Halshi</span>
          </a>

          {isConnected ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-panel rounded-full border border-line">
                <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
                <span className="font-mono text-xs text-snow">{formatAddress(address || '')}</span>
              </div>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 text-sm text-fog hover:text-snow border border-line hover:border-fog rounded-full transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              className="px-5 py-2 bg-accent hover:bg-accent-dim text-ink rounded-full font-semibold text-sm transition-colors"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>

      <WalletConnectionModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}
