#!/usr/bin/env node
// Register an existing on-chain Bet contract as a market in the halshi
// registry — same checks as POST /api/markets, but runnable from the shell
// (WAL-safe while the app is up; no restart needed).
//
// Usage:
//   node scripts/register-market.mjs <ncId> \
//     --question "Will it rain tomorrow?" \
//     --outcomes "Yes,No" \
//     [--description "Resolution criteria…"]
//
// The contract must already exist on-chain (confirmed) and be an instance of
// the Bet blueprint. Oracle script, token, deadline, and creator address are
// read from the chain, not from arguments.

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

// keep in sync with lib/limits.ts
const LIMITS = { question: 120, description: 500, outcome: 40, maxOutcomes: 16 };

const NODE_DEFAULTS = {
  mainnet: 'https://node-partners.mainnet.hathor.network/v1a',
  testnet: 'https://node-partners.testnet.hathor.network/v1a',
  localnet: 'http://localhost:49180/v1a',
};

function usage(message) {
  if (message) console.error(`Error: ${message}\n`);
  console.error(
    'Usage: node scripts/register-market.mjs <64-hex ncId> --question "…" --outcomes "A,B[,C…]" [--description "…"]'
  );
  process.exit(1);
}

// --- parse args ---
const argv = process.argv.slice(2);
const ncId = argv[0];
if (!ncId || !/^[0-9a-f]{64}$/.test(ncId)) usage('first argument must be the 64-hex contract id');

function flagValue(...names) {
  for (const name of names) {
    const i = argv.indexOf(name);
    if (i !== -1) {
      if (i + 1 >= argv.length) usage(`${name} needs a value`);
      return argv[i + 1];
    }
  }
  return undefined;
}

const question = (flagValue('--question', '-q') ?? '').trim();
const description = (flagValue('--description', '-d') ?? '').trim();
const outcomesRaw = flagValue('--outcomes', '-o') ?? '';
const outcomes = outcomesRaw.split(',').map((o) => o.trim()).filter(Boolean);

if (question.length < 3 || question.length > LIMITS.question) {
  usage(`--question is required (3-${LIMITS.question} chars)`);
}
if (description.length > LIMITS.description) {
  usage(`--description too long (max ${LIMITS.description} chars)`);
}
if (
  outcomes.length < 2 ||
  outcomes.length > LIMITS.maxOutcomes ||
  new Set(outcomes).size !== outcomes.length ||
  outcomes.some((o) => o.length > LIMITS.outcome)
) {
  usage(`--outcomes must be 2-${LIMITS.maxOutcomes} unique comma-separated values of up to ${LIMITS.outcome} chars`);
}

// --- resolve project config (same env the app builds with) ---
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readEnvLocal() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(projectRoot, '.env.local'), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2];
    }
  } catch {
    // no .env.local — fall back to defaults
  }
  return env;
}

// shell env overrides .env.local (handy for one-off runs against another network)
const env = { ...readEnvLocal(), ...process.env };
const network = env.NEXT_PUBLIC_DEFAULT_NETWORK || 'mainnet';
const nodeUrl =
  env.HALSHI_NODE_URL ||
  env[`NEXT_PUBLIC_HATHOR_NODE_URL_${network.toUpperCase()}`] ||
  NODE_DEFAULTS[network];
const blueprintId = env.NEXT_PUBLIC_BET_BLUEPRINT_ID || '';
if (!nodeUrl) usage(`unknown network '${network}'`);

// --- open the registry first: the duplicate check needs no network ---
const dbPath = path.join(projectRoot, 'data', 'markets.db');
if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath} — run this from the deployed app directory.`);
  process.exit(1);
}
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
const columns = db.prepare('PRAGMA table_info(markets)').all();
if (!columns.some((c) => c.name === 'banned')) {
  db.exec('ALTER TABLE markets ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
}

const existing = db.prepare('SELECT banned FROM markets WHERE nc_id = ?').get(ncId);
if (existing) {
  console.error(
    existing.banned
      ? 'This contract is registered but BANNED — use scripts/ban-market.mjs --unban to restore it.'
      : 'This contract is already registered.'
  );
  process.exit(1);
}

// --- verify on-chain ---
async function fetchJson(url) {
  try {
    const res = await fetch(url);
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const fields = ['oracle_script', 'token_uid', 'date_last_bet'].map((f) => `fields[]=${f}`).join('&');
const state = await fetchJson(`${nodeUrl}/nano_contract/state?id=${ncId}&${fields}`);
if (!state?.success) {
  console.error(`Contract not found on ${network} (${nodeUrl}) — is the node reachable and the transaction confirmed?`);
  process.exit(1);
}
if (blueprintId && state.blueprint_id !== blueprintId) {
  console.error(`Contract is not a Bet blueprint instance (blueprint: ${state.blueprint_id}).`);
  process.exit(1);
}
if (!blueprintId) {
  console.warn('Warning: NEXT_PUBLIC_BET_BLUEPRINT_ID not set in .env.local — skipping blueprint check.');
}

// creator address comes from the initialize transaction itself
const txData = await fetchJson(`${nodeUrl}/transaction?id=${ncId}`);
const creatorAddress = txData?.tx?.nc_address || txData?.nc_address || '';
if (!creatorAddress) {
  console.warn('Warning: could not read the creator address from the initialize tx; resolve panel will not appear for the oracle.');
}

// --- insert ---
db.prepare(
  `INSERT INTO markets (nc_id, question, description, outcomes, creator_address, oracle_script, token_uid, date_last_bet, created_at, banned)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
).run(
  ncId,
  question,
  description,
  JSON.stringify(outcomes),
  creatorAddress,
  state.fields?.oracle_script?.value ?? '',
  state.fields?.token_uid?.value ?? '00',
  state.fields?.date_last_bet?.value ?? 0,
  Math.floor(Date.now() / 1000)
);

console.log(`Registered "${question}" (${ncId})`);
console.log(`  network:  ${network}`);
console.log(`  outcomes: ${outcomes.join(' | ')}`);
console.log(`  creator:  ${creatorAddress || '(unknown)'}`);
console.log(`  deadline: ${new Date((state.fields?.date_last_bet?.value ?? 0) * 1000).toLocaleString()}`);
