import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/+esm";

function getRequiredElement(id) {
  const el = document.getElementById(id);
  if (!el) {
    throw new Error(`Missing required UI element: #${id}`);
  }
  return el;
}

const statusEl = getRequiredElement("status");
const mintBtn = getRequiredElement("mintBtn");
const viewBtn = getRequiredElement("viewBtn");
const connectBtn = getRequiredElement("connectBtn");
const resetUiBtn = getRequiredElement("resetUiBtn");
const hardResetBtn = getRequiredElement("hardResetBtn");
const mintViewTabBtn = getRequiredElement("mintViewTabBtn");
const tradeTabBtn = getRequiredElement("tradeTabBtn");
const mintViewMode = getRequiredElement("mintViewMode");
const tradeMode = getRequiredElement("tradeMode");
const rpcUrlInput = getRequiredElement("rpcUrlInput");
const walletSelect = getRequiredElement("walletSelect");
const tokenIdInput = getRequiredElement("tokenIdInput");
const ownerOutput = getRequiredElement("ownerOutput");
const metadataOutput = getRequiredElement("metadataOutput");
const nftImage = getRequiredElement("nftImage");
const ownershipStatusOutput = getRequiredElement("ownershipStatusOutput");
const ownershipExplainOutput = getRequiredElement("ownershipExplainOutput");
const loaderEl = getRequiredElement("loader");
const loaderTextEl = getRequiredElement("loaderText");
const connectedWalletOutput = getRequiredElement("connectedWalletOutput");
const connectedAddressOutput = getRequiredElement("connectedAddressOutput");
const myBalanceOutput = getRequiredElement("myBalanceOutput");
const lastMintTokenOutput = getRequiredElement("lastMintTokenOutput");
const lastMintTxOutput = getRequiredElement("lastMintTxOutput");
const myOwnedTokenIdsOutput = getRequiredElement("myOwnedTokenIdsOutput");
const recentMintedList = getRequiredElement("recentMintedList");
const masterWalletList = getRequiredElement("masterWalletList");
const copyConnectedBtn = getRequiredElement("copyConnectedBtn");
const copyOwnerBtn = getRequiredElement("copyOwnerBtn");
const copyTxBtn = getRequiredElement("copyTxBtn");
const tradeLeftWalletSelect = getRequiredElement("tradeLeftWalletSelect");
const tradeRightWalletSelect = getRequiredElement("tradeRightWalletSelect");
const tradeLeftTokenSelect = getRequiredElement("tradeLeftTokenSelect");
const tradeRightTokenSelect = getRequiredElement("tradeRightTokenSelect");
const tradeLoadLeftBtn = getRequiredElement("tradeLoadLeftBtn");
const tradeLoadRightBtn = getRequiredElement("tradeLoadRightBtn");
const tradePreviewBtn = getRequiredElement("tradePreviewBtn");
const executeTradeBtn = getRequiredElement("executeTradeBtn");
const tradeNotionalInput = getRequiredElement("tradeNotionalInput");
const tradeRoyaltyReceiverOutput = getRequiredElement("tradeRoyaltyReceiverOutput");
const tradeRoyaltyAmountOutput = getRequiredElement("tradeRoyaltyAmountOutput");
const tradeConsoleOutput = getRequiredElement("tradeConsoleOutput");
const tradeLeftAddressOutput = getRequiredElement("tradeLeftAddressOutput");
const tradeRightAddressOutput = getRequiredElement("tradeRightAddressOutput");
const tradeLeftImage = getRequiredElement("tradeLeftImage");
const tradeRightImage = getRequiredElement("tradeRightImage");
const tradeLeftTitle = getRequiredElement("tradeLeftTitle");
const tradeRightTitle = getRequiredElement("tradeRightTitle");

const CONTRACT_OVERRIDE_STORAGE_KEY = "cs521.contract.override";

let provider;
let signer;
let contract;
let contractInfo;
let connectedAddress = null;
let connectedWalletLabel = null;
const walletMintHistory = new Map();
let ownershipRegistry = new Map();

const SAMPLE_LOCAL_WALLETS = {
  wallet1: {
    label: "Wallet 1",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
  },
  wallet2: {
    label: "Wallet 2",
    privateKey: "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  },
  wallet3: {
    label: "Wallet 3",
    privateKey: "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  },
};

function setActiveMode(mode) {
  const isTradeMode = mode === "trade";
  mintViewMode.classList.toggle("active", !isTradeMode);
  tradeMode.classList.toggle("active", isTradeMode);
  mintViewTabBtn.classList.toggle("active", !isTradeMode);
  tradeTabBtn.classList.toggle("active", isTradeMode);
}

function appendTradeConsole(message) {
  const now = new Date().toLocaleTimeString();
  tradeConsoleOutput.textContent = `[${now}] ${message}\n${tradeConsoleOutput.textContent}`.trim();
}

function getSelectedWallet(key) {
  return SAMPLE_LOCAL_WALLETS[key] || null;
}

function getWalletAddressFromConfig(walletConfig) {
  return ethers.computeAddress(walletConfig.privateKey);
}

function getReadonlyProvider() {
  const rpcUrl = rpcUrlInput.value.trim();
  if (!rpcUrl) {
    throw new Error("Enter RPC URL first.");
  }
  return new ethers.JsonRpcProvider(rpcUrl);
}

function getReadonlyContract(readProvider) {
  return new ethers.Contract(contractInfo.address, contractInfo.abi, readProvider);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function setOwnershipStatus(mode, explainText) {
  ownershipStatusOutput.classList.remove("owned", "not-owned", "unknown");

  if (mode === "owned") {
    ownershipStatusOutput.classList.add("owned");
    ownershipStatusOutput.textContent = "Owned by current wallet";
  } else if (mode === "not-owned") {
    ownershipStatusOutput.classList.add("not-owned");
    ownershipStatusOutput.textContent = "Not owned by current wallet";
  } else {
    ownershipStatusOutput.classList.add("unknown");
    ownershipStatusOutput.textContent = "No token viewed yet";
  }

  ownershipExplainOutput.textContent = explainText;
}

function isValidPrivateKey(value) {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

async function copyText(text, successMessage) {
  if (!text || text === "-" || text === "None") {
    setStatus("Nothing to copy yet.");
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    setStatus(successMessage);
  } catch (err) {
    setStatus(`Copy failed: ${err.message}`);
  }
}

function setLoader(visible, message = "Working...") {
  loaderEl.classList.toggle("hidden", !visible);
  loaderTextEl.textContent = message;
}

function setButtonLoading(button, isLoading, loadingText) {
  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent;
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.originalText;
}

function readContractOverride() {
  try {
    const raw = localStorage.getItem(CONTRACT_OVERRIDE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed?.address || !ethers.isAddress(parsed.address)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistContractOverride(address, chainId, network) {
  try {
    localStorage.setItem(
      CONTRACT_OVERRIDE_STORAGE_KEY,
      JSON.stringify({ address, chainId, network, updatedAt: Date.now() })
    );
  } catch {
    // Ignore storage failures.
  }
}

async function deployContractForCurrentDemoWallet(rpcUrl, selectedWallet) {
  if (!contractInfo?.bytecode || typeof contractInfo.bytecode !== "string" || !contractInfo.bytecode.startsWith("0x")) {
    throw new Error("contract-info.json is missing bytecode. Run one terminal deploy to refresh it.");
  }

  const deployProvider = new ethers.JsonRpcProvider(rpcUrl);
  const deploySigner = new ethers.Wallet(selectedWallet.privateKey, deployProvider);
  const factory = new ethers.ContractFactory(contractInfo.abi, contractInfo.bytecode, deploySigner);
  const deployedContract = await factory.deploy();
  await deployedContract.waitForDeployment();

  const newAddress = await deployedContract.getAddress();
  const network = await deployProvider.getNetwork();

  contractInfo.address = newAddress;
  contractInfo.chainId = Number(network.chainId);
  contractInfo.network = contractInfo.network || "localhost";
  persistContractOverride(newAddress, contractInfo.chainId, contractInfo.network);

  return newAddress;
}

function updateConnectionUi() {
  const isConnected = Boolean(contract && connectedAddress);
  mintBtn.disabled = !isConnected;
  viewBtn.disabled = !isConnected;
  connectedWalletOutput.textContent = connectedWalletLabel || "None";
  connectedAddressOutput.textContent = connectedAddress || "None";
  copyConnectedBtn.disabled = !isConnected;
}

function resetUiState(options = {}) {
  const {
    statusMessage = "🔄 UI reset complete. Select a wallet and click Connect to continue.",
    ownershipMessage = "UI reset complete. Connect wallet and view a token to compare owner.",
  } = options;

  provider = undefined;
  signer = undefined;
  contract = undefined;
  connectedAddress = null;
  connectedWalletLabel = null;

  walletMintHistory.clear();
  ownershipRegistry = new Map();

  ownerOutput.textContent = "-";
  metadataOutput.textContent = "-";
  nftImage.removeAttribute("src");
  myBalanceOutput.textContent = "-";
  myOwnedTokenIdsOutput.textContent = "-";
  lastMintTokenOutput.textContent = "-";
  lastMintTxOutput.textContent = "-";
  tokenIdInput.value = "0";

  setOwnershipStatus("unknown", ownershipMessage);

  updateConnectionUi();
  renderRecentMintedIds();
  renderMasterWalletView();
  setStatus(statusMessage);
}

async function hardResetChain() {
  const rpcUrl = rpcUrlInput.value.trim();
  const selectedWallet = SAMPLE_LOCAL_WALLETS[walletSelect.value];
  if (!rpcUrl) {
    setStatus("Enter an RPC URL before running Hard Reset Chain.");
    return;
  }

  if (!selectedWallet || !isValidPrivateKey(selectedWallet.privateKey)) {
    setStatus("Select a valid wallet before running Hard Reset Chain.");
    return;
  }

  const approved = window.confirm(
    "Hard reset will erase ALL local on-chain data on your Hardhat node. Continue?"
  );
  if (!approved) {
    setStatus("Hard reset canceled.");
    return;
  }

  try {
    setLoader(true, "Hard resetting local chain...");
    setButtonLoading(hardResetBtn, true, "Resetting...");

    const resetProvider = new ethers.JsonRpcProvider(rpcUrl);
    await resetProvider.send("hardhat_reset", []);

    resetUiState({
      statusMessage: "🧨 Chain reset complete. Redeploying contract in-app...",
      ownershipMessage: "Chain reset complete. Redeploying demo contract now.",
    });

    const newAddress = await deployContractForCurrentDemoWallet(rpcUrl, selectedWallet);

    setStatus(
      `✅ Hard reset + auto redeploy complete.\n` +
      `New contract: ${newAddress}\n` +
      `Reconnecting ${selectedWallet.label}...`
    );

    await connectSampleWallet();
  } catch (err) {
    setStatus(
      `Hard reset failed: ${err.message}\n` +
      "Tip: this works on Hardhat localhost JSON-RPC. Ensure node is running and RPC URL is correct."
    );
  } finally {
    setLoader(false);
    setButtonLoading(hardResetBtn, false, "Resetting...");
  }
}

async function refreshWalletStats() {
  if (!contract || !connectedAddress) {
    myBalanceOutput.textContent = "-";
    myOwnedTokenIdsOutput.textContent = "-";
    return;
  }

  const count = await contract.balanceOf(connectedAddress);
  myBalanceOutput.textContent = count.toString();

  const ownedIds = ownershipRegistry.get(connectedAddress) || [];
  myOwnedTokenIdsOutput.textContent = ownedIds.length > 0 ? ownedIds.map((id) => `#${id}`).join(", ") : "None";
}

function renderRecentMintedIds() {
  recentMintedList.innerHTML = "";

  const walletHistory = connectedAddress ? (walletMintHistory.get(connectedAddress) || []) : [];

  if (walletHistory.length === 0) {
    const li = document.createElement("li");
    li.className = "helper";
    li.style.margin = "0";
    li.textContent = connectedAddress ? "No mints for this wallet yet." : "Connect a wallet first.";
    recentMintedList.appendChild(li);
    return;
  }

  walletHistory.forEach((id) => {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = `#${id}`;
    btn.addEventListener("click", () => {
      tokenIdInput.value = id;
      viewToken();
    });
    li.appendChild(btn);
    recentMintedList.appendChild(li);
  });
}

function renderMasterWalletView() {
  masterWalletList.innerHTML = "";

  if (ownershipRegistry.size === 0) {
    const empty = document.createElement("li");
    empty.className = "helper";
    empty.style.margin = "0";
    empty.textContent = "No minted NFTs yet.";
    masterWalletList.appendChild(empty);
    return;
  }

  const sortedEntries = Array.from(ownershipRegistry.entries()).sort((a, b) => b[1].length - a[1].length);

  sortedEntries.forEach(([wallet, tokenIds]) => {
    const li = document.createElement("li");

    const walletLine = document.createElement("div");
    walletLine.innerHTML = `<strong>${wallet}</strong> (${tokenIds.length} NFT${tokenIds.length === 1 ? "" : "s"})`;

    const tokenLine = document.createElement("div");
    if (tokenIds.length === 0) {
      tokenLine.textContent = "No tokens";
    } else {
      tokenLine.innerHTML = tokenIds
        .map((id) => `<span class="token-pill">#${id}</span>`)
        .join("");
    }

    li.appendChild(walletLine);
    li.appendChild(tokenLine);
    masterWalletList.appendChild(li);
  });
}

async function refreshOwnershipRegistry() {
  if (!contract) {
    ownershipRegistry = new Map();
    renderMasterWalletView();
    return;
  }

  const totalMinted = Number(await contract.totalMinted());
  const registry = new Map();

  for (let tokenId = 0; tokenId < totalMinted; tokenId += 1) {
    try {
      const owner = await contract.ownerOf(tokenId);
      const existing = registry.get(owner) || [];
      existing.push(tokenId.toString());
      registry.set(owner, existing);
    } catch {
      // Ignore missing/burned token IDs.
    }
  }

  ownershipRegistry = registry;
  renderMasterWalletView();
}

async function getOwnedTokenIdsForAddress(address) {
  const readProvider = getReadonlyProvider();
  const readContract = getReadonlyContract(readProvider);
  const totalMinted = Number(await readContract.totalMinted());
  const owned = [];

  for (let tokenId = 0; tokenId < totalMinted; tokenId += 1) {
    try {
      const owner = await readContract.ownerOf(tokenId);
      if (owner.toLowerCase() === address.toLowerCase()) {
        owned.push(tokenId.toString());
      }
    } catch {
      // ignore gaps
    }
  }

  return owned;
}

function setTokenSelectOptions(selectEl, tokenIds) {
  selectEl.innerHTML = "";
  if (tokenIds.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No NFTs";
    selectEl.appendChild(opt);
    return;
  }

  tokenIds.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `#${id}`;
    selectEl.appendChild(opt);
  });
}

function clearTradePreview(side) {
  const isLeft = side === "left";
  const imageEl = isLeft ? tradeLeftImage : tradeRightImage;
  const titleEl = isLeft ? tradeLeftTitle : tradeRightTitle;
  imageEl.removeAttribute("src");
  titleEl.textContent = "Select an NFT to preview player";
}

async function refreshTradePreview(side) {
  const isLeft = side === "left";
  const selectEl = isLeft ? tradeLeftTokenSelect : tradeRightTokenSelect;
  const imageEl = isLeft ? tradeLeftImage : tradeRightImage;
  const titleEl = isLeft ? tradeLeftTitle : tradeRightTitle;
  const tokenId = selectEl.value;

  if (tokenId === "") {
    clearTradePreview(side);
    return;
  }

  try {
    const readProvider = getReadonlyProvider();
    const readContract = getReadonlyContract(readProvider);
    const tokenUri = await readContract.tokenURI(tokenId);
    const metadata = parseDataUriJson(tokenUri);
    imageEl.src = metadata.image || "";
    titleEl.textContent = metadata.name ? `${metadata.name} (Token #${tokenId})` : `Token #${tokenId}`;
  } catch {
    clearTradePreview(side);
    titleEl.textContent = `Could not load preview for token #${tokenId}`;
  }
}

async function loadTradeSide(side) {
  const isLeft = side === "left";
  const walletKey = isLeft ? tradeLeftWalletSelect.value : tradeRightWalletSelect.value;
  const walletConfig = getSelectedWallet(walletKey);

  if (!walletConfig) {
    throw new Error("Invalid wallet selected.");
  }

  const walletAddress = getWalletAddressFromConfig(walletConfig);
  const owned = await getOwnedTokenIdsForAddress(walletAddress);

  if (isLeft) {
    tradeLeftAddressOutput.textContent = walletAddress;
    setTokenSelectOptions(tradeLeftTokenSelect, owned);
    await refreshTradePreview("left");
  } else {
    tradeRightAddressOutput.textContent = walletAddress;
    setTokenSelectOptions(tradeRightTokenSelect, owned);
    await refreshTradePreview("right");
  }
}

async function previewTradeRoyalty() {
  const leftTokenId = tradeLeftTokenSelect.value;
  if (leftTokenId === "") {
    appendTradeConsole("Select a left-side NFT first to preview royalty.");
    return;
  }

  const notionalEth = Number(tradeNotionalInput.value || "0");
  if (!Number.isFinite(notionalEth) || notionalEth < 0) {
    appendTradeConsole("Invalid notional ETH value.");
    return;
  }

  const notionalWei = ethers.parseEther(notionalEth.toString());
  const readProvider = getReadonlyProvider();
  const readContract = getReadonlyContract(readProvider);
  const [receiver, amount] = await readContract.royaltyInfo(leftTokenId, notionalWei);

  tradeRoyaltyReceiverOutput.textContent = receiver;
  tradeRoyaltyAmountOutput.textContent = `${ethers.formatEther(amount)} ETH`;
  appendTradeConsole(
    `Royalty preview for token #${leftTokenId}: ${ethers.formatEther(amount)} ETH to ${receiver} (informational for swaps).`
  );
}

async function executeWalletSwapTrade() {
  const leftWallet = getSelectedWallet(tradeLeftWalletSelect.value);
  const rightWallet = getSelectedWallet(tradeRightWalletSelect.value);
  const leftTokenId = tradeLeftTokenSelect.value;
  const rightTokenId = tradeRightTokenSelect.value;

  if (!leftWallet || !rightWallet) {
    appendTradeConsole("Pick valid wallets on both sides.");
    return;
  }
  if (tradeLeftWalletSelect.value === tradeRightWalletSelect.value) {
    appendTradeConsole("Left and right wallets must be different.");
    return;
  }
  if (leftTokenId === "" || rightTokenId === "") {
    appendTradeConsole("Select an NFT on both sides.");
    return;
  }

  try {
    setLoader(true, "Executing wallet swap...");
    setButtonLoading(executeTradeBtn, true, "Swapping...");

    const readProvider = getReadonlyProvider();
    const leftSigner = new ethers.Wallet(leftWallet.privateKey, readProvider);
    const rightSigner = new ethers.Wallet(rightWallet.privateKey, readProvider);
    const leftAddress = await leftSigner.getAddress();
    const rightAddress = await rightSigner.getAddress();

    const leftContract = new ethers.Contract(contractInfo.address, contractInfo.abi, leftSigner);
    const rightContract = new ethers.Contract(contractInfo.address, contractInfo.abi, rightSigner);

    const [leftOwner, rightOwner] = await Promise.all([
      leftContract.ownerOf(leftTokenId),
      rightContract.ownerOf(rightTokenId),
    ]);

    if (leftOwner.toLowerCase() !== leftAddress.toLowerCase()) {
      throw new Error(`Left wallet does not own token #${leftTokenId}.`);
    }
    if (rightOwner.toLowerCase() !== rightAddress.toLowerCase()) {
      throw new Error(`Right wallet does not own token #${rightTokenId}.`);
    }

    appendTradeConsole(`Sending #${leftTokenId} from ${leftWallet.label} to ${rightWallet.label}...`);
    const tx1 = await leftContract.transferFrom(leftAddress, rightAddress, leftTokenId);
    await tx1.wait();

    appendTradeConsole(`Sending #${rightTokenId} from ${rightWallet.label} to ${leftWallet.label}...`);
    const tx2 = await rightContract.transferFrom(rightAddress, leftAddress, rightTokenId);
    await tx2.wait();

    appendTradeConsole(`✅ Trade complete: ${leftWallet.label} traded #${leftTokenId} with ${rightWallet.label} for #${rightTokenId}.`);
    setStatus(`✅ Trade complete between ${leftWallet.label} and ${rightWallet.label}.`);

    await loadTradeSide("left");
    await loadTradeSide("right");
    await refreshOwnershipRegistry();
    await refreshWalletStats();
    renderRecentMintedIds();
    await previewTradeRoyalty();
  } catch (err) {
    appendTradeConsole(`Trade failed: ${err.message}`);
    setStatus(`Trade failed: ${err.message}`);
  } finally {
    setLoader(false);
    setButtonLoading(executeTradeBtn, false, "Swapping...");
  }
}

function pushWalletMintHistory(wallet, tokenId) {
  const existing = walletMintHistory.get(wallet) || [];
  const next = [tokenId, ...existing.filter((id) => id !== tokenId)].slice(0, 8);
  walletMintHistory.set(wallet, next);
}

function parseDataUriJson(uri) {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) {
    throw new Error("Unexpected tokenURI format");
  }

  const encoded = uri.slice(prefix.length);
  const decoded = atob(encoded);
  return JSON.parse(decoded);
}

async function loadContractInfo() {
  const res = await fetch("./contract-info.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Missing contract-info.json. Deploy contract first.");
  }

  const info = await res.json();
  if (!info.address || !ethers.isAddress(info.address)) {
    throw new Error("contract-info.json has invalid contract address. Re-run deploy.");
  }
  if (!Array.isArray(info.abi) || info.abi.length === 0) {
    throw new Error("contract-info.json is missing ABI. Re-run deploy.");
  }

  const override = readContractOverride();
  if (override) {
    info.address = override.address;
    if (typeof override.chainId === "number") {
      info.chainId = override.chainId;
    }
    if (typeof override.network === "string" && override.network.length > 0) {
      info.network = override.network;
    }
  }

  return info;
}

async function connectSampleWallet() {
  const rpcUrl = rpcUrlInput.value.trim();
  const selectedWallet = SAMPLE_LOCAL_WALLETS[walletSelect.value];

  if (!rpcUrl) {
    setStatus("Enter an RPC URL (e.g., http://127.0.0.1:8545).");
    return;
  }

  if (!selectedWallet || !isValidPrivateKey(selectedWallet.privateKey)) {
    setStatus("Selected wallet is invalid. Choose Wallet 1, Wallet 2, or Wallet 3.");
    return;
  }

  try {
    setLoader(true, "Connecting wallet...");
    setStatus(`Connecting ${selectedWallet.label}...`);

    provider = new ethers.JsonRpcProvider(rpcUrl);
    await provider.getBlockNumber();

    const codeAtAddress = await provider.getCode(contractInfo.address);
    if (codeAtAddress === "0x") {
      throw new Error("No deployed contract found at configured address. Run 'npm run deploy:local' first.");
    }

    signer = new ethers.Wallet(selectedWallet.privateKey, provider);
    contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);

    const network = await provider.getNetwork();
    connectedAddress = await signer.getAddress();
    connectedWalletLabel = selectedWallet.label;

    updateConnectionUi();
    await refreshOwnershipRegistry();
    await refreshWalletStats();
    renderRecentMintedIds();
    await loadTradeSide("left");
    await loadTradeSide("right");
    await previewTradeRoyalty();

    setOwnershipStatus(
      "unknown",
      "ERC-721 allows any wallet to view any token ID. Use View NFT to check whether the selected token is owned by this wallet."
    );

    setStatus(
      `✅ ${selectedWallet.label} connected: ${connectedAddress}\n` +
      `RPC chainId: ${Number(network.chainId)}\n` +
      `Contract chainId: ${contractInfo.chainId} (${contractInfo.network})\n` +
      `Next: click 'Mint NFT' in Step 2.`
    );
  } catch (err) {
    setStatus(
      `Local wallet connect failed: ${err.message}\n` +
      `Tip: make sure 'npm run node' is running and RPC URL is http://127.0.0.1:8545.`
    );
  } finally {
    setLoader(false);
  }
}

async function mintNft() {
  if (!contract) {
    setStatus("Connect wallet first.");
    return;
  }

  try {
    setLoader(true, "Minting NFT on blockchain... (this may take a few seconds)");
    setButtonLoading(mintBtn, true, "Minting...");
    setStatus("Minting NFT...");

    const tx = await contract.mint();
    const receipt = await tx.wait();

    const transferLog = receipt.logs
      .map((log) => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((log) => log && log.name === "Transfer");

    const mintedTokenId = transferLog ? transferLog.args.tokenId.toString() : null;

    if (mintedTokenId !== null) {
      tokenIdInput.value = mintedTokenId;
      lastMintTokenOutput.textContent = mintedTokenId;
      if (connectedAddress) {
        pushWalletMintHistory(connectedAddress, mintedTokenId);
      }
      await refreshOwnershipRegistry();
      await refreshWalletStats();
      renderRecentMintedIds();
      await loadTradeSide("left");
      await loadTradeSide("right");
      await previewTradeRoyalty();
    }

    lastMintTxOutput.textContent = receipt.hash;

    setStatus(
      `✅ Mint successful.\n` +
      `${mintedTokenId !== null ? `New Token ID: ${mintedTokenId}\n` : ""}` +
      `Tx hash: ${receipt.hash}\n` +
      `Next: click 'View NFT' in Step 3.`
    );
  } catch (err) {
    setStatus(`Mint failed: ${err.message}`);
  } finally {
    setLoader(false);
    setButtonLoading(mintBtn, false, "Minting...");
  }
}

async function viewToken() {
  if (!contract) {
    setStatus("Connect wallet first.");
    return;
  }

  const tokenId = tokenIdInput.value;
  if (tokenId === "") {
    setStatus("Enter a token ID.");
    return;
  }

  try {
    setLoader(true, `Loading token #${tokenId}...`);
    setButtonLoading(viewBtn, true, "Loading...");
    setStatus(`Loading token #${tokenId}...`);

    const [owner, tokenUri] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
    ]);

    const metadata = parseDataUriJson(tokenUri);
    const ownerLower = owner.toLowerCase();
    const connectedLower = connectedAddress ? connectedAddress.toLowerCase() : "";
    const isOwnedByCurrentWallet = Boolean(connectedLower) && ownerLower === connectedLower;

    ownerOutput.textContent = owner;
    metadataOutput.textContent = JSON.stringify(metadata, null, 2);
    nftImage.src = metadata.image;
    setOwnershipStatus(
      isOwnedByCurrentWallet ? "owned" : "not-owned",
      isOwnedByCurrentWallet
        ? `Token #${tokenId} is owned by your connected wallet.`
        : `Token #${tokenId} is valid and viewable by anyone, but ownership belongs to a different wallet.`
    );
    setStatus(`✅ Loaded token #${tokenId}. You can now inspect owner, metadata, and image.`);
  } catch (err) {
    ownerOutput.textContent = "-";
    metadataOutput.textContent = "-";
    nftImage.removeAttribute("src");
    setOwnershipStatus("unknown", "Could not load this token. Check token ID and try again.");
    const message = String(err?.message || "");
    if (message.toLowerCase().includes("token does not exist") || message.toLowerCase().includes("reverted")) {
      setStatus(`View failed: token #${tokenId} does not exist yet. Mint a new token first, then try again.`);
    } else {
      setStatus(`View failed: ${message}`);
    }
  } finally {
    setLoader(false);
    setButtonLoading(viewBtn, false, "Loading...");
  }
}

async function init() {
  try {
    contractInfo = await loadContractInfo();

    if (!contractInfo.address || contractInfo.address === ethers.ZeroAddress) {
      setStatus("Contract not deployed yet. Run deployment script first.");
      return;
    }

    setStatus(
      `Contract loaded: ${contractInfo.address}\n` +
      `Network: ${contractInfo.network} (chainId ${contractInfo.chainId})\n` +
      `Choose a wallet in Step 1 and click 'Connect'.`
    );

    setOwnershipStatus(
      "unknown",
      "ERC-721 token IDs are global. Anyone can view metadata for existing IDs; ownership is tracked separately by wallet address."
    );

    updateConnectionUi();
    renderMasterWalletView();
    renderRecentMintedIds();

    if (tradeRightWalletSelect.value === tradeLeftWalletSelect.value) {
      tradeRightWalletSelect.value = "wallet2";
    }
    await loadTradeSide("left");
    await loadTradeSide("right");
    await previewTradeRoyalty();
  } catch (err) {
    setStatus(`Initialization failed: ${err.message}`);
  }
}

function bindEvents() {
  mintViewTabBtn.addEventListener("click", () => setActiveMode("mint-view"));
  tradeTabBtn.addEventListener("click", () => setActiveMode("trade"));

  connectBtn.addEventListener("click", connectSampleWallet);
  resetUiBtn.addEventListener("click", () => {
    resetUiState({
      statusMessage: "🔄 UI reset complete. On-chain NFTs are unchanged.",
      ownershipMessage: "UI reset complete. Connect wallet and view a token to compare owner.",
    });
  });
  hardResetBtn.addEventListener("click", hardResetChain);
  tradeLoadLeftBtn.addEventListener("click", async () => {
    try {
      await loadTradeSide("left");
      await previewTradeRoyalty();
    } catch (err) {
      appendTradeConsole(`Load left side failed: ${err.message}`);
    }
  });
  tradeLoadRightBtn.addEventListener("click", async () => {
    try {
      await loadTradeSide("right");
      await previewTradeRoyalty();
    } catch (err) {
      appendTradeConsole(`Load right side failed: ${err.message}`);
    }
  });
  tradePreviewBtn.addEventListener("click", async () => {
    try {
      await previewTradeRoyalty();
    } catch (err) {
      appendTradeConsole(`Royalty preview failed: ${err.message}`);
    }
  });
  executeTradeBtn.addEventListener("click", executeWalletSwapTrade);
  tradeLeftWalletSelect.addEventListener("change", async () => {
    try {
      await loadTradeSide("left");
      await previewTradeRoyalty();
    } catch (err) {
      appendTradeConsole(`Left wallet update failed: ${err.message}`);
    }
  });
  tradeRightWalletSelect.addEventListener("change", async () => {
    try {
      await loadTradeSide("right");
      await previewTradeRoyalty();
    } catch (err) {
      appendTradeConsole(`Right wallet update failed: ${err.message}`);
    }
  });
  tradeLeftTokenSelect.addEventListener("change", () => {
    Promise.all([
      refreshTradePreview("left"),
      previewTradeRoyalty(),
    ]).catch((err) => appendTradeConsole(`Royalty preview failed: ${err.message}`));
  });
  tradeRightTokenSelect.addEventListener("change", () => {
    refreshTradePreview("right").catch((err) => appendTradeConsole(`Right preview failed: ${err.message}`));
  });
  tradeNotionalInput.addEventListener("change", () => {
    previewTradeRoyalty().catch((err) => appendTradeConsole(`Royalty preview failed: ${err.message}`));
  });

  mintBtn.addEventListener("click", mintNft);
  viewBtn.addEventListener("click", viewToken);
  copyConnectedBtn.addEventListener("click", () => copyText(connectedAddressOutput.textContent, "Connected wallet address copied."));
  copyOwnerBtn.addEventListener("click", () => copyText(ownerOutput.textContent, "Owner address copied."));
  copyTxBtn.addEventListener("click", () => copyText(lastMintTxOutput.textContent, "Last mint tx hash copied."));
}

try {
  bindEvents();
  init();
} catch (err) {
  console.error(err);
  setStatus(`Startup error: ${err.message}`);
}
