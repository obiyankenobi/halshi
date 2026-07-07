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
    <div className="min-h-screen">
      <Header />

      <main className="shell py-10">
        <div className="flex items-end justify-between mb-10">
          <h2 className="text-4xl font-bold text-snow tracking-tight">Markets</h2>
          <Link
            href="/create"
            className="px-5 py-2.5 bg-accent hover:bg-accent-dim text-ink rounded-full font-semibold text-sm transition-colors"
          >
            + Create market
          </Link>
        </div>

        {loading && (
          <div className="text-center py-24 text-fog font-mono text-sm">loading markets…</div>
        )}

        {error && !loading && (
          <div className="text-center py-24 text-ember font-mono text-sm">{error}</div>
        )}

        {!loading && !error && markets.length === 0 && (
          <div className="text-center py-24 border border-dashed border-line rounded-2xl">
            <p className="text-snow text-lg mb-2">No markets yet</p>
            <p className="text-fog mb-6">Be the first to create a prediction market.</p>
            <Link
              href="/create"
              className="px-5 py-2.5 bg-accent hover:bg-accent-dim text-ink rounded-full font-semibold text-sm transition-colors"
            >
              Create the first market
            </Link>
          </div>
        )}

        {open.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
            {open.map((m) => (
              <MarketCard key={m.meta.ncId} market={m} />
            ))}
          </div>
        )}

        {closed.length > 0 && (
          <>
            <p className="microlabel text-fog mb-4">closed & resolved</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {closed.map((m) => (
                <MarketCard key={m.meta.ncId} market={m} />
              ))}
            </div>
          </>
        )}

        <footer className="flex items-center justify-between text-fog py-8 mt-16 border-t border-line">
          <span className="microlabel">halshi — parimutuel markets on nano contracts</span>
          <a
            href="https://hathor.network"
            target="_blank"
            rel="noopener noreferrer"
            className="microlabel hover:text-snow transition-colors"
          >
            hathor.network ↗
          </a>
        </footer>
      </main>
    </div>
  );
}
