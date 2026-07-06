'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { WalletState, ContractTxParams } from '@/types';
import { HathorRPCService } from '@/lib/hathorRPC';
import { useUnifiedWallet } from './UnifiedWalletContext';
import { config } from '@/lib/config';

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

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const BALANCE_CACHE_KEY = 'hathor_balance_cache';
const BALANCE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface BalanceCache {
  balance: string; // Store as string since bigint can't be JSON serialized
  timestamp: number;
  address: string;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { adapter } = useUnifiedWallet();
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<bigint>(0n);
  const [rpcService] = useState(() => new HathorRPCService(config.useMockWallet));

  // Load cached balance from localStorage
  const loadCachedBalance = (addr: string): bigint | null => {
    try {
      const cached = localStorage.getItem(BALANCE_CACHE_KEY);
      if (!cached) return null;

      const cache: BalanceCache = JSON.parse(cached);
      const now = Date.now();

      // Check if cache is for the same address and is still valid (less than 15 minutes old)
      if (cache.address === addr && (now - cache.timestamp) < BALANCE_CACHE_DURATION) {
        return BigInt(cache.balance);
      }

      return null;
    } catch (error) {
      console.error('Failed to load cached balance:', error);
      return null;
    }
  };

  // Save balance to cache
  const saveCachedBalance = (addr: string, bal: bigint) => {
    try {
      const cache: BalanceCache = {
        balance: bal.toString(),
        timestamp: Date.now(),
        address: addr,
      };
      localStorage.setItem(BALANCE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('Failed to save cached balance:', error);
    }
  };

  // Define fetchBalance before it's used in useEffect
  const fetchBalance = async (addr: string, forceRefresh: boolean = false) => {
    if (!addr) return;

    // Check cache first unless forced refresh
    if (!forceRefresh) {
      const cachedBalance = loadCachedBalance(addr);
      if (cachedBalance !== null) {
        console.log('Using cached balance');
        setBalance(cachedBalance);
        return;
      }
    }

    if (config.useMockWallet) {
      setBalance(100000n);
      saveCachedBalance(addr, 100000n);
      return;
    }

    try {
      const balanceInfo = await rpcService.getBalance({
        network: 'testnet',
        tokens: ['00'],
      });
      const balance = balanceInfo.response[0]?.balance?.unlocked || 0n;
      setBalance(balance);
      saveCachedBalance(addr, balance);
    } catch (error: any) {
      console.log('Balance fetch was rejected or failed. This is normal if the wallet requires manual approval.');
      setBalance(0n);
    }
  };

  // Update rpcService based on active wallet adapter
  useEffect(() => {
    if (adapter?.isConnected) {
      rpcService.updateClientAndSession(undefined, undefined, adapter.request);
    }
  }, [adapter, rpcService]);

  // Auto-fetch balance when wallet connects
  useEffect(() => {
    if (adapter?.isConnected && adapter.address) {
      setAddress(adapter.address);
      fetchBalance(adapter.address);
    } else if (!adapter?.isConnected) {
      setAddress(null);
      setBalance(0n);
    }
  }, [adapter?.isConnected, adapter?.address]);

  // Convert balance from cents (bigint) to token units (number) for backwards compatibility
  const walletBalance = typeof balance === 'bigint' ? Number(balance) / 100 : 0;

  const connectWallet = () => {
    setConnected(true);
    setAddress('0x7a3f...9b2c');
    setBalance(100000n);
  };

  const disconnectWallet = () => {
    setConnected(false);
    setAddress(null);
    setBalance(0n);
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
      network: 'testnet',
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

  const refreshBalance = async () => {
    if (address) {
      await fetchBalance(address, true); // Force refresh
    }
  };

  return (
    <WalletContext.Provider value={{
      connected,
      address,
      balance,
      walletBalance,
      connectWallet,
      disconnectWallet,
      setBalance,
      sendContractTx,
      refreshBalance,
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
