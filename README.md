# CS 521 NFT Demo Project (ERC-721)

This repository is an end-to-end NFT project built for CS 521. It includes a Solidity smart contract, deployment scripts, automated tests, and a simple frontend that can connect, mint, and view NFTs.

## What this project does

- Implements an ERC-721 contract (`CS521OnChainNFT`) using OpenZeppelin.
- Supports minting NFTs with globally increasing token IDs.
- Returns token metadata from `tokenURI()` as base64 JSON data.
- Includes a frontend that lets a user:
   - choose one of three built-in local sample wallets (auto-connect),
  - mint NFTs,
  - view owner, metadata, and image by token ID,
  - see ownership status relative to the connected wallet,
   - review wallet activity and a master ownership view,
   - follow live actions/errors in a Console panel at the top.
- Syncs deployment output (contract address + ABI + chain info) directly into `frontend/contract-info.json`.

Network used in this version: testnet (Hardhat localhost testnet).

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
   Hardhat local node, deployment script, and unit tests are included.

6. **Testnet deployment support**  
   Hardhat localhost testnet flow is supported through `npm run node` and `npm run deploy:local`.

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

No environment file is required for the local testnet workflow.

```bash
# from the repository root
npm install
```

## Run on testnet

Start the testnet blockchain (keep this terminal open):

```bash
# from the repository root
npm run node
```

In a second terminal, deploy to testnet and run frontend:

```bash
# from the repository root
npm run deploy:local
npm run frontend
```

Open:

```text
http://127.0.0.1:5173
```

## Testnet demo flow (no MetaMask required)

1. In Step 1, select one of the built-in wallets (**Wallet 1**, **Wallet 2**, or **Wallet 3**).
2. The app connects automatically to the selected wallet.
3. Click **Mint NFT**.
4. Enter token ID (for first mint, this is usually `0`) and click **View NFT**.
5. Confirm owner, metadata JSON (always visible), and image are displayed.
6. Watch the **Console** panel at the top for status updates like connect/mint/view success or failures.

Tip: switch wallets to demonstrate ownership differences across accounts.

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
- The Console panel is fixed-size and scrollable to avoid layout resizing from long messages.
