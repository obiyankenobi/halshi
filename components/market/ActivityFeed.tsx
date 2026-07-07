'use client';

import { MarketChainState } from '@/lib/betContract';
import { formatAddress, formatTokenAmount } from '@/lib/utils';

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
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-700/60">
      {state.activity.map((item) => (
        <li key={item.txId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
          <div className="min-w-0">
            <span className="text-slate-200 font-mono">{formatAddress(item.caller)}</span>{' '}
            <span className={item.voided ? 'text-slate-500 line-through' : 'text-slate-400'}>
              {describe(item)}
            </span>
            {!item.confirmed && !item.voided && (
              <span className="ml-2 text-xs text-amber-400">pending</span>
            )}
          </div>
          <span className="text-xs text-slate-500 shrink-0">
            {new Date(item.timestamp * 1000).toLocaleString()}
          </span>
        </li>
      ))}
    </ul>
  );
}
