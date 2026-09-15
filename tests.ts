// test/CredentialRegistry.test.ts
import { expect } from "chai";
import { ethers } from "hardhat";

describe("CredentialRegistry", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const Registry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await Registry.deploy();
    return { registry, owner, other };
  }

  it("allows only owner to issue a credential", async function () {
    const { registry, other } = await deployFixture();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("dummy-credential"));

    await expect(
      registry.connect(other).issueCredential(hash)
    ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
  });

  it("verifies a credential that was issued", async function () {
    const { registry, owner } = await deployFixture();
    const hash = ethers.keccak256(ethers.toUtf8Bytes("dummy-credential"));

    await registry.connect(owner).issueCredential(hash);
    expect(await registry.isValid(hash)).to.equal(true);
  });
});