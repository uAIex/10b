const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CS521OnChainNFT", function () {
  async function deployNft() {
    const Factory = await ethers.getContractFactory("CS521OnChainNFT");
    const nft = await Factory.deploy();
    await nft.waitForDeployment();
    return nft;
  }

  it("mints token 0 and returns on-chain metadata", async function () {
    const [user] = await ethers.getSigners();
    const nft = await deployNft();

    await expect(nft.mint()).to.emit(nft, "Transfer").withArgs(ethers.ZeroAddress, user.address, 0n);

    expect(await nft.ownerOf(0n)).to.equal(user.address);
    expect(await nft.totalMinted()).to.equal(1n);
    expect(await nft.nextTokenId()).to.equal(1n);

    const tokenUri = await nft.tokenURI(0n);
    const prefix = "data:application/json;base64,";
    expect(tokenUri.startsWith(prefix)).to.equal(true);

    const metadataJson = Buffer.from(tokenUri.slice(prefix.length), "base64").toString("utf8");
    const metadata = JSON.parse(metadataJson);

    expect(metadata.name).to.equal("NBA Legends #0 - LeBron James");
    expect(metadata.description).to.equal("NBA stars NFT demo for CS 521 with on-chain metadata and active-era jersey photos.");
    expect(metadata.image.startsWith("https://")).to.equal(true);
  });

  it("mints sequential token IDs across multiple wallets", async function () {
    const [wallet1, wallet2, wallet3] = await ethers.getSigners();
    const nft = await deployNft();

    await expect(nft.connect(wallet1).mint())
      .to.emit(nft, "Transfer")
      .withArgs(ethers.ZeroAddress, wallet1.address, 0n);

    await expect(nft.connect(wallet2).mint())
      .to.emit(nft, "Transfer")
      .withArgs(ethers.ZeroAddress, wallet2.address, 1n);

    await expect(nft.connect(wallet3).mint())
      .to.emit(nft, "Transfer")
      .withArgs(ethers.ZeroAddress, wallet3.address, 2n);

    expect(await nft.ownerOf(0n)).to.equal(wallet1.address);
    expect(await nft.ownerOf(1n)).to.equal(wallet2.address);
    expect(await nft.ownerOf(2n)).to.equal(wallet3.address);
    expect(await nft.balanceOf(wallet1.address)).to.equal(1n);
    expect(await nft.balanceOf(wallet2.address)).to.equal(1n);
    expect(await nft.balanceOf(wallet3.address)).to.equal(1n);
    expect(await nft.totalMinted()).to.equal(3n);
    expect(await nft.nextTokenId()).to.equal(3n);
  });

  it("tracks repeated mints for the same wallet", async function () {
    const [user] = await ethers.getSigners();
    const nft = await deployNft();

    await nft.connect(user).mint();
    await nft.connect(user).mint();

    expect(await nft.ownerOf(0n)).to.equal(user.address);
    expect(await nft.ownerOf(1n)).to.equal(user.address);
    expect(await nft.balanceOf(user.address)).to.equal(2n);
    expect(await nft.totalMinted()).to.equal(2n);
    expect(await nft.nextTokenId()).to.equal(2n);
  });

  it("rotates metadata content based on token ID", async function () {
    const [user] = await ethers.getSigners();
    const nft = await deployNft();

    for (let i = 0; i < 10; i += 1) {
      await nft.connect(user).mint();
    }

    const prefix = "data:application/json;base64,";
    const token0Uri = await nft.tokenURI(0n);
    const token1Uri = await nft.tokenURI(1n);
    const token9Uri = await nft.tokenURI(9n);

    const token0 = JSON.parse(Buffer.from(token0Uri.slice(prefix.length), "base64").toString("utf8"));
    const token1 = JSON.parse(Buffer.from(token1Uri.slice(prefix.length), "base64").toString("utf8"));
    const token9 = JSON.parse(Buffer.from(token9Uri.slice(prefix.length), "base64").toString("utf8"));

    expect(token0.name).to.equal("NBA Legends #0 - LeBron James");
    expect(token1.name).to.equal("NBA Legends #1 - Stephen Curry");
    expect(token9.name).to.equal("NBA Legends #9 - Jimmy Butler");
    expect(token0.image).to.not.equal(token1.image);
    expect(token1.image).to.not.equal(token9.image);
    expect(token9.image.startsWith("https://")).to.equal(true);
  });

  it("reverts for non-existent token URI", async function () {
    const nft = await deployNft();

    await expect(nft.tokenURI(999n)).to.be.revertedWith("Token does not exist");
  });

  it("exposes ERC-2981 royalty info", async function () {
    const [deployer] = await ethers.getSigners();
    const nft = await deployNft();

    const salePrice = ethers.parseEther("1");
    const [receiver, royaltyAmount] = await nft.royaltyInfo(0n, salePrice);

    expect(receiver).to.equal(deployer.address);
    expect(royaltyAmount).to.equal(ethers.parseEther("0.05"));
  });
});
