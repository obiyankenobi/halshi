'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  MarketChainState,
  MarketMeta,
  claimWinnings,
  getMaxWithdrawal,
  waitForConfirmation,
} from '@/lib/betContract';
import { formatTokenAmount } from '@/lib/utils';
import { useToast } from '@/lib/toast';

interface ClaimPanelProps {
  meta: MarketMeta;
  state: MarketChainState;
  onClaimed: () => void;
}

/** Shown once the market is resolved: displays and withdraws the caller's winnings. */
export default function ClaimPanel({ meta, state, onClaimed }: ClaimPanelProps) {
  const { address, rpcService, refreshBalance } = useWallet();
  const { addToast } = useToast();
  const [claimable, setClaimable] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<'signing' | 'confirming' | null>(null);

  useEffect(() => {
    if (!address) {
      setClaimable(null);
      return;
    }
    getMaxWithdrawal(meta.ncId, address)
      .then(setClaimable)
      .catch(() => setClaimable(null));
  }, [address, meta.ncId, state.activity.length]);

  const handleClaim = async () => {
    if (!address || !claimable || claimable <= 0n) return;
    try {
      setBusy('signing');
      const txId = await claimWinnings(rpcService, {
        ncId: meta.ncId,
        address,
        amountCents: claimable,
      });
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Claimed ${formatTokenAmount(claimable)} HTR`, 'success');
      refreshBalance();
      onClaimed();
    } catch (error: any) {
      addToast(error?.message || 'Failed to claim winnings', 'error');
    } finally {
      setBusy(null);
    }
  };

  if (!address) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-5">
        <h3 className="text-white font-semibold mb-1">
          Resolved: <span className="text-blue-400">{state.finalResult}</span>
        </h3>
        <p className="text-sm text-slate-400">Connect your wallet to claim winnings.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-green-500/30 rounded-lg p-5">
      <h3 className="text-white font-semibold mb-1">
        Resolved: <span className="text-blue-400">{state.finalResult}</span>
      </h3>

      {claimable === null ? (
        <p className="text-sm text-slate-400">Checking your winnings…</p>
      ) : claimable > 0n ? (
        <>
          <p className="text-sm text-slate-400 mb-4">
            You can withdraw{' '}
            <span className="text-green-400 font-semibold">{formatTokenAmount(claimable)} HTR</span>.
          </p>
          <button
            onClick={handleClaim}
            disabled={busy !== null}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-medium transition-colors"
          >
            {busy === 'signing'
              ? 'Waiting for wallet signature…'
              : busy === 'confirming'
                ? 'Waiting for confirmation…'
                : `Claim ${formatTokenAmount(claimable)} HTR`}
          </button>
        </>
      ) : (
        <p className="text-sm text-slate-400">Nothing to claim for this address.</p>
      )}
    </div>
  );
}
