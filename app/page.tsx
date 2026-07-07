'use client';

import Link from 'next/link';
import Header from '@/components/Header';
import MarketCard from '@/components/MarketCard';
import { useMarkets } from '@/lib/useMarkets';
import { marketStatus } from '@/lib/betContract';

export default function Home() {
  const { markets, loading, error } = useMarkets();

  const open = markets.filter((m) => m.state && marketStatus(m.state) === 'open');
  const closed = markets.filter((m) => !m.state || marketStatus(m.state) !== 'open');

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-white">Markets</h2>
            <p className="text-slate-400 mt-1">Bet on anything. Settled on Hathor.</p>
          </div>
          <Link
            href="/create"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + Create market
          </Link>
        </div>

        {loading && (
          <div className="text-center py-20 text-slate-400">Loading markets…</div>
        )}

        {error && !loading && (
          <div className="text-center py-20 text-red-400">{error}</div>
        )}

        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-300 text-lg mb-2">No markets yet</p>
            <p className="text-slate-500 mb-6">Be the first to create a prediction market.</p>
            <Link
              href="/create"
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Create the first market
            </Link>
          </div>
        )}

        {open.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
            {open.map((m) => (
              <MarketCard key={m.meta.ncId} market={m} />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <>
            <h3 className="text-lg font-semibold text-slate-300 mb-4">Closed & resolved</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closed.map((m) => (
                <MarketCard key={m.meta.ncId} market={m} />
              ))}
            </div>
          </>
        )}

        <footer className="text-center text-sm text-slate-400 py-8 mt-12 border-t border-slate-700">
          <p>Halshi — prediction markets on Hathor nano contracts</p>
        </footer>
      </main>
    </div>
  );
}
