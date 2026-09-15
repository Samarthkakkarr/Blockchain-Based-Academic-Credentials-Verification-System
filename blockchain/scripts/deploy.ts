import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying CredentialRegistry with account: ${deployer.address}`);
  console.log(`Network: ${network.name} (chainId ${network.config.chainId})`);

  const Factory = await ethers.getContractFactory("CredentialRegistry");
  const contract = await Factory.deploy(deployer.address);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`CredentialRegistry deployed to: ${address}`);

  // Persist ABI + address so backend and frontend can pick it up automatically.
  const artifact = await import(
    "../artifacts/contracts/CredentialRegistry.sol/CredentialRegistry.json"
  );

  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  const outputPaths = [
    path.join(__dirname, "../deployments"),
    path.join(__dirname, "../../backend/src/blockchain/generated"),
    path.join(__dirname, "../../frontend/src/contracts"),
  ];

  for (const dir of outputPaths) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, "CredentialRegistry.json"),
      JSON.stringify(deploymentInfo, null, 2)
    );
  }

  console.log("Deployment info written to backend/, frontend/ and blockchain/deployments/");
  console.log("Set CONTRACT_ADDRESS in backend/.env to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
