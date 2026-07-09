'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WalletAdapter, WalletType } from '@/types/wallet';
import { useMetaMask } from './MetaMaskContext';
import { useWalletConnect } from './WalletConnectContext';
import { config, getChainId } from '@/lib/config';

export type ConnectionStatus = 'restoring' | 'connected' | 'disconnected';

interface UnifiedWalletContextType {
  adapter: WalletAdapter | null;
  walletType: WalletType;
  setWalletType: (type: WalletType) => void;
  /**
   * 'restoring' while a persisted session may still come back — render
   * neither the connect button nor the address until this settles.
   */
  status: ConnectionStatus;
}

const UnifiedWalletContext = createContext<UnifiedWalletContextType | undefined>(undefined);

export function UnifiedWalletProvider({ children }: { children: ReactNode }) {
  const metaMask = useMetaMask();
  const walletConnect = useWalletConnect();
  const [walletType, setWalletTypeState] = useState<WalletType>(null);
  // The stored type read once at mount — unlike walletType state (which the
  // connection-sync effect resets while nothing is connected yet), this keeps
  // telling us which wallet's restore we are waiting for.
  const [storedType, setStoredType] = useState<WalletType>(null);
  const [storedTypeLoaded, setStoredTypeLoaded] = useState(false);

  // Load wallet type from localStorage on mount
  useEffect(() => {
    const storedWalletType = localStorage.getItem('wallet_type') as WalletType;
    if (storedWalletType) {
      setWalletTypeState(storedWalletType);
    }
    setStoredType(storedWalletType);
    setStoredTypeLoaded(true);
  }, []);

  // Update wallet type when connections change
  useEffect(() => {
    if (metaMask.isConnected && walletType !== 'metamask') {
      setWalletTypeState('metamask');
    } else if (walletConnect.isConnected && walletType !== 'walletconnect') {
      setWalletTypeState('walletconnect');
    } else if (!metaMask.isConnected && !walletConnect.isConnected && walletType !== null) {
      setWalletTypeState(null);
    }
  }, [metaMask.isConnected, walletConnect.isConnected, walletType]);

  // Determine which adapter to use based on wallet type
  const adapter: WalletAdapter | null = (() => {
    if (walletType === 'metamask' && metaMask.isConnected) {
      return {
        isConnected: metaMask.isConnected,
        isInitializing: false,
        address: metaMask.address,
        connect: metaMask.connect,
        disconnect: metaMask.disconnect,
        request: metaMask.request,
      };
    } else if (walletType === 'walletconnect' && walletConnect.isConnected) {
      return {
        isConnected: walletConnect.isConnected,
        isInitializing: walletConnect.isInitializing,
        address: walletConnect.getFirstAddress(),
        connect: () => walletConnect.connect(undefined),
        disconnect: walletConnect.disconnect,
        request: async <T = any>(method: string, params?: any): Promise<T> => {
          if (!walletConnect.client || !walletConnect.session) {
            throw new Error('WalletConnect not connected');
          }
          return walletConnect.client.request<T>({
            chainId: getChainId(config.defaultNetwork),
            topic: walletConnect.session.topic,
            request: { method, params },
          });
        },
      };
    }
    return null;
  })();

  const setWalletType = (type: WalletType) => {
    setWalletTypeState(type);
    if (type) {
      localStorage.setItem('wallet_type', type);
    } else {
      localStorage.removeItem('wallet_type');
    }
  };

  // Undecided until localStorage is read and — when a session is stored —
  // until that wallet finishes restoring it.
  const status: ConnectionStatus = (() => {
    if (adapter) return 'connected';
    if (!storedTypeLoaded) return 'restoring';
    if (storedType === 'metamask' && metaMask.isRestoring) return 'restoring';
    if (storedType === 'walletconnect' && (walletConnect.isInitializing || !walletConnect.isRestored)) {
      return 'restoring';
    }
    return 'disconnected';
  })();

  return (
    <UnifiedWalletContext.Provider value={{ adapter, walletType, setWalletType, status }}>
      {children}
    </UnifiedWalletContext.Provider>
  );
}

export function useUnifiedWallet() {
  const context = useContext(UnifiedWalletContext);
  if (context === undefined) {
    throw new Error('useUnifiedWallet must be used within a UnifiedWalletProvider');
  }
  return context;
}
