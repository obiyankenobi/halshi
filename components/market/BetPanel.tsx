'use client';

import { useState } from 'react';
import { useHathor } from '@/contexts/HathorContext';
import { useWallet } from '@/contexts/WalletContext';
import { MarketChainState, MarketMeta, parseHTR, placeBet, waitForConfirmation } from '@/lib/betContract';
import { formatTokenAmount } from '@/lib/utils';
import { useToast } from '@/lib/toast';

interface BetPanelProps {
  meta: MarketMeta;
  state: MarketChainState;
  onPlaced: () => void;
}

export default function BetPanel({ meta, state, onPlaced }: BetPanelProps) {
  const { isConnected } = useHathor();
  const { address, rpcService, refreshBalance } = useWallet();
  const { addToast } = useToast();

  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState<'signing' | 'confirming' | null>(null);

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
      const txId = await placeBet(rpcService, {
        ncId: meta.ncId,
        address,
        outcome: selected,
        amountCents,
      });
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Bet placed: ${amount} HTR on "${selected}"`, 'success');
      setAmount('');
      refreshBalance();
      onPlaced();
    } catch (error: any) {
      addToast(error?.message || 'Failed to place bet', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
      <h3 className="text-white font-semibold mb-4">Place a bet</h3>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {meta.outcomes.map((outcome) => (
          <button
            key={outcome}
            onClick={() => setSelected(outcome)}
            disabled={busy !== null}
            className={`px-3 py-2.5 rounded-lg text-sm font-medium border transition-colors truncate ${
              selected === outcome
                ? 'bg-blue-600 border-blue-500 text-white'
                : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            {outcome}
          </button>
        ))}
      </div>

      <label className="block text-sm text-slate-400 mb-1">Amount (HTR)</label>
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="10.00"
        disabled={busy !== null}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 mb-3"
      />

      {payoutPreview !== null && (
        <p className="text-sm text-slate-400 mb-3">
          Payout if &ldquo;{selected}&rdquo; wins:{' '}
          <span className="text-green-400 font-medium">≈ {formatTokenAmount(payoutPreview)} HTR</span>
          <span className="text-slate-500"> (at current pools)</span>
        </p>
      )}

      <button
        onClick={handleBet}
        disabled={busy !== null || !isConnected}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-medium transition-colors"
      >
        {busy === 'signing'
          ? 'Waiting for wallet signature…'
          : busy === 'confirming'
            ? 'Waiting for confirmation…'
            : isConnected
              ? 'Place bet'
              : 'Connect wallet to bet'}
      </button>
    </div>
  );
}
