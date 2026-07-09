'use client';

import { MarketChainState } from '@/lib/betContract';
import { formatAddress, formatTokenAmount } from '@/lib/utils';
import { explorerTxUrl } from '@/lib/config';

function describe(item: MarketChainState['activity'][number]): string {
  switch (item.method) {
    case 'initialize':
      return 'created the market';
    case 'bet':
      return `bet ${item.amount !== undefined ? formatTokenAmount(item.amount) : '?'} HTR on "${item.outcome ?? '?'}"`;
    case 'set_result':
      return 'set the final result';
    case 'withdraw':
      return `withdrew ${item.amount !== undefined ? formatTokenAmount(item.amount) : '?'} HTR`;
    default:
      return item.method;
  }
}

export default function ActivityFeed({ state }: { state: MarketChainState }) {
  if (state.activity.length === 0) {
    return <p className="text-sm text-fog/60">No activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-line/60">
      {state.activity.map((item) => (
        <li key={item.txId}>
          <a
            href={explorerTxUrl(item.txId)}
            target="_blank"
            rel="noopener noreferrer"
            title="View transaction in explorer"
            className="group py-3 flex items-center justify-between gap-3 text-sm hover:bg-inset/60 -mx-2 px-2 rounded-lg transition-colors"
          >
            <div className="min-w-0">
              <span className="font-mono text-xs text-accent/80">{formatAddress(item.caller)}</span>{' '}
              <span className={item.voided ? 'text-fog/50 line-through' : 'text-fog'}>
                {describe(item)}
              </span>
              {!item.confirmed && !item.voided && (
                <span className="microlabel ml-2 text-ember">pending</span>
              )}
            </div>
            <span className="font-mono text-[11px] text-fog/50 shrink-0 group-hover:text-fog transition-colors">
              {new Date(item.timestamp * 1000).toLocaleString()}
              <span className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
