function parseContractIds(): string[] {
  try {
    const value = process.env.NEXT_PUBLIC_CONTRACT_IDS || '[]';
    return JSON.parse(value) as string[];
  } catch (error) {
    console.error('Failed to parse NEXT_PUBLIC_CONTRACT_IDS:', error);
    return [];
  }
}

export const config = {
  useMockWallet: process.env.NEXT_PUBLIC_USE_MOCK_WALLET === 'true',
  defaultNetwork: (process.env.NEXT_PUBLIC_DEFAULT_NETWORK || 'testnet') as Network,
  hathorNodeUrls: {
    'testnet': process.env.NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET || 'https://node1.india.testnet.hathor.network/v1a',
    'mainnet': process.env.NEXT_PUBLIC_HATHOR_NODE_URL_MAINNET || 'https://node1.mainnet.hathor.network/v1a',
  },
  contractIds: parseContractIds(),
};

export type Network = 'mainnet' | 'testnet';
