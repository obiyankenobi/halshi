#!/usr/bin/env node
// Ban (or unban) a market by contract ID. Banned markets disappear from the
// homepage, the market page, the API, and the notification sweep — as if they
// were never registered. The row is kept so the contract cannot be
// re-registered through POST /api/markets.
//
// Usage:
//   node scripts/ban-market.mjs <ncId>          # ban
//   node scripts/ban-market.mjs <ncId> --unban  # lift the ban
//
// Operates directly on data/markets.db (WAL mode — safe to run while the app
// is up; no restart needed).

import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const [, , ncId, flag] = process.argv;
const unban = flag === '--unban';

if (!ncId || !/^[0-9a-f]{64}$/.test(ncId)) {
  console.error('Usage: node scripts/ban-market.mjs <64-hex contract id> [--unban]');
  process.exit(1);
}

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dbPath = path.join(projectRoot, 'data', 'markets.db');
if (!fs.existsSync(dbPath)) {
  console.error(`No database at ${dbPath} — run this from the deployed app directory.`);
  process.exit(1);
}

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// Same migration the app applies, in case the app hasn't restarted on new code yet
const columns = db.prepare('PRAGMA table_info(markets)').all();
if (!columns.some((c) => c.name === 'banned')) {
  db.exec('ALTER TABLE markets ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
}

const market = db.prepare('SELECT question, banned FROM markets WHERE nc_id = ?').get(ncId);
if (!market) {
  console.error(`Market ${ncId} is not in the registry.`);
  process.exit(1);
}

const target = unban ? 0 : 1;
if (market.banned === target) {
  console.log(`Market is already ${unban ? 'not banned' : 'banned'}: "${market.question}"`);
  process.exit(0);
}

db.prepare('UPDATE markets SET banned = ? WHERE nc_id = ?').run(target, ncId);
console.log(`${unban ? 'Unbanned' : 'Banned'}: "${market.question}" (${ncId})`);
