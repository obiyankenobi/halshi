import { config } from './config';

export interface OnChainMarketState {
  blueprintId: string;
  blueprintName: string;
  oracleScript: string;
  tokenUid: string;
  dateLastBet: number;
  total: number;
  finalResult: string | null;
}

/**
 * Server-side fetch of a Bet contract's state straight from the fullnode.
 * Returns null if the contract does not exist (or is not yet confirmed).
 */
export async function fetchBetContractState(ncId: string): Promise<OnChainMarketState | null> {
  const baseUrl = config.hathorNodeUrls[config.defaultNetwork];
  const fields = ['oracle_script', 'token_uid', 'date_last_bet', 'total', 'final_result'];
  const queryString = fields.map((f) => `fields[]=${f}`).join('&');
  const response = await fetch(`${baseUrl}/nano_contract/state?id=${ncId}&${queryString}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  if (!data.success) {
    return null;
  }
  return {
    blueprintId: data.blueprint_id,
    blueprintName: data.blueprint_name,
    oracleScript: data.fields?.oracle_script?.value ?? '',
    tokenUid: data.fields?.token_uid?.value ?? '00',
    dateLastBet: data.fields?.date_last_bet?.value ?? 0,
    total: data.fields?.total?.value ?? 0,
    finalResult: data.fields?.final_result?.value ?? null,
  };
}
