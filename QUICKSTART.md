# Quick Start Guide

Get your Hathor dApp running in 5 minutes. This guide walks you through the fastest path from zero to a working application.

## Prerequisites Check

Before starting, ensure you have:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm or yarn installed
- [ ] A code editor (VS Code recommended)
- [ ] Basic terminal/command line knowledge

## Step 1: Clone and Install (2 minutes)

```bash
# Clone the repository
git clone <your-repo-url>
cd hathor-dapp-template

# Install dependencies
npm install
```

## Step 2: Get WalletConnect Project ID (2 minutes)

1. Go to [cloud.reown.com](https://cloud.reown.com/)
2. Sign up or log in (free)
3. Click "Create Project"
4. Name your project (e.g., "My Hathor dApp")
5. Copy your Project ID

## Step 3: Configure Environment (1 minute)

```bash
# Copy the example environment file
cp .env.example .env.local
```

Edit `.env.local` and paste your Project ID:

```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here
NEXT_PUBLIC_HATHOR_NETWORK=testnet
NEXT_PUBLIC_USE_MOCK_WALLET=false
```

## Step 4: Start Development Server (30 seconds)

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Step 5: Connect Your Wallet

1. Click "Connect Wallet" in the header
2. Choose your wallet:
   - **WalletConnect**: For Hathor Wallet mobile app
   - **MetaMask Snaps**: For MetaMask browser extension
3. Approve the connection in your wallet

**Don't have a wallet yet?** Enable mock mode for testing:

```env
NEXT_PUBLIC_USE_MOCK_WALLET=true
```

Restart the dev server after changing this setting.

## What's Next?

You now have a fully functional dApp template running. Here's what to do next:

### Option 1: Test the Template (5 minutes)

1. Connect your wallet (or use mock mode)
2. Check the "Connected Wallet Details" section
3. Try the contract example form (it won't submit without a real contract)
4. Explore the network switcher in the top right

### Option 2: Integrate Your Contract (15 minutes)

Follow the [CONTRACT_INTEGRATION.md](./CONTRACT_INTEGRATION.md) guide to:
1. Add your contract ID
2. Create a custom component for your contract
3. Test your contract methods

### Option 3: Customize the Template (30 minutes)

1. **Update Branding**:
   - Change app name in `app/layout.tsx` (line 11)
   - Update header text in `components/Header.tsx` (line 25)
   - Customize colors in `app/globals.css`

2. **Modify Landing Page**:
   - Edit `components/GettingStartedGuide.tsx` for your intro
   - Update `app/page.tsx` for your layout

3. **Add Features**:
   - Create new components in `components/`
   - Add context if you need shared state

## Common Issues

### Issue: npm install fails

**Solution**: Make sure you're using Node.js 18 or higher:
```bash
node --version
```

### Issue: Port 3000 is already in use

**Solution**: Kill the process using port 3000 or use a different port:
```bash
npm run dev -- -p 3001
```

### Issue: Wallet won't connect

**Solution**:
1. Verify your WalletConnect Project ID is correct
2. Check that your wallet is on the same network (testnet)
3. Try refreshing the page
4. Open browser console (F12) to check for errors

### Issue: Changes not showing

**Solution**:
1. Check that the dev server is running
2. Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Clear your browser cache
4. Restart the dev server

## Development Tips

### Hot Reload

The template uses Next.js hot reload. Most changes appear instantly without refreshing the browser.

### TypeScript

The template is fully typed. If you see TypeScript errors:
```bash
# Check for type errors
npx tsc --noEmit
```

### Console Logging

Check browser console for:
- Wallet connection events
- Transaction details
- Contract interaction logs
- Error messages

### Mock Mode

Use mock mode to test without a wallet:
```env
NEXT_PUBLIC_USE_MOCK_WALLET=true
```

Mock mode features:
- Simulated wallet connection
- 100,000 HTR mock balance
- Transaction logging (no real txs)
- No wallet popups or signatures

## Next Steps

Now that you're up and running:

1. **Read the Documentation**:
   - [README.md](./README.md) - Complete project documentation
   - [CONTRACT_INTEGRATION.md](./CONTRACT_INTEGRATION.md) - Integrate your contracts
   - [CLAUDE.md](./CLAUDE.md) - Architecture for AI assistance

2. **Explore the Code**:
   - `contexts/` - Wallet and state management
   - `components/` - UI components
   - `lib/` - Utility functions and services

3. **Join the Community**:
   - [Hathor Discord](https://discord.gg/hathor)
   - [Hathor Documentation](https://docs.hathor.network/)

4. **Build Your dApp**:
   - Start with the ContractExample component
   - Add your contract logic
   - Customize the UI
   - Deploy to production

## Testing Your Setup

Run this checklist to verify everything works:

- [ ] Dev server starts without errors
- [ ] Homepage loads at localhost:3000
- [ ] Network selector appears in top right
- [ ] "Connect Wallet" button is visible
- [ ] Can click through the getting started guide
- [ ] Contract example form is visible
- [ ] No console errors (F12 to check)

If all checks pass, you're ready to build!

## Getting Help

Stuck? Here's where to get help:

- **Check the docs**: README.md has detailed troubleshooting
- **Console errors**: Press F12 and check the Console tab
- **GitHub Issues**: Check existing issues or create a new one
- **Discord**: Ask in the Hathor Network Discord

## Building for Production

When you're ready to deploy:

```bash
# Build the production bundle
npm run build

# Test the production build locally
npm start
```

Deploy to:
- **Vercel** (recommended): Connect your repo and deploy
- **Netlify**: Connect your repo and deploy
- **Any Node.js host**: Upload the `.next` folder

See [README.md](./README.md) for detailed deployment instructions.

---

**Congratulations!** You're now ready to build your Hathor dApp. Happy coding!
