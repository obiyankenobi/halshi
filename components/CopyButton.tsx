'use client';

import { useState } from 'react';

/** Small inline button that copies `value` to the clipboard with a ✓ flash. */
export default function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable (non-secure context) — ignore
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={label ?? 'Copy to clipboard'}
      title={copied ? 'Copied!' : (label ?? 'Copy')}
      className="inline-flex items-center align-middle text-fog hover:text-accent transition-colors"
    >
      {copied ? (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-accent">
          <path d="M3 8.5 6.5 12 13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      )}
    </button>
  );
}
