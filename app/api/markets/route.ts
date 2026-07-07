import { NextRequest, NextResponse } from 'next/server';
import { listMarkets, getMarket, insertMarket } from '@/lib/db';
import { fetchBetContractState } from '@/lib/nodeApi.server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({ markets: listMarkets() });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'failed to list markets' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const { ncId, question, description = '', outcomes, creatorAddress = '' } = body ?? {};

  if (typeof ncId !== 'string' || !/^[0-9a-f]{64}$/.test(ncId)) {
    return NextResponse.json({ error: 'ncId must be a 64-char hex contract ID' }, { status: 400 });
  }
  if (typeof question !== 'string' || question.trim().length < 3) {
    return NextResponse.json({ error: 'question is required (min 3 chars)' }, { status: 400 });
  }
  if (
    !Array.isArray(outcomes) ||
    outcomes.length < 2 ||
    !outcomes.every((o) => typeof o === 'string' && o.trim().length > 0)
  ) {
    return NextResponse.json({ error: 'outcomes must be an array of 2+ non-empty strings' }, { status: 400 });
  }
  const trimmedOutcomes = outcomes.map((o: string) => o.trim());
  if (new Set(trimmedOutcomes).size !== trimmedOutcomes.length) {
    return NextResponse.json({ error: 'outcomes must be unique' }, { status: 400 });
  }

  if (getMarket(ncId)) {
    return NextResponse.json({ error: 'market already registered' }, { status: 409 });
  }

  // The chain is the source of truth: the contract must exist, be confirmed,
  // and be an instance of the Bet blueprint.
  const state = await fetchBetContractState(ncId);
  if (!state) {
    return NextResponse.json(
      { error: 'contract not found on-chain (is the transaction confirmed?)' },
      { status: 422 }
    );
  }
  if (config.betBlueprintId && state.blueprintId !== config.betBlueprintId) {
    return NextResponse.json(
      { error: `contract is not a Bet blueprint instance (blueprint: ${state.blueprintId})` },
      { status: 422 }
    );
  }

  const market = insertMarket({
    ncId,
    question: question.trim(),
    description: String(description).trim(),
    outcomes: trimmedOutcomes,
    creatorAddress: String(creatorAddress),
    oracleScript: state.oracleScript,
    tokenUid: state.tokenUid,
    dateLastBet: state.dateLastBet,
  });

  return NextResponse.json({ market }, { status: 201 });
}
