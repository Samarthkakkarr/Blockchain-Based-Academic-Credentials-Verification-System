// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @title CredentialRegistry
/// @notice Stores only verification data (hash + status) for academic credentials.
///         No private student information is ever written on-chain.
contract CredentialRegistry is Ownable {
    struct Credential {
        bytes32 credentialHash;   // keccak256 hash of the canonical off-chain record
        address issuer;           // wallet that issued it
        uint256 issueTimestamp;
        bool exists;
        bool isRevoked;
        uint256 revocationTimestamp;
        string revocationReason;
    }

    // credentialId (e.g. "CRED-2026-000001") => Credential
    mapping(string => Credential) private credentials;

    // addresses allowed to issue/revoke (university registrar wallets)
    mapping(address => bool) public authorizedIssuers;

    event CredentialIssued(
        string indexed credentialIdIndexed,
        string credentialId,
        bytes32 credentialHash,
        address indexed issuer,
        uint256 timestamp
    );

    event CredentialRevoked(
        string indexed credentialIdIndexed,
        string credentialId,
        address indexed revoker,
        string reason,
        uint256 timestamp
    );

    event IssuerAuthorized(address indexed issuer, bool status);

    modifier onlyAuthorizedIssuer() {
        require(
            authorizedIssuers[msg.sender] || msg.sender == owner(),
            "CredentialRegistry: caller is not an authorized issuer"
        );
        _;
    }

    constructor(address initialOwner) Ownable(initialOwner) {
        authorizedIssuers[initialOwner] = true;
    }

    function setIssuerAuthorization(address issuer, bool status) external onlyOwner {
        authorizedIssuers[issuer] = status;
        emit IssuerAuthorized(issuer, status);
    }

    /// @notice Issues a new credential record on-chain. Reverts on duplicate IDs.
    function issueCredential(string calldata credentialId, bytes32 credentialHash)
        external
        onlyAuthorizedIssuer
    {
        require(bytes(credentialId).length > 0, "CredentialRegistry: empty credentialId");
        require(!credentials[credentialId].exists, "CredentialRegistry: credential already exists");

        credentials[credentialId] = Credential({
            credentialHash: credentialHash,
            issuer: msg.sender,
            issueTimestamp: block.timestamp,
            exists: true,
            isRevoked: false,
            revocationTimestamp: 0,
            revocationReason: ""
        });

        emit CredentialIssued(credentialId, credentialId, credentialHash, msg.sender, block.timestamp);
    }

    /// @notice Revokes an existing credential with a reason.
    function revokeCredential(string calldata credentialId, string calldata reason)
        external
        onlyAuthorizedIssuer
    {
        Credential storage cred = credentials[credentialId];
        require(cred.exists, "CredentialRegistry: credential does not exist");
        require(!cred.isRevoked, "CredentialRegistry: credential already revoked");

        cred.isRevoked = true;
        cred.revocationTimestamp = block.timestamp;
        cred.revocationReason = reason;

        emit CredentialRevoked(credentialId, credentialId, msg.sender, reason, block.timestamp);
    }

    /// @notice Read-only verification lookup used by the backend/verifier.
    function verifyCredential(string calldata credentialId)
        external
        view
        returns (
            bool exists,
            bytes32 credentialHash,
            address issuer,
            uint256 issueTimestamp,
            bool isRevoked,
            uint256 revocationTimestamp,
            string memory revocationReason
        )
    {
        Credential memory cred = credentials[credentialId];
        return (
            cred.exists,
            cred.credentialHash,
            cred.issuer,
            cred.issueTimestamp,
            cred.isRevoked,
            cred.revocationTimestamp,
            cred.revocationReason
        );
    }
}
