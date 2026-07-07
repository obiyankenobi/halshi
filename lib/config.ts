function parseContractIds(): string[] {
  try {
    const value = process.env.NEXT_PUBLIC_CONTRACT_IDS || '[]';
    return JSON.parse(value) as string[];
  } catch (error) {
    console.error('Failed to parse NEXT_PUBLIC_CONTRACT_IDS:', error);
    return [];
  }
}

export type Network = 'mainnet' | 'testnet' | 'localnet';

// The on-chain network name differs from our Network key for localnet:
// Hathor Forge's private network is named 'privatenet'.
export const hathorNetworkNames: Record<Network, string> = {
  mainnet: 'mainnet',
  testnet: 'testnet',
  localnet: 'privatenet',
};

export function getChainId(network: Network): string {
  return `hathor:${hathorNetworkNames[network]}`;
}

export const config = {
  useMockWallet: process.env.NEXT_PUBLIC_USE_MOCK_WALLET === 'true',
  defaultNetwork: (process.env.NEXT_PUBLIC_DEFAULT_NETWORK || 'testnet') as Network,
  hathorNodeUrls: {
    'testnet': process.env.NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET || 'https://node1.india.testnet.hathor.network/v1a',
    'mainnet': process.env.NEXT_PUBLIC_HATHOR_NODE_URL_MAINNET || 'https://node1.mainnet.hathor.network/v1a',
    'localnet': process.env.NEXT_PUBLIC_HATHOR_NODE_URL_LOCALNET || 'http://localhost:49180/v1a',
  },
  contractIds: parseContractIds(),
  betBlueprintId: process.env.NEXT_PUBLIC_BET_BLUEPRINT_ID || '',
};
