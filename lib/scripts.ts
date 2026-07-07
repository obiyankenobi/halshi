// Utilities to derive output scripts from Hathor base58 addresses.
// A P2PKH output script is: OP_DUP OP_HASH160 <20-byte hash> OP_EQUALVERIFY OP_CHECKSIG
// which serializes to 76a914<hash160>88ac.

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function base58Decode(input: string): Uint8Array {
  let num = 0n;
  for (const char of input) {
    const index = BASE58_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base58 character: ${char}`);
    }
    num = num * 58n + BigInt(index);
  }

  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }

  // Leading '1's encode leading zero bytes
  for (const char of input) {
    if (char !== '1') break;
    bytes.unshift(0);
  }

  return new Uint8Array(bytes);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256d(data: Uint8Array): Promise<Uint8Array> {
  const first = await crypto.subtle.digest('SHA-256', data as BufferSource);
  const second = await crypto.subtle.digest('SHA-256', first);
  return new Uint8Array(second);
}

/**
 * Decode a base58check Hathor address into { version, hash160 }.
 * Verifies the 4-byte double-sha256 checksum.
 */
export async function decodeAddress(address: string): Promise<{ version: number; hash160: Uint8Array }> {
  const decoded = base58Decode(address);
  if (decoded.length !== 25) {
    throw new Error(`Invalid address length: ${decoded.length} bytes (expected 25)`);
  }
  const payload = decoded.slice(0, 21);
  const checksum = decoded.slice(21);
  const expected = (await sha256d(payload)).slice(0, 4);
  if (bytesToHex(checksum) !== bytesToHex(expected)) {
    throw new Error('Invalid address checksum');
  }
  return { version: payload[0], hash160: payload.slice(1) };
}

/**
 * Build the P2PKH output script (hex) for a Hathor address.
 * Matches wallet-headless GET /wallet/nano-contracts/oracle-data.
 */
export async function p2pkhScriptFromAddress(address: string): Promise<string> {
  const { hash160 } = await decodeAddress(address);
  return `76a914${bytesToHex(hash160)}88ac`;
}
