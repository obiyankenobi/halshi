'use client';

import { useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { MarketChainState, MarketMeta, resolveMarket, waitForConfirmation } from '@/lib/betContract';
import { useToast } from '@/lib/toast';

interface ResolvePanelProps {
  meta: MarketMeta;
  state: MarketChainState;
  onResolved: () => void;
}

/**
 * Oracle-only panel: the market creator signs the winning outcome with their
 * wallet and submits set_result to the contract.
 */
export default function ResolvePanel({ meta, state, onResolved }: ResolvePanelProps) {
  const { address, rpcService } = useWallet();
  const { addToast } = useToast();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState<'signing' | 'confirming' | null>(null);

  const handleResolve = async () => {
    if (!address || !selected) return;
    try {
      setBusy('signing');
      const txId = await resolveMarket(rpcService, {
        ncId: meta.ncId,
        oracleAddress: address,
        result: selected,
      });
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Market resolved: "${selected}"`, 'success');
      onResolved();
    } catch (error: any) {
      addToast(error?.message || 'Failed to resolve market', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-slate-800 border border-amber-500/30 rounded-lg p-5">
      <h3 className="text-white font-semibold mb-1">Resolve market</h3>
      <p className="text-sm text-slate-400 mb-4">
        You created this market, so you are its oracle. Betting is closed — pick the winning
        outcome and sign it with your wallet.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {meta.outcomes.map((outcome) => (
          <button
            key={outcome}
            onClick={() => setSelected(outcome)}
            disabled={busy !== null}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors truncate ${
              selected === outcome
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {outcome}
          </button>
        ))}
      </div>

      <button
        onClick={handleResolve}
        disabled={busy !== null || !selected}
        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-medium transition-colors"
      >
        {busy === 'signing'
          ? 'Waiting for wallet signature…'
          : busy === 'confirming'
            ? 'Waiting for confirmation…'
            : selected
              ? `Declare "${selected}" as the result`
              : 'Pick the winning outcome'}
      </button>
    </div>
  );
}
