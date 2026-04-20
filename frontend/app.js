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
const predictionTabBtn = getRequiredElement("predictionTabBtn");
const mintViewMode = getRequiredElement("mintViewMode");
const tradeMode = getRequiredElement("tradeMode");
const predictionMode = getRequiredElement("predictionMode");
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
const tradeLeftTokenSelect = getRequiredElement("tradeLeftTokenSelect");
const tradeLoadLeftBtn = getRequiredElement("tradeLoadLeftBtn");
const approveLeftBtn = getRequiredElement("approveLeftBtn");
const tradeLeftAddressOutput = getRequiredElement("tradeLeftAddressOutput");
const tradeLeftImage = getRequiredElement("tradeLeftImage");
const tradeLeftTitle = getRequiredElement("tradeLeftTitle");

const tradeRightWalletSelect = getRequiredElement("tradeRightWalletSelect");
const tradeRightTokenSelect = getRequiredElement("tradeRightTokenSelect");
const tradeLoadRightBtn = getRequiredElement("tradeLoadRightBtn");
const approveRightBtn = getRequiredElement("approveRightBtn");
const tradeRightAddressOutput = getRequiredElement("tradeRightAddressOutput");
const tradeRightImage = getRequiredElement("tradeRightImage");
const tradeRightTitle = getRequiredElement("tradeRightTitle");

const tradeNotionalInput = getRequiredElement("tradeNotionalInput");
const tradePreviewBtn = getRequiredElement("tradePreviewBtn");
const executeTradeBtn = getRequiredElement("executeTradeBtn");
const tradeRoyaltyReceiverOutput = getRequiredElement("tradeRoyaltyReceiverOutput");
const tradeRoyaltyAmountOutput = getRequiredElement("tradeRoyaltyAmountOutput");
const tradeConsoleOutput = getRequiredElement("tradeConsoleOutput");

const predictionMarketSelect = getRequiredElement("predictionMarketSelect");
const predictionOutcomeSelect = getRequiredElement("predictionOutcomeSelect");
const predictionStakeInput = getRequiredElement("predictionStakeInput");
const mintPredictionBtn = getRequiredElement("mintPredictionBtn");
const refreshPredictionBtn = getRequiredElement("refreshPredictionBtn");
const claimPredictionBtn = getRequiredElement("claimPredictionBtn");
const predictionResolveOutcomeSelect = getRequiredElement("predictionResolveOutcomeSelect");
const resolvePredictionBtn = getRequiredElement("resolvePredictionBtn");
const predictionContractOutput = getRequiredElement("predictionContractOutput");
const predictionQuestionOutput = getRequiredElement("predictionQuestionOutput");
const predictionStatusOutput = getRequiredElement("predictionStatusOutput");
const predictionPoolOutput = getRequiredElement("predictionPoolOutput");
const predictionYesBalanceOutput = getRequiredElement("predictionYesBalanceOutput");
const predictionNoBalanceOutput = getRequiredElement("predictionNoBalanceOutput");
const predictionConsoleOutput = getRequiredElement("predictionConsoleOutput");

let provider;
let signer;
let nftContract;
let settlementContract;
let predictionContract;
let sepoliaConfig;
let connectedAddress = null;

const walletMintHistory = new Map();
let ownershipRegistry = new Map();

function setActiveMode(mode) {
  const isTradeMode = mode === "trade";
  const isPredictionMode = mode === "prediction";
  mintViewMode.classList.toggle("active", !isTradeMode && !isPredictionMode);
  tradeMode.classList.toggle("active", isTradeMode);
  predictionMode.classList.toggle("active", isPredictionMode);
  mintViewTabBtn.classList.toggle("active", !isTradeMode && !isPredictionMode);
  tradeTabBtn.classList.toggle("active", isTradeMode);
  predictionTabBtn.classList.toggle("active", isPredictionMode);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function appendTradeConsole(message) {
  const now = new Date().toLocaleTimeString();
  tradeConsoleOutput.textContent = `[${now}] ${message}\n${tradeConsoleOutput.textContent}`.trim();
}

function appendPredictionConsole(message) {
  const now = new Date().toLocaleTimeString();
  predictionConsoleOutput.textContent = `[${now}] ${message}\n${predictionConsoleOutput.textContent}`.trim();
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

async function fetchJson(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not load ${path}`);
  }
  return res.json();
}

function extractErrorMessage(err) {
  const raw =
    err?.shortMessage ||
    err?.reason ||
    err?.info?.error?.message ||
    err?.data?.message ||
    err?.message ||
    "Unknown error";

  return raw
    .replace("execution reverted: ", "")
    .replace("Error: ", "")
    .trim();
}

async function loadSepoliaConfig() {
  let primary;
  let legacy;

  try {
    primary = await fetchJson("./sepolia-config.json");
  } catch {
    primary = undefined;
  }

  try {
    legacy = await fetchJson("./contract-info.json");
  } catch {
    legacy = undefined;
  }

  if (!primary && !legacy) {
    throw new Error("Missing sepolia-config.json and contract-info.json. Deploy contracts first.");
  }

  const chainId = Number(primary?.chainId ?? legacy?.chainId ?? SEPOLIA_CHAIN_ID);
  const nftAddress = primary?.nft?.address ?? legacy?.address ?? ZERO_ADDRESS;
  const nftAbi = Array.isArray(primary?.nft?.abi) && primary.nft.abi.length > 0 ? primary.nft.abi : (legacy?.abi || []);
  const settlementAddress = primary?.settlement?.address ?? ZERO_ADDRESS;
  const settlementAbi = Array.isArray(primary?.settlement?.abi) ? primary.settlement.abi : [];
  const predictionAddress = primary?.prediction?.address ?? ZERO_ADDRESS;
  const predictionAbi = Array.isArray(primary?.prediction?.abi) ? primary.prediction.abi : [];
  const predictionMarkets = primary?.prediction?.markets ?? {};

  if (!ethers.isAddress(nftAddress)) {
    throw new Error("Invalid NFT contract address in config.");
  }

  return {
    network: primary?.network ?? legacy?.network ?? "sepolia",
    chainId,
    nft: {
      address: nftAddress,
      abi: nftAbi,
    },
    settlement: {
      address: settlementAddress,
      abi: settlementAbi,
    },
    prediction: {
      address: predictionAddress,
      abi: predictionAbi,
      markets: {
        ethPrice: Number(predictionMarkets.ethPrice ?? 1),
        nbaGame: Number(predictionMarkets.nbaGame ?? 2),
      },
    },
  };
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
  const nftReady = Boolean(nftContract && connectedAddress);
  const settlementReady = Boolean(settlementContract);
  const predictionReady = Boolean(predictionContract);
  const leftCanApprove = nftReady && settlementReady && tradeLeftTokenSelect.value !== "";
  const rightCanApprove = nftReady && settlementReady && tradeRightTokenSelect.value !== "";

  mintBtn.disabled = !nftReady;
  viewBtn.disabled = !nftReady;
  tradePreviewBtn.disabled = !nftReady;
  tradeLoadLeftBtn.disabled = !nftReady;
  tradeLoadRightBtn.disabled = !nftReady;
  tradeLeftWalletSelect.disabled = !nftReady;
  tradeRightWalletSelect.disabled = !nftReady;
  tradeLeftTokenSelect.disabled = !nftReady;
  tradeRightTokenSelect.disabled = !nftReady;
  approveLeftBtn.disabled = !leftCanApprove;
  approveRightBtn.disabled = !rightCanApprove;
  tradeNotionalInput.disabled = !nftReady;
  executeTradeBtn.disabled = !(nftReady && settlementReady);
  predictionMarketSelect.disabled = !predictionReady;
  predictionOutcomeSelect.disabled = !predictionReady;
  predictionStakeInput.disabled = !predictionReady;
  mintPredictionBtn.disabled = !predictionReady;
  refreshPredictionBtn.disabled = !predictionReady;
  claimPredictionBtn.disabled = !predictionReady;
  predictionResolveOutcomeSelect.disabled = !predictionReady;
  resolvePredictionBtn.disabled = !predictionReady;

  connectedWalletOutput.textContent = nftReady ? "MetaMask" : "None";
  connectedAddressOutput.textContent = connectedAddress || "None";
  predictionContractOutput.textContent = predictionReady ? sepoliaConfig.prediction.address : "-";

  copyConnectedBtn.disabled = !nftReady;
}

function clearTradeSide(side) {
  const imageEl = side === "left" ? tradeLeftImage : tradeRightImage;
  const titleEl = side === "left" ? tradeLeftTitle : tradeRightTitle;
  imageEl.removeAttribute("src");
  titleEl.textContent = side === "left" ? "Select a wallet and NFT" : "Select a wallet and optional NFT";
}

function resetUiState(options = {}) {
  const {
    statusMessage = "UI reset complete. Connect MetaMask to continue.",
    ownershipMessage = "UI reset complete. Connect MetaMask and view a token to compare owner.",
  } = options;

  provider = undefined;
  signer = undefined;
  nftContract = undefined;
  settlementContract = undefined;
  predictionContract = undefined;
  connectedAddress = null;
  ownershipRegistry = new Map();

  ownerOutput.textContent = "-";
  metadataOutput.textContent = "-";
  nftImage.removeAttribute("src");
  clearTradeSide("left");
  clearTradeSide("right");
  myBalanceOutput.textContent = "-";
  myOwnedTokenIdsOutput.textContent = "-";
  lastMintTokenOutput.textContent = "-";
  lastMintTxOutput.textContent = "-";
  tokenIdInput.value = "0";
  tradeRoyaltyReceiverOutput.textContent = "-";
  tradeRoyaltyAmountOutput.textContent = "-";
  predictionContractOutput.textContent = "-";
  predictionQuestionOutput.textContent = "-";
  predictionStatusOutput.textContent = "-";
  predictionPoolOutput.textContent = "-";
  predictionYesBalanceOutput.textContent = "-";
  predictionNoBalanceOutput.textContent = "-";
  tradeLeftAddressOutput.textContent = "-";
  tradeRightAddressOutput.textContent = "-";
  tradeConsoleOutput.textContent = "Trade console ready.";

  setOwnershipStatus("unknown", ownershipMessage);
  setTokenSelectOptions(tradeLeftTokenSelect, []);
  setTokenSelectOptions(tradeRightTokenSelect, [], true);
  setWalletSelectOptions(tradeLeftWalletSelect, []);
  setWalletSelectOptions(tradeRightWalletSelect, []);

  updateConnectionUi();
  renderRecentMintedIds();
  renderMasterWalletView();
  setStatus(statusMessage);
}

async function refreshWalletStats() {
  if (!nftContract || !connectedAddress) {
    myBalanceOutput.textContent = "-";
    myOwnedTokenIdsOutput.textContent = "-";
    return;
  }

  const count = await nftContract.balanceOf(connectedAddress);
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
  if (!nftContract) {
    ownershipRegistry = new Map();
    renderMasterWalletView();
    return;
  }

  const totalMinted = Number(await nftContract.totalMinted());
  const registry = new Map();

  for (let tokenId = 0; tokenId < totalMinted; tokenId += 1) {
    try {
      const owner = await nftContract.ownerOf(tokenId);
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

function setWalletSelectOptions(selectEl, wallets, preferred) {
  const deduped = Array.from(new Set(wallets.filter(Boolean)));
  selectEl.innerHTML = "";

  if (deduped.length === 0) {
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "No wallets";
    selectEl.appendChild(opt);
    return;
  }

  deduped.forEach((wallet) => {
    const opt = document.createElement("option");
    opt.value = wallet;
    opt.textContent = wallet;
    selectEl.appendChild(opt);
  });

  const selected = preferred && deduped.includes(preferred) ? preferred : deduped[0];
  selectEl.value = selected;
}

function setTokenSelectOptions(selectEl, tokenIds, includeEmptyOption = false) {
  selectEl.innerHTML = "";

  if (includeEmptyOption) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "No NFT (ETH-only sale)";
    selectEl.appendChild(empty);
  }

  if (tokenIds.length === 0) {
    if (!includeEmptyOption) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No NFTs";
      selectEl.appendChild(opt);
    }
    updateConnectionUi();
    return;
  }

  tokenIds.forEach((id) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = `#${id}`;
    selectEl.appendChild(opt);
  });

  updateConnectionUi();
}

function parseNotionalWei() {
  const raw = (tradeNotionalInput.value || "0").trim();
  const normalized = raw === "" ? "0" : raw;
  if (Number(normalized) < 0) {
    throw new Error("ETH leg must be zero or greater.");
  }

  return ethers.parseEther(normalized);
}

function selectedPredictionMarketId() {
  return BigInt(predictionMarketSelect.value || "1");
}

function predictionOutcomeName(outcome) {
  return Number(outcome) === 1 ? "YES" : "NO";
}

function readMarketField(market, name, index) {
  return market?.[name] ?? market?.[index];
}

function configurePredictionMarketOptions() {
  if (!sepoliaConfig?.prediction?.markets) return;

  const ethOption = predictionMarketSelect.querySelector('option[value="1"]');
  const nbaOption = predictionMarketSelect.querySelector('option[value="2"]');
  if (ethOption) {
    ethOption.value = String(sepoliaConfig.prediction.markets.ethPrice);
  }
  if (nbaOption) {
    nbaOption.value = String(sepoliaConfig.prediction.markets.nbaGame);
  }
}

async function refreshPredictionView() {
  if (!predictionContract || !connectedAddress) {
    predictionQuestionOutput.textContent = "-";
    predictionStatusOutput.textContent = "-";
    predictionPoolOutput.textContent = "-";
    predictionYesBalanceOutput.textContent = "-";
    predictionNoBalanceOutput.textContent = "-";
    return;
  }

  const marketId = selectedPredictionMarketId();

  try {
    const market = await predictionContract.markets(marketId);
    const question = readMarketField(market, "question", 1);
    const totalPool = readMarketField(market, "totalPool", 5);
    const resolved = readMarketField(market, "resolved", 8);
    const winningOutcome = readMarketField(market, "winningOutcome", 9);
    const yesTokenId = await predictionContract.positionTokenId(marketId, 1);
    const noTokenId = await predictionContract.positionTokenId(marketId, 2);
    const [yesBalance, noBalance] = await Promise.all([
      predictionContract.balanceOf(connectedAddress, yesTokenId),
      predictionContract.balanceOf(connectedAddress, noTokenId),
    ]);

    predictionQuestionOutput.textContent = question || "-";
    predictionStatusOutput.textContent = resolved
      ? `Resolved: ${predictionOutcomeName(winningOutcome)} won`
      : "Open / unresolved";
    predictionPoolOutput.textContent = `${ethers.formatEther(totalPool)} Sepolia ETH`;
    predictionYesBalanceOutput.textContent = `${ethers.formatEther(yesBalance)} YES shares`;
    predictionNoBalanceOutput.textContent = `${ethers.formatEther(noBalance)} NO shares`;
  } catch (err) {
    appendPredictionConsole(`Refresh failed: ${extractErrorMessage(err)}`);
  }
}

async function mintPredictionPosition() {
  if (!predictionContract || !connectedAddress) {
    appendPredictionConsole("Connect MetaMask and ensure prediction contract is configured.");
    return;
  }

  const marketId = selectedPredictionMarketId();
  const outcome = Number(predictionOutcomeSelect.value);
  const stakeText = (predictionStakeInput.value || "0").trim();

  try {
    await assertSepoliaConnected();
    const stakeWei = ethers.parseEther(stakeText);
    if (stakeWei <= 0n) {
      throw new Error("Stake must be greater than zero.");
    }

    setLoader(true, "Minting ERC-1155 prediction position...");
    setButtonLoading(mintPredictionBtn, true, "Minting...");
    const tx = await predictionContract.mintPosition(marketId, outcome, { value: stakeWei });
    appendPredictionConsole(`Prediction mint submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    appendPredictionConsole(
      `Minted ${stakeText} ${predictionOutcomeName(outcome)} shares for market #${marketId}: ${receipt.hash}`
    );
    setStatus(`Prediction position minted.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);
    await refreshPredictionView();
  } catch (err) {
    const msg = extractErrorMessage(err);
    appendPredictionConsole(`Mint failed: ${msg}`);
    setStatus(`Prediction mint failed: ${msg}`);
  } finally {
    setLoader(false);
    setButtonLoading(mintPredictionBtn, false, "Minting...");
  }
}

async function claimPredictionWinnings() {
  if (!predictionContract || !connectedAddress) {
    appendPredictionConsole("Connect MetaMask and ensure prediction contract is configured.");
    return;
  }

  const marketId = selectedPredictionMarketId();

  try {
    await assertSepoliaConnected();
    setLoader(true, "Claiming prediction winnings...");
    setButtonLoading(claimPredictionBtn, true, "Claiming...");
    const tx = await predictionContract.claim(marketId);
    appendPredictionConsole(`Claim submitted: ${tx.hash}`);
    const receipt = await tx.wait();
    appendPredictionConsole(`Claim confirmed for market #${marketId}: ${receipt.hash}`);
    setStatus(`Prediction claim confirmed.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);
    await refreshPredictionView();
  } catch (err) {
    const msg = extractErrorMessage(err);
    appendPredictionConsole(`Claim failed: ${msg}`);
    setStatus(`Prediction claim failed: ${msg}`);
  } finally {
    setLoader(false);
    setButtonLoading(claimPredictionBtn, false, "Claiming...");
  }
}

async function resolvePredictionMarket() {
  if (!predictionContract || !connectedAddress) {
    appendPredictionConsole("Connect MetaMask and ensure prediction contract is configured.");
    return;
  }

  const marketId = selectedPredictionMarketId();
  const winningOutcome = Number(predictionResolveOutcomeSelect.value);

  try {
    await assertSepoliaConnected();
    setLoader(true, "Resolving prediction market...");
    setButtonLoading(resolvePredictionBtn, true, "Resolving...");
    const tx = await predictionContract.resolveMarket(marketId, winningOutcome);
    appendPredictionConsole(`Resolution submitted for market #${marketId}: ${tx.hash}`);
    const receipt = await tx.wait();
    appendPredictionConsole(
      `Market #${marketId} resolved to ${predictionOutcomeName(winningOutcome)}: ${receipt.hash}`
    );
    setStatus(`Prediction market resolved.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);
    await refreshPredictionView();
  } catch (err) {
    const msg = extractErrorMessage(err);
    appendPredictionConsole(`Resolve failed: ${msg}`);
    setStatus(`Prediction resolve failed: ${msg}`);
  } finally {
    setLoader(false);
    setButtonLoading(resolvePredictionBtn, false, "Resolving...");
  }
}

async function refreshTradeSidePreview(side) {
  if (!nftContract) return;

  const tokenSelect = side === "left" ? tradeLeftTokenSelect : tradeRightTokenSelect;
  const imageEl = side === "left" ? tradeLeftImage : tradeRightImage;
  const titleEl = side === "left" ? tradeLeftTitle : tradeRightTitle;

  const tokenId = tokenSelect.value;
  if (tokenId === "") {
    imageEl.removeAttribute("src");
    titleEl.textContent = side === "left" ? "Select a wallet and NFT" : "No right-side NFT selected (sale mode)";
    return;
  }

  try {
    const tokenUri = await nftContract.tokenURI(tokenId);
    const metadata = parseDataUriJson(tokenUri);

    imageEl.src = metadata.image || "";
    titleEl.textContent = metadata.name ? `${metadata.name} (Token #${tokenId})` : `Token #${tokenId}`;
  } catch (err) {
    imageEl.removeAttribute("src");
    titleEl.textContent = `Could not load token #${tokenId}`;
    appendTradeConsole(`${side === "left" ? "Left" : "Right"} preview failed: ${extractErrorMessage(err)}`);
  }
}

async function refreshTradePreview() {
  if (!nftContract) return;

  const leftTokenId = tradeLeftTokenSelect.value;
  const rightTokenId = tradeRightTokenSelect.value;
  if (leftTokenId === "") {
    tradeRoyaltyReceiverOutput.textContent = "-";
    tradeRoyaltyAmountOutput.textContent = "-";
    appendTradeConsole("Select a left-side NFT to preview royalty policy.");
    return;
  }

  try {
    const notionalWei = parseNotionalWei();

    if (notionalWei === 0n && rightTokenId !== "") {
      tradeRoyaltyReceiverOutput.textContent = "N/A (pure NFT swap)";
      tradeRoyaltyAmountOutput.textContent = "0 ETH";
      appendTradeConsole("Pure NFT↔NFT swap selected: no enforceable ERC-2981 payout base without ETH leg.");
      return;
    }

    if (notionalWei === 0n && rightTokenId === "") {
      tradeRoyaltyReceiverOutput.textContent = "-";
      tradeRoyaltyAmountOutput.textContent = "0 ETH";
      appendTradeConsole("ETH-only sale mode selected. Enter ETH leg > 0 for executable priced trade.");
      return;
    }

    const [receiver, amount] = await nftContract.royaltyInfo(leftTokenId, notionalWei);
    tradeRoyaltyReceiverOutput.textContent = receiver;
    tradeRoyaltyAmountOutput.textContent = `${ethers.formatEther(amount)} ETH`;

    if (rightTokenId === "") {
      appendTradeConsole(`Fixed-price sale preview: royalty ${ethers.formatEther(amount)} ETH to ${receiver}.`);
    } else {
      appendTradeConsole(`Swap+ETH leg preview: royalty ${ethers.formatEther(amount)} ETH to ${receiver} on left NFT sale leg.`);
    }
  } catch (err) {
    tradeRoyaltyReceiverOutput.textContent = "-";
    tradeRoyaltyAmountOutput.textContent = "-";
    appendTradeConsole(`Preview failed: ${extractErrorMessage(err)}`);
  }
}

async function refreshTradeWalletsAndTokens(refreshRegistry = true) {
  if (!nftContract || !connectedAddress) {
    setWalletSelectOptions(tradeLeftWalletSelect, []);
    setWalletSelectOptions(tradeRightWalletSelect, []);
    setTokenSelectOptions(tradeLeftTokenSelect, []);
    setTokenSelectOptions(tradeRightTokenSelect, [], true);
    tradeLeftAddressOutput.textContent = "-";
    tradeRightAddressOutput.textContent = "-";
    clearTradeSide("left");
    clearTradeSide("right");
    return;
  }

  if (refreshRegistry) {
    await refreshOwnershipRegistry();
  }

  const knownWallets = Array.from(new Set([connectedAddress, ...ownershipRegistry.keys()]));
  const currentLeft = tradeLeftWalletSelect.value;
  const currentRight = tradeRightWalletSelect.value;

  setWalletSelectOptions(tradeLeftWalletSelect, knownWallets, currentLeft || connectedAddress);
  setWalletSelectOptions(tradeRightWalletSelect, knownWallets, currentRight || connectedAddress);

  await loadTradeSide("left");
  await loadTradeSide("right");
  await refreshTradePreview();
}

async function loadTradeSide(side) {
  const walletSelect = side === "left" ? tradeLeftWalletSelect : tradeRightWalletSelect;
  const tokenSelect = side === "left" ? tradeLeftTokenSelect : tradeRightTokenSelect;
  const addressOutput = side === "left" ? tradeLeftAddressOutput : tradeRightAddressOutput;

  const wallet = walletSelect.value;
  addressOutput.textContent = wallet || "-";

  const ownedTokenIds = wallet ? (ownershipRegistry.get(wallet) || []) : [];
  setTokenSelectOptions(tokenSelect, ownedTokenIds, side === "right");

  await refreshTradeSidePreview(side);
}

async function assertSepoliaConnected() {
  if (!provider) {
    throw new Error("Connect MetaMask first.");
  }

  const network = await provider.getNetwork();
  if (Number(network.chainId) !== SEPOLIA_CHAIN_ID) {
    throw new Error(`Wrong network. Switch MetaMask to Sepolia (11155111), current chainId: ${Number(network.chainId)}.`);
  }
}

async function isSettlementApproved(owner, tokenId) {
  const approvedAddress = await nftContract.getApproved(tokenId);
  if (approvedAddress.toLowerCase() === settlementContract.target.toLowerCase()) {
    return true;
  }

  return nftContract.isApprovedForAll(owner, settlementContract.target);
}

async function approveSettlementForTradeSide(side) {
  if (!nftContract || !settlementContract || !connectedAddress) {
    appendTradeConsole("Connect MetaMask and ensure settlement contract is configured.");
    return;
  }

  const isLeft = side === "left";
  const walletSelect = isLeft ? tradeLeftWalletSelect : tradeRightWalletSelect;
  const tokenSelect = isLeft ? tradeLeftTokenSelect : tradeRightTokenSelect;
  const approveBtn = isLeft ? approveLeftBtn : approveRightBtn;
  const wallet = walletSelect.value;
  const tokenId = tokenSelect.value;

  if (!ethers.isAddress(wallet)) {
    appendTradeConsole(`Select a valid ${side} wallet first.`);
    return;
  }
  if (tokenId === "") {
    appendTradeConsole(`Select a ${side} NFT first.`);
    return;
  }
  if (connectedAddress.toLowerCase() !== wallet.toLowerCase()) {
    appendTradeConsole(`Connect MetaMask as the ${side} wallet before approving token #${tokenId}.`);
    return;
  }

  try {
    await assertSepoliaConnected();
    setLoader(true, `Approving settlement for ${side} token #${tokenId}...`);
    setButtonLoading(approveBtn, true, "Approving...");

    const owner = await nftContract.ownerOf(tokenId);
    if (owner.toLowerCase() !== connectedAddress.toLowerCase()) {
      throw new Error(`Connected wallet does not own ${side} token #${tokenId}.`);
    }

    if (await isSettlementApproved(wallet, tokenId)) {
      appendTradeConsole(`${side} token #${tokenId} is already approved for settlement.`);
      return;
    }

    const tx = await nftContract.setApprovalForAll(settlementContract.target, true);
    appendTradeConsole(`Approval submitted for all ${side} wallet NFTs: ${tx.hash}`);
    const receipt = await tx.wait();
    appendTradeConsole(`Approval confirmed for all ${side} wallet NFTs: ${receipt.hash}`);
    setStatus(`Settlement approval confirmed.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);
  } catch (err) {
    const msg = extractErrorMessage(err);
    appendTradeConsole(`Approval failed: ${msg}`);
    setStatus(`Approval failed: ${msg}`);
  } finally {
    setLoader(false);
    setButtonLoading(approveBtn, false, "Approving...");
  }
}

async function executeTrade() {
  if (!nftContract || !settlementContract || !connectedAddress) {
    appendTradeConsole("Connect MetaMask and ensure settlement contract is configured.");
    return;
  }

  const leftWallet = tradeLeftWalletSelect.value;
  const rightWallet = tradeRightWalletSelect.value;
  const leftTokenId = tradeLeftTokenSelect.value;
  const rightTokenId = tradeRightTokenSelect.value;

  if (!ethers.isAddress(leftWallet) || !ethers.isAddress(rightWallet)) {
    appendTradeConsole("Select valid left/right wallet addresses.");
    return;
  }

  if (leftTokenId === "") {
    appendTradeConsole("Select a left-side NFT.");
    return;
  }

  let notionalWei;
  try {
    notionalWei = parseNotionalWei();
  } catch (err) {
    appendTradeConsole(extractErrorMessage(err));
    return;
  }

  const hasRightToken = rightTokenId !== "";
  const normalizedConnected = connectedAddress.toLowerCase();

  try {
    await assertSepoliaConnected();

    setLoader(true, "Preparing settlement transaction...");
    setButtonLoading(executeTradeBtn, true, "Submitting...");

    const [leftOwnerOnChain, leftApproved] = await Promise.all([
      nftContract.ownerOf(leftTokenId),
      isSettlementApproved(leftWallet, leftTokenId),
    ]);

    if (leftOwnerOnChain.toLowerCase() !== leftWallet.toLowerCase()) {
      throw new Error("Stale ownership detected on left NFT. Reload wallets and try again.");
    }

    if (!leftApproved) {
      throw new Error(`No approval: left wallet must approve settlement (${settlementContract.target}) for token #${leftTokenId}.`);
    }

    let tx;

    if (!hasRightToken) {
      if (notionalWei === 0n) {
        throw new Error("Fixed-price sale requires ETH leg > 0.");
      }

      if (normalizedConnected !== rightWallet.toLowerCase()) {
        throw new Error("Connected MetaMask must match right wallet (buyer/payer) for fixed-price sale.");
      }

      tx = await settlementContract.executeFixedPriceSale(
        nftContract.target,
        leftTokenId,
        leftWallet,
        rightWallet,
        notionalWei,
        { value: notionalWei }
      );
      appendTradeConsole(`Fixed-price sale submitted: ${tx.hash}`);
    } else if (notionalWei === 0n) {
      const [rightOwnerOnChain, rightApproved] = await Promise.all([
        nftContract.ownerOf(rightTokenId),
        isSettlementApproved(rightWallet, rightTokenId),
      ]);

      if (rightOwnerOnChain.toLowerCase() !== rightWallet.toLowerCase()) {
        throw new Error("Stale ownership detected on right NFT. Reload wallets and try again.");
      }

      if (!rightApproved) {
        throw new Error(`No approval: right wallet must approve settlement (${settlementContract.target}) for token #${rightTokenId}.`);
      }

      if (normalizedConnected !== leftWallet.toLowerCase() && normalizedConnected !== rightWallet.toLowerCase()) {
        throw new Error("Connected MetaMask must be one of the swap counterparties.");
      }

      tx = await settlementContract.executePureSwap(
        nftContract.target,
        leftTokenId,
        leftWallet,
        rightTokenId,
        rightWallet
      );
      appendTradeConsole(`Pure swap submitted: ${tx.hash}`);
    } else {
      const [rightOwnerOnChain, rightApproved] = await Promise.all([
        nftContract.ownerOf(rightTokenId),
        isSettlementApproved(rightWallet, rightTokenId),
      ]);

      if (rightOwnerOnChain.toLowerCase() !== rightWallet.toLowerCase()) {
        throw new Error("Stale ownership detected on right NFT. Reload wallets and try again.");
      }

      if (!rightApproved) {
        throw new Error(`No approval: right wallet must approve settlement (${settlementContract.target}) for token #${rightTokenId}.`);
      }

      if (normalizedConnected !== rightWallet.toLowerCase()) {
        throw new Error("Connected MetaMask must match right wallet for swap+ETH settlement.");
      }

      tx = await settlementContract.executeSwapWithEthLeg(
        nftContract.target,
        leftTokenId,
        leftWallet,
        rightTokenId,
        rightWallet,
        notionalWei,
        { value: notionalWei }
      );
      appendTradeConsole(`Swap+ETH settlement submitted: ${tx.hash}`);
    }

    const receipt = await tx.wait();
    appendTradeConsole(`Settlement confirmed: ${receipt.hash}`);
    setStatus(`Trade settlement successful.\nTx: ${receipt.hash}\nExplorer: ${SEPOLIA_EXPLORER_TX}${receipt.hash}`);

    await refreshOwnershipRegistry();
    await refreshWalletStats();
    await refreshTradeWalletsAndTokens(false);
    renderRecentMintedIds();
  } catch (err) {
    const msg = extractErrorMessage(err);
    appendTradeConsole(`Execution failed: ${msg}`);
    setStatus(`Trade failed: ${msg}`);
  } finally {
    setLoader(false);
    setButtonLoading(executeTradeBtn, false, "Submitting...");
  }
}

function pushWalletMintHistory(wallet, tokenId) {
  const existing = walletMintHistory.get(wallet) || [];
  const next = [tokenId, ...existing.filter((id) => id !== tokenId)].slice(0, 8);
  walletMintHistory.set(wallet, next);
}

async function connectMetaMask() {
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

    if (Number(sepoliaConfig.chainId) !== SEPOLIA_CHAIN_ID) {
      throw new Error(`sepolia-config.json has wrong chainId: ${sepoliaConfig.chainId}.`);
    }

    if (!ethers.isAddress(sepoliaConfig.nft.address) || sepoliaConfig.nft.address === ZERO_ADDRESS) {
      throw new Error("Bad NFT contract address in sepolia-config.json.");
    }

    if (!Array.isArray(sepoliaConfig.nft.abi) || sepoliaConfig.nft.abi.length === 0) {
      throw new Error("NFT ABI missing in config. Re-run deployment to regenerate frontend config.");
    }

    const nftCode = await provider.getCode(sepoliaConfig.nft.address);
    if (nftCode === "0x") {
      throw new Error("No NFT contract deployed at configured address. Re-run deploy and update frontend config.");
    }

    signer = await provider.getSigner();
    connectedAddress = await signer.getAddress();
    nftContract = new ethers.Contract(sepoliaConfig.nft.address, sepoliaConfig.nft.abi, signer);

    settlementContract = undefined;
    if (
      ethers.isAddress(sepoliaConfig.settlement.address) &&
      sepoliaConfig.settlement.address !== ZERO_ADDRESS &&
      Array.isArray(sepoliaConfig.settlement.abi) &&
      sepoliaConfig.settlement.abi.length > 0
    ) {
      const settlementCode = await provider.getCode(sepoliaConfig.settlement.address);
      if (settlementCode === "0x") {
        appendTradeConsole("Configured settlement address has no code on Sepolia. Trade execution disabled until deploy.");
      } else {
        settlementContract = new ethers.Contract(sepoliaConfig.settlement.address, sepoliaConfig.settlement.abi, signer);
      }
    } else {
      appendTradeConsole("Settlement contract config missing. Deploy TradeSettlement and update sepolia-config.json.");
    }

    predictionContract = undefined;
    if (
      ethers.isAddress(sepoliaConfig.prediction.address) &&
      sepoliaConfig.prediction.address !== ZERO_ADDRESS &&
      Array.isArray(sepoliaConfig.prediction.abi) &&
      sepoliaConfig.prediction.abi.length > 0
    ) {
      const predictionCode = await provider.getCode(sepoliaConfig.prediction.address);
      if (predictionCode === "0x") {
        appendPredictionConsole("Configured prediction address has no code on Sepolia. Prediction minting disabled until deploy.");
      } else {
        predictionContract = new ethers.Contract(sepoliaConfig.prediction.address, sepoliaConfig.prediction.abi, signer);
      }
    } else {
      appendPredictionConsole("Prediction contract config missing. Re-run deployment to add ERC-1155 markets.");
    }

    updateConnectionUi();
    await refreshOwnershipRegistry();
    await refreshWalletStats();
    await refreshTradeWalletsAndTokens(false);
    await refreshPredictionView();
    renderRecentMintedIds();

    setOwnershipStatus(
      "unknown",
      "ERC-721 token IDs are global. Anyone can view metadata; ownership is compared against your MetaMask account."
    );

    const settlementLine = settlementContract
      ? `Settlement: ${sepoliaConfig.settlement.address}`
      : "Settlement: not ready (trade execution disabled)";
    const predictionLine = predictionContract
      ? `Prediction: ${sepoliaConfig.prediction.address}`
      : "Prediction: not ready (ERC-1155 betting disabled)";

    setStatus(
      `MetaMask connected on Sepolia.\n` +
      `Wallet: ${connectedAddress}\n` +
      `NFT Contract: ${sepoliaConfig.nft.address}\n` +
      `${settlementLine}\n` +
      `${predictionLine}`
    );
  } catch (err) {
    setStatus(`MetaMask connect failed: ${extractErrorMessage(err)}`);
  } finally {
    setLoader(false);
    setButtonLoading(connectBtn, false, "Connecting...");
  }
}

async function mintNft() {
  if (!nftContract) {
    setStatus("Connect MetaMask first.");
    return;
  }

  try {
    setLoader(true, "Waiting for MetaMask mint approval...");
    setButtonLoading(mintBtn, true, "Minting...");
    setStatus("Approve the mint transaction in MetaMask. Sepolia test ETH pays the gas fee.");

    const tx = await nftContract.mint();
    const receipt = await tx.wait();

    const transferLog = receipt.logs
      .map((log) => {
        try {
          return nftContract.interface.parseLog(log);
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
      await refreshTradeWalletsAndTokens(false);
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
    setStatus(`Mint failed: ${extractErrorMessage(err)}`);
  } finally {
    setLoader(false);
    setButtonLoading(mintBtn, false, "Minting...");
  }
}

async function viewToken() {
  if (!nftContract) {
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
      nftContract.ownerOf(tokenId),
      nftContract.tokenURI(tokenId),
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
    setStatus(`View failed: ${extractErrorMessage(err)}`);
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
    sepoliaConfig = await loadSepoliaConfig();
    configurePredictionMarketOptions();

    setStatus(
      `Sepolia config loaded.\n` +
      `NFT: ${sepoliaConfig.nft.address}\n` +
      `Settlement: ${sepoliaConfig.settlement.address}\n` +
      `Prediction: ${sepoliaConfig.prediction.address}\n` +
      `Click Connect MetaMask.`
    );

    setOwnershipStatus(
      "unknown",
      "ERC-721 token IDs are global. Connect MetaMask, then view a token to compare ownership."
    );

    updateConnectionUi();
    renderMasterWalletView();
    renderRecentMintedIds();
  } catch (err) {
    setStatus(`Initialization failed: ${extractErrorMessage(err)}`);
    updateConnectionUi();
  }
}

function bindEvents() {
  mintViewTabBtn.addEventListener("click", () => setActiveMode("mint-view"));
  tradeTabBtn.addEventListener("click", () => setActiveMode("trade"));
  predictionTabBtn.addEventListener("click", () => setActiveMode("prediction"));
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
    refreshTradeWalletsAndTokens(true).catch((err) => appendTradeConsole(`Left reload failed: ${extractErrorMessage(err)}`));
  });
  tradeLoadRightBtn.addEventListener("click", () => {
    refreshTradeWalletsAndTokens(true).catch((err) => appendTradeConsole(`Right reload failed: ${extractErrorMessage(err)}`));
  });

  tradeLeftWalletSelect.addEventListener("change", () => {
    loadTradeSide("left").then(refreshTradePreview).catch((err) => appendTradeConsole(`Left wallet load failed: ${extractErrorMessage(err)}`));
  });
  tradeRightWalletSelect.addEventListener("change", () => {
    loadTradeSide("right").then(refreshTradePreview).catch((err) => appendTradeConsole(`Right wallet load failed: ${extractErrorMessage(err)}`));
  });

  tradeLeftTokenSelect.addEventListener("change", () => {
    refreshTradeSidePreview("left").then(refreshTradePreview).catch((err) => appendTradeConsole(`Left token preview failed: ${extractErrorMessage(err)}`));
  });
  tradeRightTokenSelect.addEventListener("change", () => {
    refreshTradeSidePreview("right").then(refreshTradePreview).catch((err) => appendTradeConsole(`Right token preview failed: ${extractErrorMessage(err)}`));
  });

  tradeNotionalInput.addEventListener("change", () => {
    refreshTradePreview().catch((err) => appendTradeConsole(`Preview failed: ${extractErrorMessage(err)}`));
  });
  tradePreviewBtn.addEventListener("click", () => {
    refreshTradePreview().catch((err) => appendTradeConsole(`Preview failed: ${extractErrorMessage(err)}`));
  });
  approveLeftBtn.addEventListener("click", () => approveSettlementForTradeSide("left"));
  approveRightBtn.addEventListener("click", () => approveSettlementForTradeSide("right"));
  executeTradeBtn.addEventListener("click", executeTrade);

  predictionMarketSelect.addEventListener("change", () => {
    refreshPredictionView().catch((err) => appendPredictionConsole(`Refresh failed: ${extractErrorMessage(err)}`));
  });
  mintPredictionBtn.addEventListener("click", mintPredictionPosition);
  refreshPredictionBtn.addEventListener("click", () => {
    refreshPredictionView().catch((err) => appendPredictionConsole(`Refresh failed: ${extractErrorMessage(err)}`));
  });
  claimPredictionBtn.addEventListener("click", claimPredictionWinnings);
  resolvePredictionBtn.addEventListener("click", resolvePredictionMarket);

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
  setStatus(`Startup error: ${extractErrorMessage(err)}`);
}
