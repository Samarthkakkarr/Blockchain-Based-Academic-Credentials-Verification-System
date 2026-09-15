import { expect } from "chai";
import { ethers } from "hardhat";
import { CredentialRegistry } from "../typechain-types";

describe("CredentialRegistry", function () {
  let contract: CredentialRegistry;
  let owner: any;
  let other: any;

  const credentialId = "CRED-2026-000001";
  const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("Rahul Sharma|BCA|2026"));

  beforeEach(async () => {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("CredentialRegistry");
    contract = (await Factory.deploy(owner.address)) as unknown as CredentialRegistry;
    await contract.waitForDeployment();
  });

  it("issues a credential and stores it correctly", async () => {
    await expect(contract.issueCredential(credentialId, credentialHash))
      .to.emit(contract, "CredentialIssued");

    const result = await contract.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.credentialHash).to.equal(credentialHash);
    expect(result.isRevoked).to.equal(false);
  });

  it("verifies an existing credential", async () => {
    await contract.issueCredential(credentialId, credentialHash);
    const result = await contract.verifyCredential(credentialId);
    expect(result.exists).to.equal(true);
    expect(result.issuer).to.equal(owner.address);
  });

  it("revokes a credential with a reason", async () => {
    await contract.issueCredential(credentialId, credentialHash);
    await expect(contract.revokeCredential(credentialId, "Academic misconduct"))
      .to.emit(contract, "CredentialRevoked");

    const result = await contract.verifyCredential(credentialId);
    expect(result.isRevoked).to.equal(true);
    expect(result.revocationReason).to.equal("Academic misconduct");
  });

  it("rejects issuance from an unauthorized account", async () => {
    await expect(
      contract.connect(other).issueCredential(credentialId, credentialHash)
    ).to.be.revertedWith("CredentialRegistry: caller is not an authorized issuer");
  });

  it("rejects revocation from an unauthorized account", async () => {
    await contract.issueCredential(credentialId, credentialHash);
    await expect(
      contract.connect(other).revokeCredential(credentialId, "fraud")
    ).to.be.revertedWith("CredentialRegistry: caller is not an authorized issuer");
  });

  it("rejects duplicate credential IDs", async () => {
    await contract.issueCredential(credentialId, credentialHash);
    await expect(
      contract.issueCredential(credentialId, credentialHash)
    ).to.be.revertedWith("CredentialRegistry: credential already exists");
  });

  it("allows the owner to authorize a new issuer", async () => {
    await contract.setIssuerAuthorization(other.address, true);
    await expect(contract.connect(other).issueCredential(credentialId, credentialHash))
      .to.emit(contract, "CredentialIssued");
  });

  it("returns exists=false for an unknown credential", async () => {
    const result = await contract.verifyCredential("CRED-2026-999999");
    expect(result.exists).to.equal(false);
  });
});
