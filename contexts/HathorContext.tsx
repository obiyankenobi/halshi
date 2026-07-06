'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HathorCoreAPI } from '@/lib/hathorCoreAPI';
import { ContractState } from '@/types/hathor';
import { config, Network } from '@/lib/config';
import { useWalletConnect } from './WalletConnectContext';
import { useMetaMask } from './MetaMaskContext';
import { useWallet } from './WalletContext';

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

const HathorContext = createContext<HathorContextType | undefined>(undefined);

export function HathorProvider({ children }: { children: ReactNode }) {
  const walletConnect = useWalletConnect();
  const metaMask = useMetaMask();
  const wallet = useWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network>(config.defaultNetwork);
  const [contractStates, setContractStates] = useState<Record<string, ContractState>>({});
  const [coreAPI, setCoreAPI] = useState(() => new HathorCoreAPI(network));

  const isConnected = walletConnect.isConnected || metaMask.isConnected;

  useEffect(() => {
    setCoreAPI(new HathorCoreAPI(network));
  }, [network]);

  useEffect(() => {
    if (isConnected) {
      // Get address from the connected wallet
      if (walletConnect.isConnected) {
        const addr = walletConnect.getFirstAddress();
        setAddress(addr);
      } else if (metaMask.isConnected) {
        setAddress(metaMask.address);
      }
    } else {
      setAddress(null);
      wallet.setBalance(0n);
    }
  }, [isConnected, network, walletConnect, metaMask]);

  const connectWallet = async () => {
    try {
      await walletConnect.connect();
      // walletConnect context will update isConnected and addresses; effect above will pick it up
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      // Disconnect whichever wallet is connected
      if (walletConnect.isConnected) {
        await walletConnect.disconnect();
      }
      if (metaMask.isConnected) {
        await metaMask.disconnect();
      }
      // Clear wallet type from localStorage
      localStorage.removeItem('wallet_type');
      // wallet contexts will update isConnected; effect above will clear address/balance
    } catch (error) {
      console.error('Failed to disconnect wallet:', error);
      // don't rethrow to avoid breaking UI flows
    }
  };

  const switchNetwork = async (newNetwork: Network) => {
    setNetwork(newNetwork);
    // If WalletConnect supports network switching, attempt it
    if (typeof (walletConnect as any).switchNetwork === 'function') {
      try {
        await (walletConnect as any).switchNetwork(newNetwork);
      } catch (err) {
        console.warn('WalletConnect network switch failed (continuing with client-side network):', err);
      }
    }
  };

  const getContractState = async (contractId: string): Promise<ContractState> => {
    if (config.useMockWallet) {
      // Return mock contract state for development
      return {
        token_uid: '00',
        max_bet_amount: 10000n,
        house_edge_basis_points: 200,
        random_bit_length: 16,
        available_tokens: 100000000n,
        total_liquidity_provided: 100000000n,
      };
    }

    try {
      const state = await coreAPI.getContractState(contractId);
      // Cache the state
      setContractStates(prev => ({ ...prev, [contractId]: state }));
      return state;
    } catch (error) {
      console.error('Failed to fetch contract state:', error);
      throw error;
    }
  };

  return (
    <HathorContext.Provider
      value={{
        isConnected,
        address,
        network,
        contractStates,
        getContractState,
        coreAPI,
        connectWallet,
        disconnectWallet,
        switchNetwork,
      }}
    >
      {children}
    </HathorContext.Provider>
  );
}

export function useHathor() {
  const context = useContext(HathorContext);
  if (context === undefined) {
    throw new Error('useHathor must be used within a HathorProvider');
  }
  return context;
}
