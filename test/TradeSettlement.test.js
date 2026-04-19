const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("TradeSettlement", function () {
  async function deployFixture() {
    const [deployer, seller, buyer, royaltyReceiver, other] = await ethers.getSigners();

    const NftFactory = await ethers.getContractFactory("CS521OnChainNFT");
    const nft = await NftFactory.connect(deployer).deploy();
    await nft.waitForDeployment();

    const SettlementFactory = await ethers.getContractFactory("TradeSettlement");
    const settlement = await SettlementFactory.deploy();
    await settlement.waitForDeployment();

    return { deployer, seller, buyer, royaltyReceiver, other, nft, settlement };
  }

  async function balanceDelta(address, action) {
    const before = await ethers.provider.getBalance(address);
    const tx = await action();
    await tx.wait();
    const after = await ethers.provider.getBalance(address);
    return after - before;
  }

  it("pays ERC-2981 royalty correctly on fixed-price trade", async function () {
    const { deployer, seller, buyer, royaltyReceiver, nft, settlement } = await deployFixture();

    await nft.connect(seller).mint();
    await nft.connect(deployer).setDefaultRoyalty(royaltyReceiver.address, 1000); // 10%
    await nft.connect(seller).approve(await settlement.getAddress(), 0n);

    const price = ethers.parseEther("1");
    const royaltyDelta = await balanceDelta(royaltyReceiver.address, async () =>
      settlement.connect(buyer).executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        buyer.address,
        price,
        { value: price }
      )
    );

    expect(royaltyDelta).to.equal(ethers.parseEther("0.1"));
    expect(await nft.ownerOf(0n)).to.equal(buyer.address);
  });

  it("pays seller net proceeds after royalty", async function () {
    const { deployer, seller, buyer, royaltyReceiver, nft, settlement } = await deployFixture();

    await nft.connect(seller).mint();
    await nft.connect(deployer).setDefaultRoyalty(royaltyReceiver.address, 1000); // 10%
    await nft.connect(seller).approve(await settlement.getAddress(), 0n);

    const price = ethers.parseEther("1");
    const sellerDelta = await balanceDelta(seller.address, async () =>
      settlement.connect(buyer).executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        buyer.address,
        price,
        { value: price }
      )
    );

    expect(sellerDelta).to.equal(ethers.parseEther("0.9"));
  });

  it("reverts on underpayment", async function () {
    const { seller, buyer, nft, settlement } = await deployFixture();

    await nft.connect(seller).mint();
    await nft.connect(seller).approve(await settlement.getAddress(), 0n);

    const price = ethers.parseEther("1");
    await expect(
      settlement.connect(buyer).executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        buyer.address,
        price,
        { value: ethers.parseEther("0.8") }
      )
    ).to.be.revertedWith("Incorrect ETH value sent");
  });

  it("reverts on approval and stale ownership failures", async function () {
    const { seller, buyer, other, nft, settlement } = await deployFixture();

    await nft.connect(seller).mint();

    await expect(
      settlement.connect(buyer).executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        buyer.address,
        ethers.parseEther("1"),
        { value: ethers.parseEther("1") }
      )
    ).to.be.revertedWith("Settlement contract is not approved for token");

    await nft.connect(seller).approve(await settlement.getAddress(), 0n);
    await nft.connect(seller).transferFrom(seller.address, other.address, 0n);

    await expect(
      settlement.connect(buyer).executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        buyer.address,
        ethers.parseEther("1"),
        { value: ethers.parseEther("1") }
      )
    ).to.be.revertedWith("Seller no longer owns token");
  });

  it("keeps settlement atomic if NFT transfer reverts", async function () {
    const { deployer, seller, royaltyReceiver, nft, settlement } = await deployFixture();

    const RevertingReceiverFactory = await ethers.getContractFactory("RevertingNftReceiver");
    const revertingReceiver = await RevertingReceiverFactory.deploy();
    await revertingReceiver.waitForDeployment();

    await nft.connect(seller).mint();
    await nft.connect(deployer).setDefaultRoyalty(royaltyReceiver.address, 1000);
    await nft.connect(seller).approve(await settlement.getAddress(), 0n);

    const price = ethers.parseEther("1");
    const sellerBalanceBefore = await ethers.provider.getBalance(seller.address);
    const royaltyBalanceBefore = await ethers.provider.getBalance(royaltyReceiver.address);

    await expect(
      settlement.executeFixedPriceSale(
        await nft.getAddress(),
        0n,
        seller.address,
        await revertingReceiver.getAddress(),
        price,
        { value: price }
      )
    ).to.be.reverted;

    const sellerBalanceAfter = await ethers.provider.getBalance(seller.address);
    const royaltyBalanceAfter = await ethers.provider.getBalance(royaltyReceiver.address);

    expect(await nft.ownerOf(0n)).to.equal(seller.address);
    expect(sellerBalanceAfter - sellerBalanceBefore).to.equal(0n);
    expect(royaltyBalanceAfter - royaltyBalanceBefore).to.equal(0n);
  });
});
