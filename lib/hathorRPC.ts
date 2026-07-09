import { HathorRPCRequest, HathorRPCResponse, GetBalanceParams, GetAddressParams, SendNanoContractTxParams, SignOracleDataParams } from '@/types/hathor';
import Client from '@walletconnect/sign-client';
import { SessionTypes } from '@walletconnect/types';
import { Network, config, getChainId } from '@/lib/config';

type RequestFunction = <T = any>(method: string, params?: any) => Promise<T>;

/** Map raw wallet errors to messages that make sense to users. */
function friendlyWalletError(message: string | undefined): string {
  if (!message) return 'RPC request failed';
  if (/not enough utxos/i.test(message)) return 'Not enough funds in the wallet';
  return message;
}

export class HathorRPCService {
  private useMock: boolean;
  private client: Client | undefined;
  private session: SessionTypes.Struct | undefined;
  private customRequest: RequestFunction | undefined;
  private network: Network;

  constructor(useMock: boolean = false, client?: Client, session?: SessionTypes.Struct, customRequest?: RequestFunction, network: Network = config.defaultNetwork) {
    this.useMock = useMock;
    this.client = client;
    this.session = session;
    this.customRequest = customRequest;
    this.network = network;
  }

  updateClientAndSession(client?: Client, session?: SessionTypes.Struct, customRequest?: RequestFunction) {
    this.client = client;
    this.session = session;
    this.customRequest = customRequest;
  }

  setNetwork(network: Network) {
    this.network = network;
  }

  async request<T = any>(method: string, params?: any): Promise<T> {
    if (this.useMock) {
      return this.mockRequest<T>(method, params);
    }

    // Use custom request function if provided (e.g., MetaMask)
    if (this.customRequest) {
      console.debug(`[hathorRPC] → ${method} (custom transport)`, params);
      try {
        const result = await this.customRequest<T>(method, params);
        console.debug(`[hathorRPC] ← ${method} ok`, result);
        return result;
      } catch (error: any) {
        console.error(`[hathorRPC] ← ${method} FAILED:`, error);
        throw new Error(friendlyWalletError(error?.message));
      }
    }

    // Fall back to WalletConnect
    if (!this.client || !this.session) {
      throw new Error('Wallet not connected. Please connect your wallet.');
    }

    const relayerConnected = (this.client.core?.relayer as any)?.connected;
    console.debug(
      `[hathorRPC] → ${method} (walletconnect, topic ${this.session.topic.slice(0, 8)}…, relayer connected: ${relayerConnected})`,
      params
    );

    try {
      const result = await this.client.request<T>({
        chainId: getChainId(this.network),
        topic: this.session.topic,
        request: {
          method,
          params,
        },
      });

      console.debug(`[hathorRPC] ← ${method} ok`, result);
      return result;
    } catch (error: any) {
      console.error(`[hathorRPC] ← ${method} FAILED:`, error);
      throw new Error(friendlyWalletError(error?.message));
    }
  }

  async getConnectedNetwork(): Promise<{ network: string; genesisHash: string }> {
    return this.request('htr_getConnectedNetwork');
  }

  async getBalance(params: GetBalanceParams): Promise<{ response: any[] }> {
    return this.request('htr_getBalance', params);
  }

  async getAddress(params: GetAddressParams): Promise<{ address: string; index: number; addressPath: string }> {
    return this.request('htr_getAddress', params);
  }

  async sendNanoContractTx(params: SendNanoContractTxParams): Promise<any> {
    return this.request('htr_sendNanoContractTx', params);
  }

  // Response shape (hathor-rpc-lib): { type, response: { data, signedData, oracle } }
  async signOracleData(params: SignOracleDataParams): Promise<any> {
    return this.request('htr_signOracleData', params);
  }

  private async mockRequest<T>(method: string, params?: any): Promise<T> {
    await new Promise(resolve => setTimeout(resolve, 500));

    switch (method) {
      case 'htr_getConnectedNetwork':
        return { network: 'testnet', genesisHash: '0x123...' } as T;

      case 'htr_getBalance':
        return {
          response: [{
            token: { id: '00', name: 'Hathor', symbol: 'HTR' },
            balance: { unlocked: 1250.50, locked: 0 },
            tokenAuthorities: { unlocked: { mint: false, melt: false }, locked: { mint: false, melt: false } },
            transactions: 42,
            lockExpires: null,
          }]
        } as T;

      case 'htr_getAddress':
        return { address: 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp', index: 0, addressPath: "m/44'/280'/0'/0/0" } as T;

      case 'htr_sendNanoContractTx':
        return {
          hash: '00000000' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
          success: true,
          timestamp: Date.now(),
          nonce: Math.floor(Math.random() * 1000000),
        } as T;

      case 'htr_signOracleData':
        return {
          type: 'SignOracleDataResponse',
          response: {
            data: params?.data || 'mock-result',
            signedData: {
              type: 'str',
              signature: 'deadbeef' + Math.random().toString(16).substring(2, 10),
              value: params?.data || 'mock-result',
            },
            oracle: params?.oracle || 'WYBwT3xLpDnHNtYZiU52oanupVeDKhAvNp',
          },
        } as T;

      default:
        throw new Error(`Mock not implemented for method: ${method}`);
    }
  }
}
