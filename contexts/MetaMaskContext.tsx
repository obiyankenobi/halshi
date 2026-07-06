'use client';

import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { HathorRPCService } from '@/lib/hathorRPC';
import { config } from '@/lib/config';

interface IMetaMaskContext {
  address: string | null;
  isConnected: boolean;
  isInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  request: <T = any>(method: string, params?: any) => Promise<T>;
}

const MetaMaskContext = createContext<IMetaMaskContext>({} as IMetaMaskContext);

const SNAP_ID = 'npm:@hathor/snap';
const SNAP_VERSION = '*'; // Use latest version

export function MetaMaskProvider({ children }: { children: ReactNode | ReactNode[] }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  // Helper method to call MetaMask Snap and parse JSON response
  const metamask_request = useCallback(async (method: string, params?: any): Promise<any> => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed');
    }

    const resultStr = await window.ethereum.request({
      method: 'wallet_invokeSnap',
      params: {
        snapId: SNAP_ID,
        request: {
          method,
          params,
        },
      },
    });

    return typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;
  }, []);

  // Create RPC service instance configured for MetaMask
  const [rpcService] = useState(() => new HathorRPCService(config.useMockWallet, undefined, undefined, metamask_request));

  // Check if MetaMask is installed
  useEffect(() => {
    const checkMetaMask = () => {
      if (typeof window !== 'undefined' && window.ethereum) {
        setIsInstalled(true);
      }
    };
    checkMetaMask();
  }, []);

  // Check persisted connection on mount
  useEffect(() => {
    const checkPersistedConnection = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;

      try {
        const walletType = localStorage.getItem('wallet_type');
        if (walletType !== 'metamask') return;

        // Check if snap is already connected
        const snaps = await window.ethereum.request({
          method: 'wallet_getSnaps',
        });

        if (snaps?.[SNAP_ID]) {
          // Get address from snap using RPC service
          const result = await rpcService.getAddress({
            network: 'testnet',
            type: 'index',
            index: 0
          });

          // MetaMask Snap returns response in nested format
          const addressData = (result as any)?.response || result;
          if (addressData?.address) {
            setAddress(addressData.address);
            setIsConnected(true);
          }
        }
      } catch (error) {
        console.error('Failed to check persisted MetaMask connection:', error);
      }
    };

    checkPersistedConnection();
  }, [rpcService]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask extension.');
    }

    try {
      // Request snap connection
      const result = await window.ethereum.request({
        method: 'wallet_requestSnaps',
        params: {
          [SNAP_ID]: {
            version: SNAP_VERSION,
          },
        },
      });

      if (!result?.[SNAP_ID]) {
        throw new Error('Failed to connect to Hathor Snap');
      }

      // Get address from snap using RPC service
      const addressResult = await rpcService.getAddress({
        network: 'testnet',
        type: 'index',
        index: 0
      });

      // MetaMask Snap returns response in nested format
      const addressData = (addressResult as any)?.response || addressResult;
      if (!addressData?.address) {
        throw new Error('Failed to get address from snap');
      }

      setAddress(addressData.address);
      setIsConnected(true);
      localStorage.setItem('wallet_type', 'metamask');
      localStorage.setItem('address', addressData.address);
    } catch (error: any) {
      console.error('Failed to connect to MetaMask Snap:', error);
      throw new Error(error?.message || 'Failed to connect to MetaMask Snap');
    }
  }, [rpcService]);

  const disconnect = useCallback(async () => {
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem('wallet_type');
    localStorage.removeItem('address');
  }, []);

  const request = useCallback(
    async <T = any,>(method: string, params?: any): Promise<T> => {
      if (!isConnected) {
        throw new Error('MetaMask Snap is not connected');
      }

      try {
        const result = await metamask_request(method, params);
        return result as T;
      } catch (error: any) {
        console.error('MetaMask Snap request failed:', error);
        throw new Error(error?.message || 'MetaMask Snap request failed');
      }
    },
    [isConnected, metamask_request]
  );

  const value = useMemo(
    () => ({
      address,
      isConnected,
      isInstalled,
      connect,
      disconnect,
      request,
    }),
    [address, isConnected, isInstalled, connect, disconnect, request]
  );

  return <MetaMaskContext.Provider value={value}>{children}</MetaMaskContext.Provider>;
}

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error('useMetaMask must be used within a MetaMaskProvider');
  }
  return context;
}
