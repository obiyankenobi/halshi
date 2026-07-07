import { HathorRPCService } from './hathorRPC';
import { config, Network, hathorNetworkNames } from './config';
import { p2pkhScriptFromAddress } from './scripts';

export const HTR_TOKEN = '00';

export interface MarketMeta {
  ncId: string;
  question: string;
  description: string;
  outcomes: string[];
  creatorAddress: string;
  oracleScript: string;
  tokenUid: string;
  dateLastBet: number;
  createdAt: number;
}

export interface MarketActivityItem {
  txId: string;
  method: string;
  caller: string;
  timestamp: number;
  outcome?: string;
  amount?: bigint;
  voided: boolean;
  confirmed: boolean;
}

export interface MarketChainState {
  ncId: string;
  total: bigint;
  finalResult: string | null;
  dateLastBet: number;
  tokenUid: string;
  oracleScript: string;
  outcomePools: Record<string, bigint>;
  activity: MarketActivityItem[];
}

function nodeUrl(network: Network = config.defaultNetwork): string {
  return config.hathorNodeUrls[network];
}

/**
 * Fetch the full on-chain state of a Bet market.
 *
 * Scalar fields come from /nano_contract/state. Per-outcome pools are not
 * queryable as dict fields on the node, so they are aggregated from the
 * contract history (bet transactions carry the outcome in their decoded args
 * and the amount in their deposit action). The history doubles as the
 * market's activity feed.
 */
export async function fetchMarketChainState(
  ncId: string,
  network: Network = config.defaultNetwork
): Promise<MarketChainState | null> {
  const base = nodeUrl(network);
  const fields = ['oracle_script', 'token_uid', 'date_last_bet', 'total', 'final_result'];
  const queryString = fields.map((f) => `fields[]=${f}`).join('&');
  const stateRes = await fetch(`${base}/nano_contract/state?id=${ncId}&${queryString}`);
  if (!stateRes.ok) return null;
  const state = await stateRes.json();
  if (!state.success) return null;

  const activity: MarketActivityItem[] = [];
  const outcomePools: Record<string, bigint> = {};

  let after: string | null = null;
  let hasMore = true;
  while (hasMore) {
    const url = `${base}/nano_contract/history?id=${ncId}&count=100${after ? `&after=${after}` : ''}`;
    const historyRes = await fetch(url);
    if (!historyRes.ok) break;
    const historyData = await historyRes.json();
    const txs: any[] = historyData.history || [];
    for (const tx of txs) {
      const confirmed = Boolean(tx.first_block);
      const voided = Boolean(tx.is_voided);
      const item: MarketActivityItem = {
        txId: tx.hash,
        method: tx.nc_method,
        caller: tx.nc_address,
        timestamp: tx.timestamp,
        voided,
        confirmed,
      };
      if (tx.nc_method === 'bet') {
        const args = tx.nc_args_decoded || [];
        const action = tx.nc_context?.actions?.[0];
        item.outcome = typeof args[1] === 'string' ? args[1] : undefined;
        item.amount = action ? BigInt(action.amount) : undefined;
        if (item.outcome && item.amount !== undefined && confirmed && !voided) {
          outcomePools[item.outcome] = (outcomePools[item.outcome] ?? 0n) + item.amount;
        }
      } else if (tx.nc_method === 'withdraw') {
        const action = tx.nc_context?.actions?.[0];
        item.amount = action ? BigInt(action.amount) : undefined;
      }
      activity.push(item);
    }
    hasMore = Boolean(historyData.has_more) && txs.length > 0;
    after = txs.length > 0 ? txs[txs.length - 1].hash : null;
  }

  activity.sort((a, b) => b.timestamp - a.timestamp);

  return {
    ncId,
    total: BigInt(state.fields?.total?.value ?? 0),
    finalResult: state.fields?.final_result?.value ?? null,
    dateLastBet: state.fields?.date_last_bet?.value ?? 0,
    tokenUid: state.fields?.token_uid?.value ?? HTR_TOKEN,
    oracleScript: state.fields?.oracle_script?.value ?? '',
    outcomePools,
    activity,
  };
}

/** Sum of a given address's confirmed bets, per outcome. */
export function positionsFor(state: MarketChainState, address: string): Record<string, bigint> {
  const positions: Record<string, bigint> = {};
  for (const item of state.activity) {
    if (item.method === 'bet' && item.caller === address && item.confirmed && !item.voided && item.outcome && item.amount !== undefined) {
      positions[item.outcome] = (positions[item.outcome] ?? 0n) + item.amount;
    }
  }
  return positions;
}

async function callView(ncId: string, call: string, network: Network = config.defaultNetwork): Promise<any> {
  const params = new URLSearchParams();
  params.append('id', ncId);
  params.append('calls[]', call);
  const res = await fetch(`${nodeUrl(network)}/nano_contract/state?${params.toString()}`);
  if (!res.ok) throw new Error(`view call failed: ${res.statusText}`);
  const data = await res.json();
  const result = data.calls?.[call];
  if (!result) throw new Error('view call returned no result');
  if (result.errmsg) throw new Error(result.errmsg);
  return result.value;
}

/**
 * Maximum amount (in cents) the address can still withdraw.
 * Returns 0 while the market result is not set.
 */
export async function getMaxWithdrawal(
  ncId: string,
  address: string,
  network: Network = config.defaultNetwork
): Promise<bigint> {
  try {
    const value = await callView(ncId, `get_max_withdrawal("${address}")`, network);
    return BigInt(value ?? 0);
  } catch (error: any) {
    if (String(error?.message).includes('ResultNotAvailable')) return 0n;
    throw error;
  }
}

/** Poll the node until a transaction is confirmed by a block (or voided/timeout). */
export async function waitForConfirmation(
  txId: string,
  network: Network = config.defaultNetwork,
  timeoutMs: number = 120_000,
  intervalMs: number = 3_000
): Promise<{ confirmed: boolean; voided: boolean }> {
  // Mock wallet returns fabricated tx hashes that will never appear on the node.
  if (config.useMockWallet) {
    return { confirmed: true, voided: false };
  }
  const base = nodeUrl(network);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${base}/transaction?id=${txId}`);
      if (res.ok) {
        const data = await res.json();
        const meta = data.meta || {};
        const voided = Boolean(meta.voided_by?.length);
        if (voided) return { confirmed: false, voided: true };
        if (meta.first_block) return { confirmed: true, voided: false };
      }
    } catch {
      // node hiccups are fine while polling
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return { confirmed: false, voided: false };
}

function rpcNetworkName(network: Network = config.defaultNetwork): string {
  return hathorNetworkNames[network];
}

/**
 * Create a new market: initialize a Bet contract with the creator as oracle.
 * Returns the transaction hash, which is the new contract's nc_id.
 */
export async function createMarket(
  rpc: HathorRPCService,
  params: {
    oracleAddress: string;
    dateLastBet: number; // unix timestamp, last moment bets are accepted
    tokenUid?: string;
    network?: Network;
  }
): Promise<string> {
  if (!config.betBlueprintId) {
    throw new Error('NEXT_PUBLIC_BET_BLUEPRINT_ID is not configured');
  }
  const oracleScript = await p2pkhScriptFromAddress(params.oracleAddress);
  const result = await rpc.sendNanoContractTx({
    network: rpcNetworkName(params.network),
    method: 'initialize',
    blueprint_id: config.betBlueprintId,
    args: [oracleScript, params.tokenUid ?? HTR_TOKEN, params.dateLastBet],
    actions: [],
    push_tx: true,
  });
  const hash = result?.hash ?? result?.response?.hash;
  if (!hash) throw new Error('wallet did not return a transaction hash');
  return hash;
}

/** Place a bet: deposit `amountCents` on `outcome`. */
export async function placeBet(
  rpc: HathorRPCService,
  params: {
    ncId: string;
    address: string; // address credited with the bet (and future winnings)
    outcome: string;
    amountCents: bigint;
    tokenUid?: string;
    network?: Network;
  }
): Promise<string> {
  const result = await rpc.sendNanoContractTx({
    network: rpcNetworkName(params.network),
    method: 'bet',
    nc_id: params.ncId,
    args: [params.address, params.outcome],
    actions: [
      {
        type: 'deposit',
        token: params.tokenUid ?? HTR_TOKEN,
        amount: params.amountCents.toString(),
      },
    ],
    push_tx: true,
  });
  const hash = result?.hash ?? result?.response?.hash;
  if (!hash) throw new Error('wallet did not return a transaction hash');
  return hash;
}

/**
 * Resolve a market (oracle only): sign the winning outcome with the wallet,
 * then call set_result with the SignedData argument.
 *
 * hathor-rpc-lib returns `{ type, response: { data, signedData, oracle } }`
 * where `signedData` is the IUserSignedData object
 * (`{ type: 'str', signature: '<hex>', value: '<outcome>' }`) — exactly the
 * "user format" argument set_result expects, so it is passed through as-is.
 */
export async function resolveMarket(
  rpc: HathorRPCService,
  params: {
    ncId: string;
    oracleAddress: string;
    result: string;
    network?: Network;
  }
): Promise<string> {
  const signed: any = await rpc.signOracleData({
    network: rpcNetworkName(params.network),
    nc_id: params.ncId,
    oracle: params.oracleAddress,
    data: params.result,
  });
  console.debug('htr_signOracleData response:', signed);

  const payload = signed?.response ?? signed;
  let signedData = payload?.signedData;
  if (!signedData && payload?.signature) {
    // Older/other wallets may return a flat signature; build the arg ourselves.
    signedData = { type: 'str', signature: payload.signature, value: params.result };
  }
  if (!signedData) {
    throw new Error(
      `wallet did not return signed oracle data (got: ${JSON.stringify(signed)?.slice(0, 300)})`
    );
  }

  const result = await rpc.sendNanoContractTx({
    network: rpcNetworkName(params.network),
    method: 'set_result',
    nc_id: params.ncId,
    args: [signedData],
    actions: [],
    push_tx: true,
  });
  const hash = result?.hash ?? result?.response?.hash;
  if (!hash) throw new Error('wallet did not return a transaction hash');
  return hash;
}

/** Withdraw winnings after the market is resolved. */
export async function claimWinnings(
  rpc: HathorRPCService,
  params: {
    ncId: string;
    address: string; // address receiving the tokens
    amountCents: bigint;
    tokenUid?: string;
    network?: Network;
  }
): Promise<string> {
  const result = await rpc.sendNanoContractTx({
    network: rpcNetworkName(params.network),
    method: 'withdraw',
    nc_id: params.ncId,
    args: [],
    actions: [
      {
        type: 'withdrawal',
        token: params.tokenUid ?? HTR_TOKEN,
        amount: params.amountCents.toString(),
        address: params.address,
      },
    ],
    push_tx: true,
  });
  const hash = result?.hash ?? result?.response?.hash;
  if (!hash) throw new Error('wallet did not return a transaction hash');
  return hash;
}

export type MarketStatus = 'open' | 'closed' | 'resolved';

/** open: accepting bets; closed: past deadline, awaiting oracle; resolved: result set. */
export function marketStatus(state: Pick<MarketChainState, 'finalResult' | 'dateLastBet'>): MarketStatus {
  if (state.finalResult !== null) return 'resolved';
  if (Date.now() / 1000 > state.dateLastBet) return 'closed';
  return 'open';
}

/** Parse a user-entered HTR amount ("12.34") into cents. */
export function parseHTR(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error('invalid amount (use up to 2 decimal places)');
  }
  const [whole, frac = ''] = trimmed.split('.');
  return BigInt(whole) * 100n + BigInt(frac.padEnd(2, '0') || '0');
}
