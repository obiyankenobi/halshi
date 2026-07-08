/**
 * Locate the actual MetaMask provider even when other wallet extensions
 * (Phantom, Coinbase Wallet, Rabby, OKX, …) fight over window.ethereum.
 *
 * Snap RPCs (wallet_requestSnaps / wallet_invokeSnap) only work against the
 * real MetaMask provider, so we discover it via EIP-6963 and fall back to the
 * legacy multi-provider conventions.
 */

interface EIP6963ProviderDetail {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: any;
}

const METAMASK_RDNS = new Set(['io.metamask', 'io.metamask.flask']);

let cached: any | null = null;

export async function getMetaMaskProvider(): Promise<any | null> {
  if (cached) return cached;
  if (typeof window === 'undefined') return null;

  // EIP-6963: every well-behaved wallet announces itself with its own identity.
  const announced: EIP6963ProviderDetail[] = [];
  const onAnnounce = (event: Event) => {
    const detail = (event as CustomEvent).detail as EIP6963ProviderDetail;
    if (detail?.info && detail?.provider) announced.push(detail);
  };
  window.addEventListener('eip6963:announceProvider', onAnnounce);
  window.dispatchEvent(new Event('eip6963:requestProvider'));
  // announcements are dispatched synchronously by extensions, but give
  // slow content scripts a tick
  await new Promise((resolve) => setTimeout(resolve, 100));
  window.removeEventListener('eip6963:announceProvider', onAnnounce);

  const metamask = announced.find((d) => METAMASK_RDNS.has(d.info.rdns));
  if (metamask) {
    console.debug('[metamask] provider found via EIP-6963:', metamask.info.rdns);
    cached = metamask.provider;
    return cached;
  }

  // Legacy: some extensions stack every provider into window.ethereum.providers
  const eth = (window as any).ethereum;
  if (Array.isArray(eth?.providers)) {
    const legacy = eth.providers.find(
      (p: any) => p?.isMetaMask && !p.isBraveWallet && !p.isPhantom && !p.isRabby && !p.isCoinbaseWallet
    );
    if (legacy) {
      console.debug('[metamask] provider found via window.ethereum.providers');
      cached = legacy;
      return cached;
    }
  }

  // Last resort: window.ethereum itself, only if it claims to be MetaMask
  if (eth?.isMetaMask) {
    console.debug('[metamask] using window.ethereum (isMetaMask)');
    cached = eth;
    return cached;
  }

  return null;
}

/** Drop the cached provider (e.g. after extension enable/disable). */
export function resetMetaMaskProvider() {
  cached = null;
}
