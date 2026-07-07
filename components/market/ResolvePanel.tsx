'use client';

import { useRef, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import { MarketChainState, MarketMeta, resolveMarket, waitForConfirmation } from '@/lib/betContract';
import { CancelledError, cancellable } from '@/lib/utils';
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
  const cancelRef = useRef<(() => void) | null>(null);

  const handleResolve = async () => {
    if (!address || !selected) return;
    try {
      setBusy('signing');
      const signing = cancellable(
        resolveMarket(rpcService, {
          ncId: meta.ncId,
          oracleAddress: address,
          result: selected,
        })
      );
      cancelRef.current = signing.cancel;
      const txId = await signing.promise;
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Market resolved: "${selected}"`, 'success');
      onResolved();
    } catch (error: any) {
      if (error instanceof CancelledError) {
        addToast('Resolution abandoned — also reject the pending prompt in your wallet', 'info');
      } else {
        addToast(error?.message || 'Failed to resolve market', 'error');
      }
    } finally {
      cancelRef.current = null;
      setBusy(null);
    }
  };

  return (
    <div className="bg-panel border border-ember/40 rounded-2xl p-6">
      <p className="microlabel text-ember mb-2">resolve market</p>
      <p className="text-sm text-fog mb-5">
        You created this market, so you are its oracle. Betting is closed — pick the winning
        outcome and sign it with your wallet.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {meta.outcomes.map((outcome) => (
          <button
            key={outcome}
            onClick={() => setSelected(outcome)}
            disabled={busy !== null}
            className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors truncate ${
              selected === outcome
                ? 'bg-ember border-ember text-ink'
                : 'bg-inset border-line text-snow hover:border-fog'
            }`}
          >
            {outcome}
          </button>
        ))}
      </div>

      <button
        onClick={handleResolve}
        disabled={busy !== null || !selected}
        className="w-full py-3 bg-ember hover:bg-ember/80 disabled:opacity-40 disabled:pointer-events-none text-ink rounded-xl font-semibold transition-colors"
      >
        {busy === 'signing'
          ? 'Waiting for wallet signature…'
          : busy === 'confirming'
            ? 'Waiting for confirmation…'
            : selected
              ? `Declare "${selected}" as the result`
              : 'Pick the winning outcome'}
      </button>

      {busy === 'signing' && (
        <button
          onClick={() => cancelRef.current?.()}
          className="w-full mt-2 py-1.5 text-sm text-fog hover:text-snow transition-colors"
        >
          Cancel
        </button>
      )}
    </div>
  );
}
