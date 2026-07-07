# Deploying Halshi

Two halves: get the **Bet blueprint onto the target network** (testnet/mainnet), then run the
**app on your VPS**. This guide covers every field you need to change, where it lives, and two
ways to run the app.

---

## 1. Configuration reference — what to change and where

> **The build-time rule:** every `NEXT_PUBLIC_*` variable is inlined into the JS bundle when
> `npm run build` runs. Changing one **always requires a rebuild** — setting it at runtime does
> nothing. With Docker, pass them as `--build-arg`; with bare Node, have them in `.env.local`
> (or the shell env) *before* building.

| Field | Where | What to set |
| --- | --- | --- |
| **Network** | `NEXT_PUBLIC_DEFAULT_NETWORK` env | `testnet` or `mainnet` (dev: `localnet`) |
| **Bet blueprint ID** | `NEXT_PUBLIC_BET_BLUEPRINT_ID` env | The blueprint's tx hash on the *target network* (see §2). The localnet ID in `.env.local` will not exist on testnet/mainnet. |
| **Node API URL** | `NEXT_PUBLIC_HATHOR_NODE_URL_TESTNET` / `_MAINNET` env | Only to override the defaults baked into `lib/config.ts` (`node1.india.testnet.hathor.network/v1a`, `node1.mainnet.hathor.network/v1a`). Point at your own node if you run one — public nodes are rate-limited and best-effort. |
| **WalletConnect project ID** | `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` env | Your ID from https://cloud.reown.com — same one works for all networks. |
| **Mock wallet** | `NEXT_PUBLIC_USE_MOCK_WALLET` env | Must be `false` in production. |
| **WalletConnect app metadata** | `lib/walletConnectConfig.ts` → `WALLETCONNECT_METADATA` | `url` auto-uses `window.location.origin`; the name/description/icon are what wallets display in the pairing prompt — update if you rebrand. |
| **Page title / SEO** | `app/layout.tsx` → `metadata` | Title, description, favicon path. |
| **Default node fallbacks** | `lib/config.ts` → `hathorNodeUrls` | Hardcoded fallbacks used when the env vars above are absent. Fine to leave. |
| **Market registry DB** | `lib/db.ts` | Writes SQLite to `<cwd>/data/markets.db`. Nothing to configure — but the `data/` directory must be on a **persistent disk** (Docker: mount a volume at `/app/data`). |

Networks the UI knows about are defined in `lib/config.ts` (`Network` type) and offered in
`components/NetworkSelector.tsx`; the WalletConnect chain ID mapping (`hathor:testnet`,
`hathor:privatenet`, …) is `getChainId()` in the same config file.

---

## 2. Publishing the Bet blueprint on the target network

The app creates markets as instances of one on-chain blueprint; that blueprint must exist on
the network users connect to.

**First check whether it's already there.** The Bet blueprint is Hathor's canonical example and
may already be published on testnet. Ask the node about a candidate ID:

```bash
curl "https://node1.india.testnet.hathor.network/v1a/nc_blueprint/<blueprint_id>"
```

or browse the testnet explorer (https://explorer.testnet.hathor.network → Nano Contracts →
Blueprints). If it exists, put its ID in `NEXT_PUBLIC_BET_BLUEPRINT_ID` and you're done with §2.

**To publish it yourself** you need a wallet-headless pointed at the target network and an
address holding a little HTR (testnet: use the faucet; the tx itself costs only fees/weight):

1. Configure wallet-headless (`config.js` or env, depending on install):
   `network: 'testnet'`, `server: 'https://node1.india.testnet.hathor.network/v1a/'`.
2. Start your wallet: `POST /start` with `{"wallet-id": "publisher", "seed": "<24 words>"}`.
3. Publish (the blueprint source is the Bet contract Python file):

   ```bash
   curl -X POST http://localhost:8000/wallet/nano-contracts/create-on-chain-blueprint \
     -H 'X-Wallet-Id: publisher' -H 'Content-Type: application/json' \
     -d "$(python3 -c 'import json; print(json.dumps({
       "address": "<your address>",
       "code": open("bet.py").read()
     }))')"
   ```

4. The returned tx `hash` is your blueprint ID → `NEXT_PUBLIC_BET_BLUEPRINT_ID`.

> Note: public networks can restrict on-chain blueprint publishing
> (`NC_ON_CHAIN_BLUEPRINT_RESTRICTED`). If the publish tx is rejected on those grounds, use the
> already-published blueprint or ask in the Hathor Discord about the current policy.

Existing markets do **not** carry over between networks — the localnet markets live only in
your local chain + local `data/markets.db`. Start the production DB empty.

---

## 3. Running on your VPS

### Option A — pm2 (bare Node)

Requires Node 20+ and pm2 (`npm i -g pm2`) on the VPS.

```bash
# e.g. under /opt
git clone <your-repo> halshi && cd halshi
npm ci

# create the production env BEFORE building (build-time rule from §1!)
cat > .env.local << 'EOF'
NEXT_PUBLIC_DEFAULT_NETWORK=testnet
NEXT_PUBLIC_BET_BLUEPRINT_ID=<blueprint id from §2>
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your reown id>
NEXT_PUBLIC_USE_MOCK_WALLET=false
EOF

npm run build

pm2 start ecosystem.config.js   # serves on 127.0.0.1:3000
pm2 save                        # persist the process list
pm2 startup                     # print the command that enables pm2 on boot — run it
```

The repo ships `ecosystem.config.js`, which runs the Next server directly (`next start -p 3000`)
with auto-restart. Useful commands:

```bash
pm2 status            # is it up?
pm2 logs halshi       # tail logs
pm2 restart halshi    # restart (e.g. after a rebuild)
```

**Deploying an update:**

```bash
cd /opt/halshi && git pull && npm ci && npm run build && pm2 restart halshi
```

(Any `NEXT_PUBLIC_*` change is picked up by the rebuild — editing `.env.local` alone does
nothing until `npm run build` runs again.)

The SQLite registry lands in `/opt/halshi/data/markets.db` — include it in your backups; it
survives restarts and redeploys as long as you pull into the same directory.

### Option B — Docker

The repo's `Dockerfile` is a multi-stage standalone build (Debian-based for the better-sqlite3
native module, non-root user, healthcheck, `/app/data` volume).

```bash
# on the VPS
git clone <your-repo> halshi && cd halshi

docker build \
  --build-arg NEXT_PUBLIC_DEFAULT_NETWORK=testnet \
  --build-arg NEXT_PUBLIC_BET_BLUEPRINT_ID=<blueprint id from §2> \
  --build-arg NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=<your reown id> \
  -t halshi .

docker volume create halshi-data

docker run -d --name halshi \
  --restart unless-stopped \
  -p 127.0.0.1:3000:3000 \
  -v halshi-data:/app/data \
  halshi
```

To change any `NEXT_PUBLIC_*` value later: rebuild the image and recreate the container
(`docker rm -f halshi` + the `docker run` again). The volume keeps the market registry.

### Reverse proxy + TLS (nginx)

Add a server block proxying to the app (which listens on `127.0.0.1:3000`) —
`/etc/nginx/sites-available/halshi`:

```nginx
server {
    server_name halshi.example.com;

    listen 80;
    listen [::]:80;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # Next.js dev/HMR and any websocket upgrades
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/halshi /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# TLS via Let's Encrypt (rewrites the block for :443 automatically)
sudo certbot --nginx -d halshi.example.com
```

HTTPS is not optional in practice: `navigator.clipboard` (copy buttons) and WalletConnect both
require a secure context, and wallets will display your `https://` origin in the pairing prompt.

---

## 4. Post-deploy checklist

- [ ] Home page loads and shows an empty market list (`GET /api/markets` returns `{"markets":[]}`)
- [ ] `curl https://your-domain/api/markets -X POST -d '{}' -H 'Content-Type: application/json'`
      returns a 400 validation error (API is up)
- [ ] Connect a wallet on the target network (`hathor:testnet`) — pairing prompt shows your domain
- [ ] Create a real market end-to-end: wallet prompt → confirmation → redirected to market page
- [ ] Registry survives a container/service restart (persistent `data/`)
- [ ] Node URL responds: `curl <node>/v1a/version` shows the expected network
