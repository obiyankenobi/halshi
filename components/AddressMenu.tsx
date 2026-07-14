'use client';

import { useEffect, useRef, useState } from 'react';
import { formatAddress } from '@/lib/utils';

interface AddressMenuProps {
  address: string;
  onDisconnect: () => void;
  className?: string;
}

/**
 * Compact connected-wallet control for small screens: the address pill is a
 * button opening a menu with copy + disconnect (no room for separate buttons).
 */
export default function AddressMenu({ address, onDisconnect, className }: AddressMenuProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 900);
    } catch {
      // clipboard unavailable — leave the menu open
    }
  };

  return (
    <div className={`relative ${className ?? ''}`} ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 bg-panel rounded-full border border-line"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="w-1.5 h-1.5 bg-accent rounded-full"></span>
        <span className="font-mono text-xs text-snow">{formatAddress(address)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`text-fog transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 bg-panel border border-line rounded-xl shadow-xl shadow-black/40 overflow-hidden z-20" role="menu">
          <button
            onClick={handleCopy}
            role="menuitem"
            className="w-full text-left px-4 py-2.5 text-sm text-snow hover:bg-inset/60 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy address'}
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDisconnect();
            }}
            role="menuitem"
            className="w-full text-left px-4 py-2.5 text-sm text-fog hover:text-snow hover:bg-inset/60 transition-colors border-t border-line/60"
          >
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
