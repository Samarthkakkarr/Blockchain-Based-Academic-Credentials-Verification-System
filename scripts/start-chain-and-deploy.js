import ganache from 'ganache';
import fs from 'fs';
import path from 'path';
import solc from 'solc';
import { ethers } from 'ethers';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Deterministic mnemonic so account addresses and private keys stay constant every run
const MNEMONIC = 'myth like bonus scare over problem client lizard pioneer submit female collect';
const PORT = 7545;
const CHAIN_ID = 1337;

async function start() {
  console.log('🚀 Starting Local Ganache Blockchain on port', PORT, '...');

  const server = ganache.server({
    wallet: {
      mnemonic: MNEMONIC,
      totalAccounts: 10,
      defaultBalance: 100
    },
    chain: {
      chainId: CHAIN_ID,
      networkId: CHAIN_ID
    },
    logging: {
      quiet: true
    }
  });

  await server.listen(PORT);
  console.log(`✓ Ganache Blockchain running at http://127.0.0.1:${PORT} (Chain ID: ${CHAIN_ID})`);

  const provider = new ethers.providers.JsonRpcProvider(`http://127.0.0.1:${PORT}`);
  const accounts = await provider.listAccounts();

  // The first account derived from the mnemonic
  const adminAddress = accounts[0];

  console.log('\n--- Compiling Smart Contract ---');
  const contractPath = path.resolve(__dirname, '../contracts/CertificateVerification.sol');
  const source = fs.readFileSync(contractPath, 'utf8');

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
      if (error.severity === 'error') {
        console.error(error.formattedMessage);
        hasError = true;
      }
    }
    if (hasError) throw new Error('Contract compilation failed.');
  }

  const contractFile = output.contracts['CertificateVerification.sol']['CertificateVerification'];
  const abi = contractFile.abi;
  const bytecode = contractFile.evm.bytecode.object;

  console.log('✓ Contract Compiled Successfully');

  console.log('--- Deploying Smart Contract to Local Blockchain ---');
  const signer = provider.getSigner(0);
  const factory = new ethers.ContractFactory(abi, bytecode, signer);
  const contract = await factory.deploy();
  await contract.deployed();

  console.log('✓ Contract Deployed at:', contract.address);

  // Auto update src/lib/blockchain.ts
  const configFilePath = path.resolve(__dirname, '../src/lib/blockchain.ts');
  let configContent = fs.readFileSync(configFilePath, 'utf8');

  configContent = configContent.replace(
    /export const DEFAULT_CONTRACT_ADDRESS = ['"].*?['"];/,
    `export const DEFAULT_CONTRACT_ADDRESS = '${contract.address}';`
  );
  configContent = configContent.replace(
    /export const ADMIN_WALLET_ADDRESS = ['"].*?['"];/,
    `export const ADMIN_WALLET_ADDRESS = '${adminAddress}';`
  );

  fs.writeFileSync(configFilePath, configContent, 'utf8');
  console.log('✓ Automatically updated src/lib/blockchain.ts');

  console.log('\n========================================================================');
  console.log('🎉 LOCAL BLOCKCHAIN & CONTRACT READY TO USE!');
  console.log('========================================================================');
  console.log('RPC URL:            http://127.0.0.1:7545');
  console.log('Chain ID:           1337');
  console.log('Contract Address:   ', contract.address);
  console.log('Admin Account:      ', adminAddress);
  console.log('Admin Private Key:   0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d');
  console.log('========================================================================');
  console.log('Blockchain is actively running in background. Ready for MetaMask connections!\n');
}

start().catch((err) => {
  console.error('Error starting blockchain:', err);
  process.exit(1);
});
