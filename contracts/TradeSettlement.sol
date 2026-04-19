// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract TradeSettlement is ReentrancyGuard {
    event FixedPriceSaleSettled(
        address indexed nft,
        uint256 indexed tokenId,
        address indexed seller,
        address buyer,
        uint256 salePrice,
        address royaltyReceiver,
        uint256 royaltyAmount,
        uint256 sellerProceeds
    );

    event PureSwapSettled(
        address indexed nft,
        uint256 indexed leftTokenId,
        address indexed leftOwner,
        uint256 rightTokenId,
        address rightOwner
    );

    event SwapWithEthLegSettled(
        address indexed nft,
        uint256 indexed leftTokenId,
        address indexed leftOwner,
        uint256 rightTokenId,
        address rightOwner,
        uint256 ethLegAmount,
        address royaltyReceiver,
        uint256 royaltyAmount,
        uint256 sellerProceeds
    );

    function executeFixedPriceSale(
        address nft,
        uint256 tokenId,
        address seller,
        address buyer,
        uint256 salePrice
    ) external payable nonReentrant {
        require(salePrice > 0, "Sale price must be > 0");
        require(msg.value == salePrice, "Incorrect ETH value sent");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(tokenId) == seller, "Seller no longer owns token");
        _requireApproved(token, tokenId, seller);

        (address royaltyReceiver, uint256 royaltyAmount) = _royaltyInfo(nft, tokenId, salePrice);
        require(royaltyAmount <= salePrice, "Royalty exceeds sale amount");

        token.safeTransferFrom(seller, buyer, tokenId);

        uint256 sellerProceeds = salePrice - royaltyAmount;
        if (royaltyAmount > 0) {
            _payout(royaltyReceiver, royaltyAmount);
        }
        _payout(seller, sellerProceeds);

        emit FixedPriceSaleSettled(
            nft,
            tokenId,
            seller,
            buyer,
            salePrice,
            royaltyReceiver,
            royaltyAmount,
            sellerProceeds
        );
    }

    function executePureSwap(
        address nft,
        uint256 leftTokenId,
        address leftOwner,
        uint256 rightTokenId,
        address rightOwner
    ) external nonReentrant {
        require(msg.sender == leftOwner || msg.sender == rightOwner, "Caller must be trade party");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(leftTokenId) == leftOwner, "Left owner mismatch");
        require(token.ownerOf(rightTokenId) == rightOwner, "Right owner mismatch");
        _requireApproved(token, leftTokenId, leftOwner);
        _requireApproved(token, rightTokenId, rightOwner);

        token.safeTransferFrom(leftOwner, rightOwner, leftTokenId);
        token.safeTransferFrom(rightOwner, leftOwner, rightTokenId);

        emit PureSwapSettled(nft, leftTokenId, leftOwner, rightTokenId, rightOwner);
    }

    function executeSwapWithEthLeg(
        address nft,
        uint256 leftTokenId,
        address leftOwner,
        uint256 rightTokenId,
        address rightOwner,
        uint256 ethLegAmount
    ) external payable nonReentrant {
        require(ethLegAmount > 0, "ETH leg must be > 0");
        require(msg.value == ethLegAmount, "Incorrect ETH value sent");
        require(msg.sender == rightOwner, "Caller must be right owner");

        IERC721 token = IERC721(nft);
        require(token.ownerOf(leftTokenId) == leftOwner, "Left owner mismatch");
        require(token.ownerOf(rightTokenId) == rightOwner, "Right owner mismatch");
        _requireApproved(token, leftTokenId, leftOwner);
        _requireApproved(token, rightTokenId, rightOwner);

        (address royaltyReceiver, uint256 royaltyAmount) = _royaltyInfo(nft, leftTokenId, ethLegAmount);
        require(royaltyAmount <= ethLegAmount, "Royalty exceeds ETH leg");

        token.safeTransferFrom(leftOwner, rightOwner, leftTokenId);
        token.safeTransferFrom(rightOwner, leftOwner, rightTokenId);

        uint256 sellerProceeds = ethLegAmount - royaltyAmount;
        if (royaltyAmount > 0) {
            _payout(royaltyReceiver, royaltyAmount);
        }
        _payout(leftOwner, sellerProceeds);

        emit SwapWithEthLegSettled(
            nft,
            leftTokenId,
            leftOwner,
            rightTokenId,
            rightOwner,
            ethLegAmount,
            royaltyReceiver,
            royaltyAmount,
            sellerProceeds
        );
    }

    function _royaltyInfo(
        address nft,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 amount) {
        require(
            IERC165(nft).supportsInterface(type(IERC2981).interfaceId),
            "NFT does not support ERC2981"
        );

        (receiver, amount) = IERC2981(nft).royaltyInfo(tokenId, salePrice);
    }

    function _requireApproved(
        IERC721 token,
        uint256 tokenId,
        address owner
    ) internal view {
        bool approved = token.getApproved(tokenId) == address(this) || token.isApprovedForAll(owner, address(this));
        require(approved, "Settlement contract is not approved for token");
    }

    function _payout(address recipient, uint256 amount) internal {
        if (amount == 0) {
            return;
        }

        (bool ok, ) = payable(recipient).call{value: amount}("");
        require(ok, "ETH payout failed");
    }
}
