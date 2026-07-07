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
import CopyButton from '@/components/CopyButton';

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="microlabel text-fog/70 mb-1">{label}</p>
      <p className="font-mono text-sm text-snow">{children}</p>
    </div>
  );
}

export default function MarketPage() {
  const params = useParams<{ ncId: string }>();
  const ncId = typeof params?.ncId === 'string' ? params.ncId : null;
  const { meta, state, loading, error, refresh } = useMarket(ncId);
  const { address } = useWallet();

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="shell py-24 text-center text-fog font-mono text-sm">loading market…</main>
      </div>
    );
  }

  if (error || !meta || !state) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="shell py-24 text-center">
          <p className="text-ember font-mono text-sm mb-4">{error || 'Market not found'}</p>
          <Link href="/" className="text-accent hover:text-accent-dim">
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
    <div className="min-h-screen">
      <Header />

      <main className="shell py-8">
        <Link href="/" className="microlabel text-fog hover:text-snow transition-colors">
          ← markets
        </Link>

        <div className="flex items-start justify-between gap-4 mt-5 mb-3">
          <h2 className="text-3xl md:text-4xl font-bold text-snow leading-tight tracking-tight">
            {meta.question}
          </h2>
          <StatusBadge status={status} />
        </div>

        {meta.description && <p className="text-fog mb-6 max-w-2xl">{meta.description}</p>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-panel border border-line rounded-2xl px-5 py-4 mb-8">
          <MetaItem label="pool">{formatTokenAmount(state.total)} HTR</MetaItem>
          <MetaItem label={status === 'open' ? 'betting closes' : 'betting closed'}>
            {new Date(state.dateLastBet * 1000).toLocaleString()}
          </MetaItem>
          <MetaItem label="creator / oracle">
            <span className="inline-flex items-center gap-1.5">
              {formatAddress(meta.creatorAddress)}
              <CopyButton value={meta.creatorAddress} label="Copy oracle address" />
            </span>
          </MetaItem>
          <MetaItem label="contract">
            <span className="inline-flex items-center gap-1.5">
              {`${meta.ncId.slice(0, 8)}...${meta.ncId.slice(-8)}`}
              <CopyButton value={meta.ncId} label="Copy contract ID" />
            </span>
          </MetaItem>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-panel border border-line rounded-2xl p-6">
              <p className="microlabel text-fog mb-5">outcomes</p>
              <div className="space-y-5">
                {meta.outcomes.map((outcome) => {
                  const pool = state.outcomePools[outcome] ?? 0n;
                  const percent = state.total > 0n ? Number((pool * 1000n) / state.total) / 10 : 0;
                  const isWinner = state.finalResult === outcome;
                  return (
                    <div key={outcome}>
                      <div className="flex items-baseline justify-between mb-1.5">
                        <span className={`${isWinner ? 'text-accent font-semibold' : 'text-snow'}`}>
                          {outcome}
                          {isWinner && <span className="microlabel ml-2">✓ winner</span>}
                        </span>
                        <span className="font-mono text-sm">
                          <span className={isWinner ? 'text-accent' : 'text-snow'}>{outcomePercent(pool, state.total)}</span>
                          <span className="text-fog/70 text-xs ml-2">{formatTokenAmount(pool)} HTR</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-inset rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${isWinner ? 'bg-accent' : 'bg-fog/40'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {hasPosition && (
              <div className="bg-panel border border-line rounded-2xl p-6">
                <p className="microlabel text-fog mb-4">your position</p>
                <ul className="space-y-2">
                  {Object.entries(positions).map(([outcome, amount]) => (
                    <li key={outcome} className="flex justify-between text-sm">
                      <span className="text-snow">{outcome}</span>
                      <span className="font-mono text-fog">{formatTokenAmount(amount)} HTR</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-panel border border-line rounded-2xl p-6">
              <p className="microlabel text-fog mb-4">activity</p>
              <ActivityFeed state={state} />
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {status === 'open' && <BetPanel meta={meta} state={state} onPlaced={refresh} />}
            {status === 'closed' && isCreator && (
              <ResolvePanel meta={meta} state={state} onResolved={refresh} />
            )}
            {status === 'closed' && !isCreator && (
              <div className="bg-panel border border-line rounded-2xl p-6">
                <h3 className="text-snow font-semibold mb-1">Betting closed</h3>
                <p className="text-sm text-fog">Waiting for the market creator to declare the result.</p>
              </div>
            )}
            {status === 'resolved' && <ClaimPanel meta={meta} state={state} onClaimed={refresh} />}
          </div>
        </div>
      </main>
    </div>
  );
}
