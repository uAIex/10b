// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract CS521OnChainNFT is ERC721 {
    using Strings for uint256;

    uint256 private _nextTokenId;

    constructor() ERC721("CS521 NBA Stars NFT", "NBA521") {}

    function mint() external returns (uint256 tokenId) {
        tokenId = _nextTokenId;
        _nextTokenId += 1;
        _safeMint(msg.sender, tokenId);
    }

    function nextTokenId() external view returns (uint256) {
        return _nextTokenId;
    }

    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(
        uint256 tokenId
    ) public view override returns (string memory) {
        require(_exists(tokenId), "Token does not exist");

        string memory player = _playerName(tokenId);
        string memory image = _playerImageUrl(tokenId);
        string memory name = string.concat(
            "NBA Legends #",
            tokenId.toString(),
            " - ",
            player
        );
        string
            memory description = "NBA stars NFT demo for CS 521 with on-chain metadata and active-era jersey photos.";

        string memory metadata = string.concat(
            '{"name":"',
            name,
            '","description":"',
            description,
            '","image":"',
            image,
            '"}'
        );

        return
            string.concat(
                "data:application/json;base64,",
                Base64.encode(bytes(metadata))
            );
    }

    function _playerName(
        uint256 tokenId
    ) internal pure returns (string memory) {
        uint256 index = tokenId % 10;

        if (index == 0) return "LeBron James";
        if (index == 1) return "Stephen Curry";
        if (index == 2) return "Kevin Durant";
        if (index == 3) return "Giannis Antetokounmpo";
        if (index == 4) return "Nikola Jokic";
        if (index == 5) return "Luka Doncic";
        if (index == 6) return "Jayson Tatum";
        if (index == 7) return "Joel Embiid";
        if (index == 8) return "Kawhi Leonard";
        return "Jimmy Butler";
    }

    function _playerImageUrl(
        uint256 tokenId
    ) internal pure returns (string memory) {
        uint256 index = tokenId % 10;

        if (index == 0)
            return "https://cdn.nba.com/headshots/nba/latest/1040x760/2544.png";
        if (index == 1)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/201939.png";
        if (index == 2)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/201142.png";
        if (index == 3)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/203507.png";
        if (index == 4)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/203999.png";
        if (index == 5)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/1629029.png";
        if (index == 6)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/1628369.png";
        if (index == 7)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/203954.png";
        if (index == 8)
            return
                "https://cdn.nba.com/headshots/nba/latest/1040x760/202695.png";
        return "https://cdn.nba.com/headshots/nba/latest/1040x760/202710.png";
    }
}
