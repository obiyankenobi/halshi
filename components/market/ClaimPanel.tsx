'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@/contexts/WalletContext';
import {
  MarketChainState,
  MarketMeta,
  claimWinnings,
  getMaxWithdrawal,
  waitForConfirmation,
} from '@/lib/betContract';
import { CancelledError, cancellable, formatTokenAmount } from '@/lib/utils';
import { useToast } from '@/lib/toast';

interface ClaimPanelProps {
  meta: MarketMeta;
  state: MarketChainState;
  onClaimed: () => void;
}

/** Shown once the market is resolved: displays and withdraws the caller's winnings. */
export default function ClaimPanel({ meta, state, onClaimed }: ClaimPanelProps) {
  const { address, rpcService } = useWallet();
  const { addToast } = useToast();
  const [claimable, setClaimable] = useState<bigint | null>(null);
  const [busy, setBusy] = useState<'signing' | 'confirming' | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

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
      const signing = cancellable(
        claimWinnings(rpcService, {
          ncId: meta.ncId,
          address,
          amountCents: claimable,
        })
      );
      cancelRef.current = signing.cancel;
      const txId = await signing.promise;
      setBusy('confirming');
      const { confirmed, voided } = await waitForConfirmation(txId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');
      addToast(`Claimed ${formatTokenAmount(claimable)} HTR`, 'success');
      onClaimed();
    } catch (error: any) {
      if (error instanceof CancelledError) {
        addToast('Claim abandoned — also reject the pending prompt in your wallet', 'info');
      } else {
        addToast(error?.message || 'Failed to claim winnings', 'error');
      }
    } finally {
      cancelRef.current = null;
      setBusy(null);
    }
  };

  if (!address) {
    return (
      <div className="bg-panel border border-line rounded-2xl p-6">
        <p className="microlabel text-fog mb-2">resolved</p>
        <h3 className="text-snow font-semibold mb-1">
          Result: <span className="text-accent">{state.finalResult}</span>
        </h3>
        <p className="text-sm text-fog">Connect your wallet to claim winnings.</p>
      </div>
    );
  }

  return (
    <div className="bg-panel border border-accent/40 rounded-2xl p-6">
      <p className="microlabel text-accent mb-2">resolved</p>
      <h3 className="text-snow font-semibold mb-3">
        Result: <span className="text-accent">{state.finalResult}</span>
      </h3>

      {claimable === null ? (
        <p className="text-sm text-fog">Checking your winnings…</p>
      ) : claimable > 0n ? (
        <>
          <p className="text-sm text-fog mb-4">
            You can withdraw{' '}
            <span className="font-mono text-accent">{formatTokenAmount(claimable)} HTR</span>.
          </p>
          <button
            onClick={handleClaim}
            disabled={busy !== null}
            className="w-full py-3 bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:pointer-events-none text-ink rounded-xl font-semibold transition-colors"
          >
            {busy === 'signing'
              ? 'Waiting for wallet signature…'
              : busy === 'confirming'
                ? 'Waiting for confirmation…'
                : `Claim ${formatTokenAmount(claimable)} HTR`}
          </button>
          {busy === 'signing' && (
            <button
              onClick={() => cancelRef.current?.()}
              className="w-full mt-2 py-1.5 text-sm text-fog hover:text-snow transition-colors"
            >
              Cancel
            </button>
          )}
        </>
      ) : (
        <p className="text-sm text-fog">Nothing to claim for this address.</p>
      )}
    </div>
  );
}
