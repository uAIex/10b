# CS 521 NFT Demo Project (ERC-721)

This repository is an end-to-end NFT project built for CS 521. It includes a Solidity smart contract, deployment scripts, automated tests, and a simple frontend that can connect, mint, and view NFTs.

## What this project does

- Implements an ERC-721 contract (`CS521OnChainNFT`) using OpenZeppelin.
- Supports minting NFTs with globally increasing token IDs.
- Returns token metadata from `tokenURI()` as base64 JSON data.
- Includes a frontend that lets a user:
  - connect with the MetaMask browser extension on Sepolia,
  - mint NFTs,
  - view owner, metadata, and image by token ID,
  - see ownership status relative to the connected wallet,
  - review wallet activity and a master ownership view,
  - transfer NFTs from the connected MetaMask wallet,
  - follow live actions/errors in a Console panel at the top.
- Syncs deployment output (contract address + ABI + chain info) directly into `frontend/contract-info.json`.

Network used in this version: Sepolia testnet.

## Project requirements coverage

This section maps the implementation to common course project requirements.

1. **ERC-721 NFT smart contract**  
   Completed in `contracts/CS521OnChainNFT.sol` (inherits OpenZeppelin `ERC721`, supports minting and ownership queries).

2. **Metadata support (`tokenURI`)**  
   Implemented in `tokenURI(uint256)`, returning JSON with `name`, `description`, and `image`.

3. **Frontend integration**  
   Implemented in `frontend/index.html` + `frontend/app.js` with connect/mint/view flow.

4. **No backend/DB required**  
   Frontend talks directly to contract over JSON-RPC; no custom backend service or database is used.

5. **Local development and testing**  
   Hardhat compile/test scripts and unit tests are included.

6. **Testnet deployment support**  
   Sepolia deployment is supported through `npm run deploy:sepolia`.

7. **Automatic contract info wiring to frontend**  
   `scripts/deploy.js` writes `frontend/contract-info.json` after each deployment.

## Repository structure

```text
topic10-test/
├─ contracts/
│  └─ CS521OnChainNFT.sol
├─ scripts/
│  └─ deploy.js
├─ test/
│  └─ CS521OnChainNFT.test.js
├─ frontend/
│  ├─ index.html
│  ├─ app.js
│  └─ contract-info.json
├─ hardhat.config.js
└─ package.json
```

## Prerequisites

- Node.js 18+ recommended
- npm

## Install

Create a local `.env` file from the example:

```bash
# from the repository root
npm install
cp .env.example .env
```

Edit `.env`:

```text
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
PRIVATE_KEY=0xyour_test_wallet_private_key
```

Use a test wallet only. It needs Sepolia test ETH for deployment gas.

## Deploy to Sepolia

```bash
# from the repository root
npm run compile
npm run test
npm run deploy:sepolia
```

The deployment script writes the Sepolia contract address, ABI, and chain ID into `frontend/contract-info.json`.

## Run frontend locally

```bash
# from the repository root
npm run frontend
```

Open:

```text
http://127.0.0.1:5173
```

## Sepolia demo flow with MetaMask

1. Install MetaMask and switch/add the Sepolia testnet.
2. Fund your MetaMask account with Sepolia test ETH.
3. Open the frontend and click **Connect MetaMask**.
4. Click **Mint NFT** and approve the transaction in MetaMask.
5. Enter the minted token ID and click **View NFT**.
6. Confirm owner, metadata JSON, and image are displayed.
7. Optional: use **Transfer Mode** to send a token to another Sepolia wallet.

Tip: use a second MetaMask account to demonstrate ownership differences across accounts.

## GitHub Pages setup

This frontend is static and can be hosted on GitHub Pages after the Sepolia deployment has updated `frontend/contract-info.json`. The repo includes `.github/workflows/pages.yml`, which publishes the `frontend` folder.

1. Confirm `frontend/contract-info.json` has `"network": "sepolia"`, `"chainId": 11155111`, and a real non-zero contract address.
2. Commit and push the repo.
3. In GitHub, open **Settings → Pages**.
4. Set **Source** to **GitHub Actions**.
5. Push to `main`, or run the **Deploy frontend to GitHub Pages** workflow manually.
6. Open the published Pages URL in a browser with MetaMask installed.

Because the page uses MetaMask for signing, you do not need to expose `PRIVATE_KEY` or `SEPOLIA_RPC_URL` in GitHub Pages.

## Tests and checks

Compile:

```bash
# from the repository root
npm run compile
```

Test:

```bash
# from the repository root
npm run test
```

## Notes on behavior

- ERC-721 token IDs are global for the contract, not per wallet.
- Any wallet can read metadata for existing token IDs.
- Ownership is wallet-specific and shown in the UI as owned/not-owned for the connected account.
- MetaMask pays mint/transfer gas with Sepolia test ETH.
- The Console panel is fixed-size and scrollable to avoid layout resizing from long messages.
