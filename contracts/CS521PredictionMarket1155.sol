// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CS521PredictionMarket1155 is ERC1155, Ownable, ReentrancyGuard {
    using Strings for uint256;

    enum MarketKind {
        EthPrice,
        NbaGame
    }

    struct Market {
        MarketKind kind;
        string question;
        string details;
        uint256 targetPriceUsdCents;
        uint256 closeTime;
        uint256 totalPool;
        uint256 yesStake;
        uint256 noStake;
        bool resolved;
        uint8 winningOutcome;
    }

    uint8 public constant YES = 1;
    uint8 public constant NO = 2;

    uint256 private _nextMarketId = 1;

    mapping(uint256 => Market) public markets;

    event MarketCreated(
        uint256 indexed marketId,
        MarketKind kind,
        string question,
        uint256 targetPriceUsdCents,
        uint256 closeTime
    );
    event PositionMinted(
        uint256 indexed marketId,
        address indexed user,
        uint8 indexed outcome,
        uint256 stakeWei
    );
    event MarketResolved(uint256 indexed marketId, uint8 indexed winningOutcome);
    event Claimed(
        uint256 indexed marketId,
        address indexed user,
        uint256 burnedWinningShares,
        uint256 payoutWei
    );

    constructor() ERC1155("") {}

    function createMarket(
        MarketKind kind,
        string calldata question,
        string calldata details,
        uint256 targetPriceUsdCents,
        uint256 closeTime
    ) external onlyOwner returns (uint256 marketId) {
        require(bytes(question).length > 0, "Question required");
        require(closeTime > block.timestamp, "Close time must be future");
        if (kind == MarketKind.EthPrice) {
            require(targetPriceUsdCents > 0, "ETH target required");
        }

        marketId = _nextMarketId;
        _nextMarketId += 1;

        markets[marketId] = Market({
            kind: kind,
            question: question,
            details: details,
            targetPriceUsdCents: targetPriceUsdCents,
            closeTime: closeTime,
            totalPool: 0,
            yesStake: 0,
            noStake: 0,
            resolved: false,
            winningOutcome: 0
        });

        emit MarketCreated(
            marketId,
            kind,
            question,
            targetPriceUsdCents,
            closeTime
        );
    }

    function mintPosition(
        uint256 marketId,
        uint8 outcome
    ) external payable nonReentrant {
        Market storage market = markets[marketId];
        require(_marketExists(marketId), "Market does not exist");
        require(!market.resolved, "Market resolved");
        require(block.timestamp < market.closeTime, "Market closed");
        require(outcome == YES || outcome == NO, "Bad outcome");
        require(msg.value > 0, "Stake required");

        uint256 tokenId = positionTokenId(marketId, outcome);
        market.totalPool += msg.value;
        if (outcome == YES) {
            market.yesStake += msg.value;
        } else {
            market.noStake += msg.value;
        }

        _mint(msg.sender, tokenId, msg.value, "");
        emit PositionMinted(marketId, msg.sender, outcome, msg.value);
    }

    function resolveMarket(
        uint256 marketId,
        uint8 winningOutcome
    ) external onlyOwner {
        Market storage market = markets[marketId];
        require(_marketExists(marketId), "Market does not exist");
        require(!market.resolved, "Already resolved");
        require(winningOutcome == YES || winningOutcome == NO, "Bad outcome");

        market.resolved = true;
        market.winningOutcome = winningOutcome;
        emit MarketResolved(marketId, winningOutcome);
    }

    function claim(uint256 marketId) external nonReentrant {
        Market storage market = markets[marketId];
        require(_marketExists(marketId), "Market does not exist");
        require(market.resolved, "Not resolved");

        uint256 winningTokenId = positionTokenId(
            marketId,
            market.winningOutcome
        );
        uint256 winningShares = balanceOf(msg.sender, winningTokenId);
        require(winningShares > 0, "No winning shares");

        uint256 totalWinningStake = market.winningOutcome == YES
            ? market.yesStake
            : market.noStake;
        require(totalWinningStake > 0, "No winning pool");

        uint256 payout = (market.totalPool * winningShares) /
            totalWinningStake;
        _burn(msg.sender, winningTokenId, winningShares);

        (bool ok, ) = payable(msg.sender).call{value: payout}("");
        require(ok, "Payout failed");

        emit Claimed(marketId, msg.sender, winningShares, payout);
    }

    function positionTokenId(
        uint256 marketId,
        uint8 outcome
    ) public pure returns (uint256) {
        require(outcome == YES || outcome == NO, "Bad outcome");
        return marketId * 10 + outcome;
    }

    function nextMarketId() external view returns (uint256) {
        return _nextMarketId;
    }

    function uri(
        uint256 tokenId
    ) public view override returns (string memory) {
        uint256 marketId = tokenId / 10;
        uint8 outcome = uint8(tokenId % 10);
        require(_marketExists(marketId), "Market does not exist");
        require(outcome == YES || outcome == NO, "Bad outcome");

        Market storage market = markets[marketId];
        string memory outcomeName = outcome == YES ? "YES" : "NO";
        string memory kind = market.kind == MarketKind.EthPrice
            ? "ETH Price"
            : "NBA Game";
        string memory description = string.concat(
            kind,
            " prediction position. Outcome: ",
            outcomeName,
            ". ",
            market.details
        );

        string memory metadata = string.concat(
            '{"name":"CS521 Prediction Market #',
            marketId.toString(),
            " - ",
            outcomeName,
            '","description":"',
            description,
            '","attributes":[',
            '{"trait_type":"Question","value":"',
            market.question,
            '"},',
            '{"trait_type":"Outcome","value":"',
            outcomeName,
            '"},',
            '{"trait_type":"Market Type","value":"',
            kind,
            '"}',
            "]}"
        );

        return
            string.concat(
                "data:application/json;base64,",
                Base64.encode(bytes(metadata))
            );
    }

    function _marketExists(uint256 marketId) internal view returns (bool) {
        return bytes(markets[marketId].question).length > 0;
    }
}
