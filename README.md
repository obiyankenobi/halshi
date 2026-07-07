# Halshi

Polymarket-style prediction markets on [Hathor Network](https://hathor.network) nano contracts.

Each market is an instance of the on-chain **Bet blueprint**: a parimutuel pool where users
deposit HTR on an outcome, the market creator acts as oracle and signs the final result, and
winners withdraw their share of the pool (`stake × total ÷ winning_pool`).

Built with [create-hathor-dapp](https://github.com/HathorNetwork/create-hathor-dapp):
Next.js 14 + TypeScript + Tailwind, with Reown (WalletConnect) and MetaMask Snap wallet support.

## Architecture

- **One market = one nano contract.** Creating a market sends an `initialize` transaction for the
  Bet blueprint (`NEXT_PUBLIC_BET_BLUEPRINT_ID`); the tx hash becomes the market/contract ID.
- **Market metadata registry.** The question, description, and outcome labels are not stored
  on-chain. `POST /api/markets` persists them in a local SQLite DB (`data/markets.db`) after
  verifying on the fullnode that the contract exists and is a Bet blueprint instance. The chain
  stays the source of truth for pools, deadline, oracle, and result.
- **Per-outcome pools** are aggregated client-side from the contract's transaction history
  (the node cannot render dict fields), which also powers each market's activity feed.
- **Lifecycle:** create (`initialize`) → bet (`bet` + deposit action) → resolve
  (`htr_signOracleData` + `set_result`) → claim (`withdraw` + withdrawal action).

Key modules:

- `lib/betContract.ts` — all contract reads/writes (create, bet, resolve, claim, state, history)
- `lib/scripts.ts` — P2PKH oracle script derivation from a base58 address
- `lib/db.ts` + `app/api/markets/` — market metadata registry
- `app/page.tsx`, `app/create/`, `app/market/[ncId]/` — UI

## Running against the local Forge devnet

1. Start [Hathor Forge](https://hathor.network) (node + miner + tx-mining). If the Forge app
   cannot spawn the wallet-headless (it needs `node` on its PATH), run it manually:

   ```bash
   cd "/Applications/Hathor Forge.app/Contents/Resources/wallet-headless-dist"
   node dist/index.js
   ```

2. Publish the Bet blueprint (e.g. via the hathor-forge MCP `publish_blueprint`) and put its ID
   in `.env.local` as `NEXT_PUBLIC_BET_BLUEPRINT_ID`.

3. Install and run:

   ```bash
   npm install
   npm run dev
   ```

   The app expects the fullnode API at `http://localhost:49180/v1a`
   (`NEXT_PUBLIC_HATHOR_NODE_URL_LOCALNET`).

## Wallets

- **Reown / WalletConnect:** set `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` (free at
  https://cloud.reown.com). Your wallet must be connected to the same network — for localnet
  that means a wallet configured against the Forge node (network `privatenet`).
- **MetaMask Snap:** installs the Hathor snap from the connection modal.
- **Mock mode:** `NEXT_PUBLIC_USE_MOCK_WALLET=true` fakes wallet signatures so you can click
  through the UI without a wallet. Reads still hit the real node; fabricated transactions are
  not registered on-chain (creating a market in mock mode fails on-chain verification by design).

## Environment

See `.env.local.example`. The important ones:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_DEFAULT_NETWORK` | `localnet`, `testnet`, or `mainnet` |
| `NEXT_PUBLIC_HATHOR_NODE_URL_LOCALNET` | Fullnode API base URL (default `http://localhost:49180/v1a`) |
| `NEXT_PUBLIC_BET_BLUEPRINT_ID` | On-chain Bet blueprint the markets instantiate |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Reown project ID |
| `NEXT_PUBLIC_USE_MOCK_WALLET` | `true` to fake wallet interactions |
