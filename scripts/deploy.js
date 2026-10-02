import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('--- 1. Reading Solidity Smart Contract ---');
  const contractPath = path.resolve(__dirname, '../contracts/CertificateVerification.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

  console.log('--- 2. Compiling with Solc 0.8.19 ---');
  const input = {
    language: 'Solidity',
    sources: {
      'CertificateVerification.sol': {
        content: source
      }
    },
    settings: {
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode']
        }
      }
    }
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      console.log(error.formattedMessage);
      if (error.severity === 'error') hasError = true;
    }
    if (hasError) {
      throw new Error('Compilation failed');
    }
  }

  const contractFile = output.contracts['CertificateVerification.sol']['CertificateVerification'];
  const abi = contractFile.abi;
  const bytecode = contractFile.evm.bytecode.object;

  console.log('✓ Contract Compiled Successfully');

  console.log('--- 3. Connecting to Ganache at http://127.0.0.1:7545 ---');
  const provider = new ethers.providers.JsonRpcProvider('http://127.0.0.1:7545');
  
  const accounts = await provider.listAccounts();
  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts found on Ganache RPC http://127.0.0.1:7545. Is Ganache running?');
  }

  const signer = provider.getSigner(0);
  const deployerAddress = await signer.getAddress();
  console.log('Deployer / Admin Address:', deployerAddress);

  console.log('--- 4. Deploying Smart Contract ---');
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.deployed();

  console.log('✓ CertificateVerification Deployed to:', contract.address);

  console.log('--- 5. Auto-Updating src/lib/blockchain.ts ---');
  const configFilePath = path.resolve(__dirname, '../src/lib/blockchain.ts');
  let configContent = fs.readFileSync(configFilePath, 'utf8');

  configContent = configContent.replace(
    /export const DEFAULT_CONTRACT_ADDRESS = ['"].*?['"];/,
    `export const DEFAULT_CONTRACT_ADDRESS = '${contract.address}';`
  );
  configContent = configContent.replace(
    /export const ADMIN_WALLET_ADDRESS = ['"].*?['"];/,
    `export const ADMIN_WALLET_ADDRESS = '${deployerAddress}';`
  );

  fs.writeFileSync(configFilePath, configContent, 'utf8');
  console.log('✓ Updated DEFAULT_CONTRACT_ADDRESS and ADMIN_WALLET_ADDRESS in src/lib/blockchain.ts');

  console.log('\n======================================================');
  console.log('🎉 SETUP & DEPLOYMENT COMPLETE!');
  console.log('Contract Address:', contract.address);
  console.log('Admin Address:   ', deployerAddress);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Deployment Error:', err);
  process.exit(1);
});
