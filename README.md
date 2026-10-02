# Blockchain-Based Academic Credentials Verification System

A decentralized and tamper-proof academic certificate issuance and verification platform built with Solidity smart contracts, Vite, React, TypeScript, and Ethers.js.

## 📌 Features

- **Decentralized Verification**: Verifiable authenticity of certificates directly on the Ethereum blockchain.
- **Smart Contract Powered**: Certificate records, cryptographic hashes, and verification metadata managed immutably.
- **QR Code Verification**: Instant certificate scanning and verification with QR codes.
- **PDF Certificate Export & Generation**: Download and render official certificates with security stamps.
- **Role-Based Access**: Authorized institution/admin issuance controls and public verification portal.
- **Local Blockchain Simulation**: Integrated Ganache testnet deploy scripts for development and testing.

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Radix UI / Shadcn UI, Lucide Icons
- **Blockchain & Smart Contracts**: Solidity (^0.8.19), Ethers.js v5, Ganache local blockchain
- **Utilities**: `html5-qrcode`, `qrcode.react`, `jspdf`, `html2canvas`, `crypto-js`

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Git](https://git-scm.com/)
- MetaMask or any Web3 wallet (optional for live chain interaction)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/samarthkakkarr/Blockchain-Based-Academic-Credentials-Verification-System.git
   cd Blockchain-Based-Academic-Credentials-Verification-System
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start local blockchain & deploy contract:**
   ```bash
   npm run chain
   ```
   *Alternatively, compile & deploy directly:*
   ```bash
   npm run deploy
   ```

4. **Launch the development server:**
   ```bash
   npm run dev
   ```

---

## 📂 Project Structure

```
├── contracts/                  # Solidity smart contracts
│   └── CertificateVerification.sol
├── scripts/                    # Deployment and local blockchain scripts
│   ├── deploy.js
│   └── start-chain-and-deploy.js
├── src/                        # React + TypeScript frontend application
│   ├── components/             # Reusable UI & credential components
│   ├── contracts/              # ABI and contract interfaces
│   ├── hooks/                  # Custom React hooks (Web3, notifications, etc.)
│   ├── lib/                    # Helper functions & utilities
│   ├── pages/                  # Application views & dashboards
│   └── types/                  # TypeScript definitions
├── public/                     # Static assets
└── package.json
```

---

## 📜 Smart Contract Overview

The `CertificateVerification.sol` contract contains methods for:
- `issueCertificate(...)`: Issuing new academic credentials with cryptographic hashes.
- `verifyCertificate(...)`: Public validation of certificate legitimacy against on-chain records.
- `revokeCertificate(...)`: Administrative revocation mechanism with audit logs.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
