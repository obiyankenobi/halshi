import type { Metadata } from 'next';
import { Space_Grotesk, IBM_Plex_Mono } from 'next/font/google';
import { WalletProvider } from '@/contexts/WalletContext';
import { HathorProvider } from '@/contexts/HathorContext';
import { WalletConnectProvider } from '@/contexts/WalletConnectContext';
import { MetaMaskProvider } from '@/contexts/MetaMaskContext';
import { UnifiedWalletProvider } from '@/contexts/UnifiedWalletContext';
import { ToastProvider, Toaster } from '@/lib/toast';
import './globals.css';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Halshi — Prediction Markets on Hathor',
  description: 'Create markets and bet on outcomes, settled by nano contracts on Hathor Network',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${spaceGrotesk.variable} ${plexMono.variable}`}>
      <body>
        <ToastProvider>
          <WalletConnectProvider>
            <MetaMaskProvider>
              <UnifiedWalletProvider>
                <WalletProvider>
                  <HathorProvider>
                    {children}
                    <Toaster />
                  </HathorProvider>
                </WalletProvider>
              </UnifiedWalletProvider>
            </MetaMaskProvider>
          </WalletConnectProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
