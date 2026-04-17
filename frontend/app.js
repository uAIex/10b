import { ethers } from "https://cdn.jsdelivr.net/npm/ethers@6.13.2/+esm";

const SEPOLIA_CHAIN_ID = 11155111;
const SEPOLIA_CHAIN_ID_HEX = "0xaa36a7";
const SEPOLIA_EXPLORER_TX = "https://sepolia.etherscan.io/tx/";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

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
const mintViewTabBtn = getRequiredElement("mintViewTabBtn");
const tradeTabBtn = getRequiredElement("tradeTabBtn");
const mintViewMode = getRequiredElement("mintViewMode");
const tradeMode = getRequiredElement("tradeMode");
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
const tradeLoadLeftBtn = getRequiredElement("tradeLoadLeftBtn");
const tradeLeftTokenSelect = getRequiredElement("tradeLeftTokenSelect");
const tradePreviewBtn = getRequiredElement("tradePreviewBtn");
const executeTradeBtn = getRequiredElement("executeTradeBtn");
const tradeNotionalInput = getRequiredElement("tradeNotionalInput");
const tradeRoyaltyReceiverOutput = getRequiredElement("tradeRoyaltyReceiverOutput");
const tradeRoyaltyAmountOutput = getRequiredElement("tradeRoyaltyAmountOutput");
const tradeConsoleOutput = getRequiredElement("tradeConsoleOutput");
const tradeLeftAddressOutput = getRequiredElement("tradeLeftAddressOutput");
const tradeLeftImage = getRequiredElement("tradeLeftImage");
const tradeLeftTitle = getRequiredElement("tradeLeftTitle");
const recipientAddressInput = getRequiredElement("recipientAddressInput");

let provider;
let signer;
let contract;
let contractInfo;
let connectedAddress = null;
const walletMintHistory = new Map();
let ownershipRegistry = new Map();

function setActiveMode(mode) {
  const isTradeMode = mode === "trade";
  mintViewMode.classList.toggle("active", !isTradeMode);
  tradeMode.classList.toggle("active", isTradeMode);
  mintViewTabBtn.classList.toggle("active", !isTradeMode);
  tradeTabBtn.classList.toggle("active", isTradeMode);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function appendTradeConsole(message) {
  const now = new Date().toLocaleTimeString();
  tradeConsoleOutput.textContent = `[${now}] ${message}\n${tradeConsoleOutput.textContent}`.trim();
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

function parseDataUriJson(uri) {
  const prefix = "data:application/json;base64,";
  if (!uri.startsWith(prefix)) {
    throw new Error("Unexpected tokenURI format");
  }

  return JSON.parse(atob(uri.slice(prefix.length)));
}

async function loadContractInfo() {
  const res = await fetch("./contract-info.json", { cache: "no-store" });
  if (!res.ok) {
    throw new Error("Missing contract-info.json. Deploy contract first.");
  }

  const info = await res.json();
  if (!info.address || !ethers.isAddress(info.address)) {
    throw new Error("contract-info.json has invalid contract address. Re-run deployment.");
  }
  if (!Array.isArray(info.abi) || info.abi.length === 0) {
    throw new Error("contract-info.json is missing ABI. Re-run deployment.");
  }

  return info;
}

function hasDeployedContract() {
  return Boolean(contractInfo?.address) && contractInfo.address !== ZERO_ADDRESS;
}

async function switchToSepolia() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not available. Install the MetaMask browser extension first.");
  }

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: SEPOLIA_CHAIN_ID_HEX }],
    });
  } catch (err) {
    if (err.code !== 4902) {
      throw err;
    }

    await window.ethereum.request({
      method: "wallet_addEthereumChain",
      params: [
        {
          chainId: SEPOLIA_CHAIN_ID_HEX,
          chainName: "Sepolia",
          nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
          rpcUrls: ["https://rpc.sepolia.org"],
          blockExplorerUrls: ["https://sepolia.etherscan.io"],
        },
      ],
    });
  }
}

function updateConnectionUi() {
  const isConnected = Boolean(contract && connectedAddress);
  mintBtn.disabled = !isConnected;
  viewBtn.disabled = !isConnected;
  executeTradeBtn.disabled = !isConnected;
  tradePreviewBtn.disabled = !isConnected;
  tradeLoadLeftBtn.disabled = !isConnected;
  connectedWalletOutput.textContent = isConnected ? "MetaMask" : "None";
  connectedAddressOutput.textContent = connectedAddress || "None";
  tradeLeftAddressOutput.textContent = connectedAddress || "-";
  copyConnectedBtn.disabled = !isConnected;
}

function resetUiState(options = {}) {
  const {
    statusMessage = "UI reset complete. Connect MetaMask to continue.",
    ownershipMessage = "UI reset complete. Connect MetaMask and view a token to compare owner.",
  } = options;

  provider = undefined;
  signer = undefined;
  contract = undefined;
  connectedAddress = null;
  ownershipRegistry = new Map();

  ownerOutput.textContent = "-";
  metadataOutput.textContent = "-";
  nftImage.removeAttribute("src");
  tradeLeftImage.removeAttribute("src");
  tradeLeftTitle.textContent = "Connect MetaMask and load your NFTs";
  myBalanceOutput.textContent = "-";
  myOwnedTokenIdsOutput.textContent = "-";
  lastMintTokenOutput.textContent = "-";
  lastMintTxOutput.textContent = "-";
  tokenIdInput.value = "0";
  tradeRoyaltyReceiverOutput.textContent = "-";
  tradeRoyaltyAmountOutput.textContent = "-";

  setOwnershipStatus("unknown", ownershipMessage);
  updateConnectionUi();
  renderRecentMintedIds();
  renderMasterWalletView();
  setTokenSelectOptions(tradeLeftTokenSelect, []);
  setStatus(statusMessage);
}

async function refreshWalletStats() {
  if (!contract || !connectedAddress) {
    myBalanceOutput.textContent = "-";
    myOwnedTokenIdsOutput.textContent = "-";
    return;
  }

  const count = await contract.balanceOf(connectedAddress);
  const ownedIds = ownershipRegistry.get(connectedAddress) || [];
  myBalanceOutput.textContent = count.toString();
  myOwnedTokenIdsOutput.textContent = ownedIds.length > 0 ? ownedIds.map((id) => `#${id}`).join(", ") : "None";
}

function renderRecentMintedIds() {
  recentMintedList.innerHTML = "";

  const walletHistory = connectedAddress ? (walletMintHistory.get(connectedAddress) || []) : [];
  if (walletHistory.length === 0) {
    const li = document.createElement("li");
    li.className = "helper";
    li.style.margin = "0";
    li.textContent = connectedAddress ? "No mints for this wallet yet." : "Connect MetaMask first.";
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
    empty.textContent = "No minted NFTs found yet.";
    masterWalletList.appendChild(empty);
    return;
  }

  const sortedEntries = Array.from(ownershipRegistry.entries()).sort((a, b) => b[1].length - a[1].length);

  sortedEntries.forEach(([wallet, tokenIds]) => {
    const li = document.createElement("li");
    const walletLine = document.createElement("div");
    walletLine.innerHTML = `<strong>${wallet}</strong> (${tokenIds.length} NFT${tokenIds.length === 1 ? "" : "s"})`;

    const tokenLine = document.createElement("div");
    tokenLine.innerHTML = tokenIds.map((id) => `<span class="token-pill">#${id}</span>`).join("");

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

async function refreshTransferTokens() {
  if (!connectedAddress) {
    setTokenSelectOptions(tradeLeftTokenSelect, []);
    tradeLeftAddressOutput.textContent = "-";
    return;
  }

  await refreshOwnershipRegistry();
  const owned = ownershipRegistry.get(connectedAddress) || [];
  setTokenSelectOptions(tradeLeftTokenSelect, owned);
  tradeLeftAddressOutput.textContent = connectedAddress;
  await refreshTradePreview();
}

async function refreshTradePreview() {
  const tokenId = tradeLeftTokenSelect.value;
  if (tokenId === "") {
    tradeLeftImage.removeAttribute("src");
    tradeLeftTitle.textContent = "No NFT selected";
    return;
  }

  try {
    const [tokenUri, notionalWei] = await Promise.all([
      contract.tokenURI(tokenId),
      Promise.resolve(ethers.parseEther((tradeNotionalInput.value || "0").toString())),
    ]);
    const metadata = parseDataUriJson(tokenUri);
    const [receiver, amount] = await contract.royaltyInfo(tokenId, notionalWei);

    tradeLeftImage.src = metadata.image || "";
    tradeLeftTitle.textContent = metadata.name ? `${metadata.name} (Token #${tokenId})` : `Token #${tokenId}`;
    tradeRoyaltyReceiverOutput.textContent = receiver;
    tradeRoyaltyAmountOutput.textContent = `${ethers.formatEther(amount)} ETH`;
    appendTradeConsole(`Royalty preview for token #${tokenId}: ${ethers.formatEther(amount)} ETH to ${receiver}.`);
  } catch (err) {
    tradeLeftImage.removeAttribute("src");
    tradeLeftTitle.textContent = `Could not load token #${tokenId}`;
    appendTradeConsole(`Preview failed: ${err.message}`);
  }
}

async function transferSelectedNft() {
  if (!contract || !connectedAddress) {
    appendTradeConsole("Connect MetaMask first.");
    return;
  }

  const tokenId = tradeLeftTokenSelect.value;
  const recipient = recipientAddressInput.value.trim();
  if (tokenId === "") {
    appendTradeConsole("Select one of your NFTs first.");
    return;
  }
  if (!ethers.isAddress(recipient)) {
    appendTradeConsole("Enter a valid recipient wallet address.");
    return;
  }

  try {
    setLoader(true, "Waiting for MetaMask transfer approval...");
    setButtonLoading(executeTradeBtn, true, "Transferring...");

    const owner = await contract.ownerOf(tokenId);
    if (owner.toLowerCase() !== connectedAddress.toLowerCase()) {
      throw new Error(`Connected wallet does not own token #${tokenId}.`);
    }

    const tx = await contract.transferFrom(connectedAddress, recipient, tokenId);
    appendTradeConsole(`Transfer submitted: ${tx.hash}`);
    const receipt = await tx.wait();

    appendTradeConsole(`Transfer complete: token #${tokenId} sent to ${recipient}.`);
    setStatus(`Transfer successful.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);

    await refreshOwnershipRegistry();
    await refreshWalletStats();
    await refreshTransferTokens();
    renderRecentMintedIds();
  } catch (err) {
    appendTradeConsole(`Transfer failed: ${err.message}`);
    setStatus(`Transfer failed: ${err.message}`);
  } finally {
    setLoader(false);
    setButtonLoading(executeTradeBtn, false, "Transferring...");
  }
}

function pushWalletMintHistory(wallet, tokenId) {
  const existing = walletMintHistory.get(wallet) || [];
  const next = [tokenId, ...existing.filter((id) => id !== tokenId)].slice(0, 8);
  walletMintHistory.set(wallet, next);
}

async function connectMetaMask() {
  if (!hasDeployedContract()) {
    setStatus("Deploy the contract to Sepolia first. Then commit the updated frontend/contract-info.json.");
    return;
  }

  try {
    setLoader(true, "Connecting MetaMask...");
    setButtonLoading(connectBtn, true, "Connecting...");

    await switchToSepolia();
    await window.ethereum.request({ method: "eth_requestAccounts" });

    provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
      throw new Error(`Please switch MetaMask to Sepolia. Current chainId: ${Number(network.chainId)}.`);
    }

    if (Number(contractInfo.chainId) !== SEPOLIA_CHAIN_ID) {
      throw new Error(`contract-info.json is not configured for Sepolia. Current chainId: ${contractInfo.chainId}.`);
    }

    const codeAtAddress = await provider.getCode(contractInfo.address);
    if (codeAtAddress === "0x") {
      throw new Error("No deployed contract found at the configured Sepolia address. Re-run npm run deploy:sepolia.");
    }

    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();
    contract = new ethers.Contract(contractInfo.address, contractInfo.abi, signer);

    updateConnectionUi();
    await refreshOwnershipRegistry();
    await refreshWalletStats();
    await refreshTransferTokens();
    renderRecentMintedIds();

    setOwnershipStatus(
      "unknown",
      "ERC-721 token IDs are global. Anyone can view metadata; ownership is compared against your MetaMask account."
    );

    setStatus(
      `MetaMask connected on Sepolia.\n` +
      `Wallet: ${connectedAddress}\n` +
      `Contract: ${contractInfo.address}\n` +
      `Next: click Mint NFT and approve the Sepolia test ETH transaction in MetaMask.`
    );
  } catch (err) {
    setStatus(`MetaMask connect failed: ${err.message}`);
  } finally {
    setLoader(false);
    setButtonLoading(connectBtn, false, "Connecting...");
  }
}

async function mintNft() {
  if (!contract) {
    setStatus("Connect MetaMask first.");
    return;
  }

  try {
    setLoader(true, "Waiting for MetaMask mint approval...");
    setButtonLoading(mintBtn, true, "Minting...");
    setStatus("Approve the mint transaction in MetaMask. Sepolia test ETH pays the gas fee.");

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
      pushWalletMintHistory(connectedAddress, mintedTokenId);
      await refreshOwnershipRegistry();
      await refreshWalletStats();
      await refreshTransferTokens();
      renderRecentMintedIds();
    }

    lastMintTxOutput.textContent = receipt.hash;
    setStatus(
      `Mint successful on Sepolia.\n` +
      `${mintedTokenId !== null ? `New Token ID: ${mintedTokenId}\n` : ""}` +
      `Tx: ${receipt.hash}\n` +
      `Explorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`
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
    setStatus("Connect MetaMask first.");
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

    const [owner, tokenUri] = await Promise.all([
      contract.ownerOf(tokenId),
      contract.tokenURI(tokenId),
    ]);

    const metadata = parseDataUriJson(tokenUri);
    const isOwnedByCurrentWallet = owner.toLowerCase() === connectedAddress.toLowerCase();

    ownerOutput.textContent = owner;
    metadataOutput.textContent = JSON.stringify(metadata, null, 2);
    nftImage.src = metadata.image;
    setOwnershipStatus(
      isOwnedByCurrentWallet ? "owned" : "not-owned",
      isOwnedByCurrentWallet
        ? `Token #${tokenId} is owned by your MetaMask account.`
        : `Token #${tokenId} exists, but ownership belongs to a different wallet.`
    );
    setStatus(`Loaded token #${tokenId} from Sepolia.`);
  } catch (err) {
    ownerOutput.textContent = "-";
    metadataOutput.textContent = "-";
    nftImage.removeAttribute("src");
    setOwnershipStatus("unknown", "Could not load this token. Check token ID and try again.");
    setStatus(`View failed: ${err.message}`);
  } finally {
    setLoader(false);
    setButtonLoading(viewBtn, false, "Loading...");
  }
}

function bindWalletEvents() {
  if (!window.ethereum) return;

  window.ethereum.on("accountsChanged", () => {
    resetUiState({
      statusMessage: "MetaMask account changed. Click Connect MetaMask again.",
      ownershipMessage: "Reconnect MetaMask to compare ownership with the selected account.",
    });
  });

  window.ethereum.on("chainChanged", () => {
    resetUiState({
      statusMessage: "Network changed. Click Connect MetaMask to reconnect on Sepolia.",
      ownershipMessage: "Reconnect MetaMask on Sepolia to continue.",
    });
  });
}

async function init() {
  try {
    contractInfo = await loadContractInfo();

    if (!hasDeployedContract()) {
      setStatus(
        `Sepolia frontend is ready, but no contract address is configured yet.\n` +
        `Run npm run deploy:sepolia, then commit the updated frontend/contract-info.json.`
      );
      updateConnectionUi();
      renderMasterWalletView();
      renderRecentMintedIds();
      return;
    }

    setStatus(
      `Sepolia contract loaded: ${contractInfo.address}\n` +
      `Network: ${contractInfo.network} (chainId ${contractInfo.chainId})\n` +
      `Click Connect MetaMask to mint/view NFTs.`
    );

    setOwnershipStatus(
      "unknown",
      "ERC-721 token IDs are global. Connect MetaMask, then view a token to compare ownership."
    );

    updateConnectionUi();
    renderMasterWalletView();
    renderRecentMintedIds();
  } catch (err) {
    setStatus(`Initialization failed: ${err.message}`);
  }
}

function bindEvents() {
  mintViewTabBtn.addEventListener("click", () => setActiveMode("mint-view"));
  tradeTabBtn.addEventListener("click", () => setActiveMode("trade"));
  connectBtn.addEventListener("click", connectMetaMask);
  resetUiBtn.addEventListener("click", () => {
    resetUiState({
      statusMessage: "UI reset complete. On-chain Sepolia NFTs are unchanged.",
      ownershipMessage: "UI reset complete. Connect MetaMask and view a token to compare owner.",
    });
  });

  mintBtn.addEventListener("click", mintNft);
  viewBtn.addEventListener("click", viewToken);
  tradeLoadLeftBtn.addEventListener("click", () => {
    refreshTransferTokens().catch((err) => appendTradeConsole(`Load failed: ${err.message}`));
  });
  tradePreviewBtn.addEventListener("click", () => {
    refreshTradePreview().catch((err) => appendTradeConsole(`Preview failed: ${err.message}`));
  });
  executeTradeBtn.addEventListener("click", transferSelectedNft);
  tradeLeftTokenSelect.addEventListener("change", () => {
    refreshTradePreview().catch((err) => appendTradeConsole(`Preview failed: ${err.message}`));
  });
  tradeNotionalInput.addEventListener("change", () => {
    refreshTradePreview().catch((err) => appendTradeConsole(`Preview failed: ${err.message}`));
  });
  copyConnectedBtn.addEventListener("click", () => copyText(connectedAddressOutput.textContent, "Connected wallet address copied."));
  copyOwnerBtn.addEventListener("click", () => copyText(ownerOutput.textContent, "Owner address copied."));
  copyTxBtn.addEventListener("click", () => copyText(lastMintTxOutput.textContent, "Last mint tx hash copied."));
}

try {
  bindEvents();
  bindWalletEvents();
  init();
} catch (err) {
  console.error(err);
  setStatus(`Startup error: ${err.message}`);
}
