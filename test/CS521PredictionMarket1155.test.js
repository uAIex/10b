const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CS521PredictionMarket1155", function () {
  async function deployFixture() {
    const [owner, yesUser, noUser, other] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("CS521PredictionMarket1155");
    const market = await Factory.deploy();
    await market.waitForDeployment();

    const now = (await ethers.provider.getBlock("latest")).timestamp;
    const closeTime = BigInt(now + 3600);

    const tx = await market.createMarket(
      0,
      "Will ETH be above $3,000 at close?",
      "Demo ETH price market resolved by class demo authority.",
      300000,
      closeTime
    );
    await tx.wait();

    return { owner, yesUser, noUser, other, market, closeTime };
  }

  it("mints ERC-1155 YES and NO prediction positions with ETH stake balances", async function () {
    const { yesUser, noUser, market } = await deployFixture();

    const yesStake = ethers.parseEther("0.02");
    const noStake = ethers.parseEther("0.01");
    await market.connect(yesUser).mintPosition(1n, 1, { value: yesStake });
    await market.connect(noUser).mintPosition(1n, 2, { value: noStake });

    const yesTokenId = await market.positionTokenId(1n, 1);
    const noTokenId = await market.positionTokenId(1n, 2);

    expect(await market.balanceOf(yesUser.address, yesTokenId)).to.equal(yesStake);
    expect(await market.balanceOf(noUser.address, noTokenId)).to.equal(noStake);

    const info = await market.markets(1n);
    expect(info.totalPool).to.equal(yesStake + noStake);
    expect(info.yesStake).to.equal(yesStake);
    expect(info.noStake).to.equal(noStake);
  });

  it("only owner can resolve and winners can claim proportional payout", async function () {
    const { owner, yesUser, noUser, market } = await deployFixture();

    await market.connect(yesUser).mintPosition(1n, 1, { value: ethers.parseEther("0.02") });
    await market.connect(noUser).mintPosition(1n, 2, { value: ethers.parseEther("0.01") });

    await expect(market.connect(noUser).resolveMarket(1n, 1)).to.be.revertedWith("Ownable: caller is not the owner");

    await expect(market.connect(owner).resolveMarket(1n, 1))
      .to.emit(market, "MarketResolved")
      .withArgs(1n, 1);

    const before = await ethers.provider.getBalance(yesUser.address);
    const tx = await market.connect(yesUser).claim(1n);
    const receipt = await tx.wait();
    const gas = receipt.gasUsed * receipt.gasPrice;
    const after = await ethers.provider.getBalance(yesUser.address);

    expect(after - before + gas).to.equal(ethers.parseEther("0.03"));
  });

  it("rejects losing claims and burns winning shares after claim", async function () {
    const { yesUser, noUser, market } = await deployFixture();

    await market.connect(yesUser).mintPosition(1n, 1, { value: ethers.parseEther("0.02") });
    await market.connect(noUser).mintPosition(1n, 2, { value: ethers.parseEther("0.01") });
    await market.resolveMarket(1n, 1);

    await expect(market.connect(noUser).claim(1n)).to.be.revertedWith("No winning shares");

    await market.connect(yesUser).claim(1n);
    const yesTokenId = await market.positionTokenId(1n, 1);
    expect(await market.balanceOf(yesUser.address, yesTokenId)).to.equal(0n);
    await expect(market.connect(yesUser).claim(1n)).to.be.revertedWith("No winning shares");
  });

  it("creates an NBA market that can be centrally resolved for demo use", async function () {
    const { market, closeTime } = await deployFixture();

    await expect(
      market.createMarket(
        1,
        "Will the Celtics beat the Lakers in the demo game?",
        "NBA demo market resolved by the project authority.",
        0,
        closeTime + 1n
      )
    )
      .to.emit(market, "MarketCreated")
      .withArgs(
        2n,
        1,
        "Will the Celtics beat the Lakers in the demo game?",
        0,
        closeTime + 1n
      );

    await market.resolveMarket(2n, 2);
    const info = await market.markets(2n);
    expect(info.resolved).to.equal(true);
    expect(info.winningOutcome).to.equal(2);
  });
});
