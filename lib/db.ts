import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export interface MarketRow {
  nc_id: string;
  question: string;
  description: string;
  outcomes: string; // JSON array of strings
  creator_address: string;
  oracle_script: string;
  token_uid: string;
  date_last_bet: number;
  created_at: number;
}

export interface Market {
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

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  const dataDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  db = new Database(path.join(dataDir, 'markets.db'));
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS markets (
      nc_id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      outcomes TEXT NOT NULL,
      creator_address TEXT NOT NULL DEFAULT '',
      oracle_script TEXT NOT NULL,
      token_uid TEXT NOT NULL DEFAULT '00',
      date_last_bet INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);
  // Migration: banned flag (also applied by scripts/ban-market.mjs)
  const columns = db.prepare("PRAGMA table_info(markets)").all() as { name: string }[];
  if (!columns.some((c) => c.name === 'banned')) {
    db.exec('ALTER TABLE markets ADD COLUMN banned INTEGER NOT NULL DEFAULT 0');
  }
  return db;
}

function rowToMarket(row: MarketRow): Market {
  return {
    ncId: row.nc_id,
    question: row.question,
    description: row.description,
    outcomes: JSON.parse(row.outcomes),
    creatorAddress: row.creator_address,
    oracleScript: row.oracle_script,
    tokenUid: row.token_uid,
    dateLastBet: row.date_last_bet,
    createdAt: row.created_at,
  };
}

export function listMarkets(): Market[] {
  const rows = getDb()
    .prepare('SELECT * FROM markets WHERE banned = 0 ORDER BY created_at DESC')
    .all() as MarketRow[];
  return rows.map(rowToMarket);
}

/** Registration check that sees banned rows too (bans must not be re-registerable). */
export function marketExists(ncId: string): boolean {
  return Boolean(getDb().prepare('SELECT 1 FROM markets WHERE nc_id = ?').get(ncId));
}

/** Banned markets behave as if they were never registered. */
export function getMarket(ncId: string): Market | null {
  const row = getDb()
    .prepare('SELECT * FROM markets WHERE nc_id = ? AND banned = 0')
    .get(ncId) as MarketRow | undefined;
  return row ? rowToMarket(row) : null;
}

export function insertMarket(market: Omit<Market, 'createdAt'>): Market {
  const createdAt = Math.floor(Date.now() / 1000);
  getDb()
    .prepare(
      `INSERT INTO markets (nc_id, question, description, outcomes, creator_address, oracle_script, token_uid, date_last_bet, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      market.ncId,
      market.question,
      market.description,
      JSON.stringify(market.outcomes),
      market.creatorAddress,
      market.oracleScript,
      market.tokenUid,
      market.dateLastBet,
      createdAt
    );
  return { ...market, createdAt };
}
