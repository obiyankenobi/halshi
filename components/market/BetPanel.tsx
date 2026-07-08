'use client';

import { useRef, useState } from 'react';
import { useHathor } from '@/contexts/HathorContext';
import { useWallet } from '@/contexts/WalletContext';
import { MarketChainState, MarketMeta, parseHTR, placeBet, waitForConfirmation } from '@/lib/betContract';
import { CancelledError, cancellable, formatTokenAmount } from '@/lib/utils';
import { useToast } from '@/lib/toast';

interface BetPanelProps {
  meta: MarketMeta;
  state: MarketChainState;
  onPlaced: () => void;
}

export default function BetPanel({ meta, state, onPlaced }: BetPanelProps) {
  const { isConnected } = useHathor();
  const { address, rpcService } = useWallet();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<'signing' | 'confirming' | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  let amountCents: bigint | null = null;
  try {
    amountCents = amount ? parseHTR(amount) : null;
  } catch {
    amountCents = null;
  }

  // Parimutuel payout preview if the selected outcome wins, given current pools.
  let payoutPreview: bigint | null = null;
  if (selected && amountCents && amountCents > 0n) {
    const pool = (state.outcomePools[selected] ?? 0n) + amountCents;
    const total = state.total + amountCents;
    payoutPreview = (amountCents * total) / pool;
  }

  const handleBet = async () => {
    if (!isConnected || !address) {
      addToast('Connect your wallet first', 'error');
      return;
    }
    if (!selected) {
      addToast('Pick an outcome', 'error');
      return;
    }
    if (!amountCents || amountCents <= 0n) {
      addToast('Enter a valid amount', 'error');
      return;
    }

    try {
      setBusy('signing');
      const signing = cancellable(
        placeBet(rpcService, {
          ncId: meta.ncId,
          address,
          outcome: selected,
          amountCents,
        })
      );
      cancelRef.current = signing.cancel;
      const txId = await signing.promise;
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Bet placed: ${amount} HTR on "${selected}"`, 'success');
      setAmount('');
      onPlaced();
    } catch (error: any) {
      if (error instanceof CancelledError) {
        addToast('Bet abandoned — also reject the pending prompt in your wallet', 'info');
      } else {
        addToast(error?.message || 'Failed to place bet', 'error');
      }
    } finally {
      cancelRef.current = null;
      setBusy(null);
    }
  };

  return (
    <div className="bg-panel border border-accent/30 rounded-2xl p-6">
      <p className="microlabel text-accent mb-5">place a bet</p>

      <div className="grid grid-cols-2 gap-2 mb-5">
        {meta.outcomes.map((outcome) => (
          <button
            key={outcome}
            onClick={() => setSelected(outcome)}
            disabled={busy !== null}
            className={`px-3 py-2.5 rounded-xl text-sm font-semibold border transition-colors truncate ${
              selected === outcome
                ? 'bg-accent border-accent text-ink'
                : 'bg-inset border-line text-snow hover:border-fog'
            }`}
          >
            {outcome}
          </button>
        ))}
      </div>

      <p className="microlabel text-fog mb-1.5">amount (HTR)</p>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="10.00"
        disabled={busy !== null}
        className="w-full bg-inset border border-line rounded-xl px-4 py-2.5 font-mono text-snow placeholder-fog/40 focus:outline-none focus:border-accent mb-4"
      />

      {payoutPreview !== null && (
        <p className="text-sm text-fog mb-4">
          Payout if &ldquo;{selected}&rdquo; wins:{' '}
          <span className="font-mono text-accent">≈ {formatTokenAmount(payoutPreview)} HTR</span>
          <span className="text-fog/60"> at current pools</span>
        </p>
      )}

      <button
        onClick={handleBet}
        disabled={busy !== null || !isConnected}
        className="w-full py-3 bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:pointer-events-none text-ink rounded-xl font-semibold transition-colors"
      >
        {busy === 'signing'
          ? 'Waiting for wallet signature…'
          : busy === 'confirming'
            ? 'Waiting for confirmation…'
            : isConnected
              ? 'Place bet'
              : 'Connect wallet to bet'}
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
