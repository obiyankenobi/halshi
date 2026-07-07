'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { useHathor } from '@/contexts/HathorContext';
import { createMarket, waitForConfirmation } from '@/lib/betContract';
import { CancelledError, cancellable } from '@/lib/utils';
import { useToast } from '@/lib/toast';

const inputStyles =
  'w-full bg-inset border border-line rounded-xl px-4 py-2.5 text-snow placeholder-fog/40 focus:outline-none focus:border-accent';

export default function CreateMarketPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const { isConnected } = useHathor();
  const { address, rpcService } = useWallet();

  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [outcomes, setOutcomes] = useState<string[]>(['Yes', 'No']);
  const [deadline, setDeadline] = useState('');
  const [step, setStep] = useState<'form' | 'signing' | 'confirming' | 'registering'>('form');
  const cancelRef = useRef<(() => void) | null>(null);

  const setOutcome = (index: number, value: string) => {
    setOutcomes((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const addOutcome = () => setOutcomes((prev) => [...prev, '']);
  const removeOutcome = (index: number) =>
    setOutcomes((prev) => (prev.length > 2 ? prev.filter((_, i) => i !== index) : prev));

  const busy = step !== 'form';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      addToast('Connect your wallet first', 'error');
      return;
    }
    const trimmedOutcomes = outcomes.map((o) => o.trim()).filter(Boolean);
    if (question.trim().length < 3) {
      addToast('Enter a question (min 3 characters)', 'error');
      return;
    }
    if (trimmedOutcomes.length < 2 || new Set(trimmedOutcomes).size !== trimmedOutcomes.length) {
      addToast('Provide at least 2 unique outcomes', 'error');
      return;
    }
    const dateLastBet = Math.floor(new Date(deadline).getTime() / 1000);
    if (!deadline || isNaN(dateLastBet) || dateLastBet <= Date.now() / 1000) {
      addToast('Pick a betting deadline in the future', 'error');
      return;
    }

    try {
      setStep('signing');
      const signing = cancellable(createMarket(rpcService, { oracleAddress: address, dateLastBet }));
      cancelRef.current = signing.cancel;
      const ncId = await signing.promise;
      cancelRef.current = null;

      setStep('confirming');
      const { confirmed, voided } = await waitForConfirmation(ncId);
      if (voided) throw new Error('transaction was voided by the network');
      if (!confirmed) throw new Error('timed out waiting for confirmation');

      setStep('registering');
      const res = await fetch('/api/markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ncId,
          question: question.trim(),
          description: description.trim(),
          outcomes: trimmedOutcomes,
          creatorAddress: address,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'failed to register market');
      }

      addToast('Market created!', 'success');
      router.push(`/market/${ncId}`);
    } catch (error: any) {
      if (error instanceof CancelledError) {
        addToast('Creation abandoned — also reject the pending prompt in your wallet', 'info');
      } else {
        addToast(error?.message || 'Failed to create market', 'error');
      }
      cancelRef.current = null;
      setStep('form');
    }
  };

  const stepLabel = {
    signing: 'Waiting for wallet signature…',
    confirming: 'Waiting for block confirmation…',
    registering: 'Registering market…',
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="shell py-10 max-w-2xl">
        <p className="microlabel text-accent mb-2">{'// new nano contract'}</p>
        <h2 className="text-4xl font-bold text-snow tracking-tight mb-3">Create market</h2>
        <p className="text-fog mb-10">
          Each market is a nano contract on Hathor. You become its oracle: after the deadline, you
          sign the winning outcome to settle bets.
        </p>

        {!isConnected && (
          <div className="bg-ember/10 border border-ember/40 text-ember rounded-xl p-4 mb-6 text-sm">
            Connect your wallet to create a market.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-7">
          <div>
            <p className="microlabel text-fog mb-2">question</p>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will HTR reach $1 by the end of 2026?"
              disabled={busy}
              className={inputStyles}
            />
          </div>

          <div>
            <p className="microlabel text-fog mb-2">
              description <span className="text-fog/50">(optional)</span>
            </p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resolution criteria, sources, details…"
              rows={3}
              disabled={busy}
              className={inputStyles}
            />
          </div>

          <div>
            <p className="microlabel text-fog mb-2">outcomes</p>
            <div className="space-y-2">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(index, e.target.value)}
                    placeholder={`Outcome ${index + 1}`}
                    disabled={busy}
                    className={inputStyles}
                  />
                  {outcomes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      disabled={busy}
                      className="px-3 text-fog hover:text-ember transition-colors"
                      aria-label={`Remove outcome ${index + 1}`}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOutcome}
              disabled={busy}
              className="mt-3 text-sm text-accent hover:text-accent-dim transition-colors"
            >
              + Add outcome
            </button>
          </div>

          <div>
            <p className="microlabel text-fog mb-2">betting deadline</p>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={busy}
              className={`${inputStyles} font-mono [color-scheme:dark]`}
            />
            <p className="text-xs text-fog/60 mt-1.5">No more bets are accepted after this time.</p>
          </div>

          <button
            type="submit"
            disabled={busy || !isConnected}
            className="w-full py-3.5 bg-accent hover:bg-accent-dim disabled:opacity-40 disabled:pointer-events-none text-ink rounded-xl font-semibold transition-colors"
          >
            {busy ? stepLabel[step as keyof typeof stepLabel] : 'Create market'}
          </button>

          {step === 'signing' && (
            <button
              type="button"
              onClick={() => cancelRef.current?.()}
              className="w-full py-1.5 text-sm text-fog hover:text-snow transition-colors"
            >
              Cancel
            </button>
          )}
        </form>
      </main>
    </div>
  );
}
