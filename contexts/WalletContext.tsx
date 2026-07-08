'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ContractTxParams } from '@/types';
import { HathorRPCService } from '@/lib/hathorRPC';
import { useUnifiedWallet } from './UnifiedWalletContext';
import { config, hathorNetworkNames } from '@/lib/config';

interface WalletContextType {
  connected: boolean;
  address: string | null;
  connectWallet: () => void;
  disconnectWallet: () => void;
  sendContractTx: (params: ContractTxParams) => Promise<any>;
  rpcService: HathorRPCService;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const { adapter } = useUnifiedWallet();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [rpcService] = useState(() => new HathorRPCService(config.useMockWallet));

  // Update rpcService based on active wallet adapter
  useEffect(() => {
    if (adapter?.isConnected) {
      rpcService.updateClientAndSession(undefined, undefined, adapter.request);
    }
  }, [adapter, rpcService]);

  // Track the connected address
  useEffect(() => {
    if (adapter?.isConnected && adapter.address) {
      setAddress(adapter.address);
    } else if (!adapter?.isConnected) {
      setAddress(null);
    }
  }, [adapter?.isConnected, adapter?.address]);

  const connectWallet = () => {
    setConnected(true);
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress(null);
  };

  const sendContractTx = async (params: ContractTxParams) => {
    if (!adapter?.isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    console.log('Sending contract transaction:', {
      contractId: params.contractId,
      method: params.method,
      args: params.args,
      actions: params.actions,
      address,
    });

    const txParams = {
      network: hathorNetworkNames[config.defaultNetwork],
      nc_id: params.contractId,
      method: params.method,
      args: params.args,
      actions: params.actions,
      push_tx: true,
    };

    try {
      const result = await rpcService.sendNanoContractTx(txParams);
      console.log('Contract transaction sent successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to send contract transaction:', error);
      throw error;
    }
  };

  return (
    <WalletContext.Provider value={{
      connected,
      address,
      connectWallet,
      disconnectWallet,
      sendContractTx,
      rpcService,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
