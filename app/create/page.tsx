'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { useWallet } from '@/contexts/WalletContext';
import { useHathor } from '@/contexts/HathorContext';
import { createMarket, waitForConfirmation } from '@/lib/betContract';
import { useToast } from '@/lib/toast';

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
      const ncId = await createMarket(rpcService, { oracleAddress: address, dateLastBet });

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
      addToast(error?.message || 'Failed to create market', 'error');
      setStep('form');
    }
  };

  const stepLabel = {
    signing: 'Waiting for wallet signature…',
    confirming: 'Waiting for block confirmation…',
    registering: 'Registering market…',
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <Header />

      <main className="container mx-auto px-6 py-8 max-w-2xl">
        <h2 className="text-3xl font-bold text-white mb-2">Create market</h2>
        <p className="text-slate-400 mb-8">
          Each market is a nano contract on Hathor. You become its oracle: after the deadline, you
          sign the winning outcome to settle bets.
        </p>

        {!isConnected && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-lg p-4 mb-6 text-sm">
            Connect your wallet to create a market.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Question</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will HTR reach $1 by the end of 2026?"
              disabled={busy}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Resolution criteria, sources, details…"
              rows={3}
              disabled={busy}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Outcomes</label>
            <div className="space-y-2">
              {outcomes.map((outcome, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => setOutcome(index, e.target.value)}
                    placeholder={`Outcome ${index + 1}`}
                    disabled={busy}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                  {outcomes.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOutcome(index)}
                      disabled={busy}
                      className="px-3 text-slate-400 hover:text-red-400 transition-colors"
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
              className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              + Add outcome
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Betting deadline</label>
            <input
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={busy}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 [color-scheme:dark]"
            />
            <p className="text-xs text-slate-500 mt-1">No more bets are accepted after this time.</p>
          </div>

          <button
            type="submit"
            disabled={busy || !isConnected}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg font-medium transition-colors"
          >
            {busy ? stepLabel[step as keyof typeof stepLabel] : 'Create market'}
          </button>
        </form>
      </main>
    </div>
  );
}
