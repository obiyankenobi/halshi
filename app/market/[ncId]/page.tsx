'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import BetPanel from '@/components/market/BetPanel';
import ResolvePanel from '@/components/market/ResolvePanel';
import ClaimPanel from '@/components/market/ClaimPanel';
import ActivityFeed from '@/components/market/ActivityFeed';
import { StatusBadge, outcomePercent } from '@/components/MarketCard';
import { useMarket } from '@/lib/useMarkets';
import { marketStatus, positionsFor } from '@/lib/betContract';
import { useWallet } from '@/contexts/WalletContext';
import { formatAddress, formatTokenAmount } from '@/lib/utils';

export default function MarketPage() {
  const params = useParams<{ ncId: string }>();
  const ncId = typeof params?.ncId === 'string' ? params.ncId : null;
  const { meta, state, loading, error, refresh } = useMarket(ncId);
  const { address } = useWallet();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="container mx-auto px-6 py-20 text-center text-slate-400">Loading market…</main>
      </div>
    );
  }

  if (error || !meta || !state) {
    return (
      <div className="min-h-screen bg-slate-900">
        <Header />
        <main className="container mx-auto px-6 py-20 text-center">
          <p className="text-red-400 mb-4">{error || 'Market not found'}</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300">
            ← Back to markets
          </Link>
        </main>
      </div>
    );
  }

  const status = marketStatus(state);
  const isCreator = Boolean(address && address === meta.creatorAddress);
  const positions = address ? positionsFor(state, address) : {};
  const hasPosition = Object.keys(positions).length > 0;

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-6 py-8 max-w-5xl">
        <Link href="/" className="text-sm text-slate-400 hover:text-slate-300">
          ← Markets
        </Link>

        <div className="flex items-start justify-between gap-4 mt-4 mb-2">
          <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">{meta.question}</h2>
          <StatusBadge status={status} />
        </div>

        {meta.description && <p className="text-slate-400 mb-4">{meta.description}</p>}

        <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500 mb-8">
          <span>
            Pool: <span className="text-slate-300">{formatTokenAmount(state.total)} HTR</span>
          </span>
          <span>
            Betting {status === 'open' ? 'closes' : 'closed'}:{' '}
            <span className="text-slate-300">{new Date(state.dateLastBet * 1000).toLocaleString()}</span>
          </span>
          <span>
            Creator: <span className="text-slate-300 font-mono">{formatAddress(meta.creatorAddress)}</span>
          </span>
          <span>
            Contract: <span className="text-slate-300 font-mono">{formatAddress(meta.ncId)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-4">Outcomes</h3>
              <div className="space-y-3">
                {meta.outcomes.map((outcome) => {
                  const pool = state.outcomePools[outcome] ?? 0n;
                  const percent = state.total > 0n ? Number((pool * 1000n) / state.total) / 10 : 0;
                  const isWinner = state.finalResult === outcome;
                  return (
                    <div key={outcome}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className={isWinner ? 'text-blue-400 font-semibold' : 'text-slate-200'}>
                          {outcome}
                          {isWinner && ' ✓ winner'}
                        </span>
                        <span className="text-slate-400 font-mono">
                          {outcomePercent(pool, state.total)} · {formatTokenAmount(pool)} HTR
                        </span>
                      </div>
                      <div className="h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isWinner ? 'bg-blue-500' : 'bg-slate-600'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasPosition && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-white font-semibold mb-3">Your position</h3>
                <ul className="space-y-1.5">
                  {Object.entries(positions).map(([outcome, amount]) => (
                    <li key={outcome} className="flex justify-between text-sm">
                      <span className="text-slate-300">{outcome}</span>
                      <span className="text-slate-400 font-mono">{formatTokenAmount(amount)} HTR</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
              <h3 className="text-white font-semibold mb-3">Activity</h3>
              <ActivityFeed state={state} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {status === 'open' && <BetPanel meta={meta} state={state} onPlaced={refresh} />}
            {status === 'closed' && isCreator && (
              <ResolvePanel meta={meta} state={state} onResolved={refresh} />
            )}
            {status === 'closed' && !isCreator && (
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
                <h3 className="text-white font-semibold mb-1">Betting closed</h3>
                <p className="text-sm text-slate-400">Waiting for the market creator to declare the result.</p>
              </div>
            )}
            {status === 'resolved' && <ClaimPanel meta={meta} state={state} onClaimed={refresh} />}
          </div>
        </div>
      </main>
    </div>
  );
}
