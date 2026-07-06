export interface WalletState {
  connected: boolean;
  address: string | null;
  walletBalance: number;
}

export interface ContractTxParams {
  contractId: string;
  method: string;
  args: any[];
  actions: Array<{
    type: 'deposit' | 'withdrawal';
    amount: string;
    token: string;
    address?: string;
  }>;
}
