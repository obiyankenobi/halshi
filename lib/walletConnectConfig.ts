export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

export const WALLETCONNECT_METADATA = {
  name: 'Halshi Tmp',
  description: 'Decentralized application on Hathor Network',
  url: typeof window !== 'undefined' ? window.location.origin : 'https://hathor.network',
  icons: [typeof window !== 'undefined' ? `${window.location.origin}/icon.png` : 'https://hathor.network/favicon.ico'],
};

export const RELAY_URL = 'wss://relay.walletconnect.com';
