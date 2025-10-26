# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-26

### Added
- Initial release of EVM Chain Toolkit
- Multi-chain EVM support (Ethereum, Polygon, BSC, Avalanche, Arbitrum, Optimism, Base)
- Transaction reporting with comprehensive filtering
- Batch token transfer functionality
- Support for ERC-20, ERC-721, and ERC-1155 token transfers
- Interactive CLI tools for both features
- Comprehensive error handling and retry logic
- Rate limiting and request queue management
- Detailed JSON output with summary statistics
- Full test coverage with Jest
- TypeScript support with type definitions
- MIT license

### Features
- **Transaction Reporter**: Filter and analyze blockchain transactions
- **Batch Token Sender**: Send ERC-20 tokens to multiple recipients efficiently
- **Multi-Chain Support**: Works with any EVM-compatible blockchain
- **CLI Tools**: Interactive command-line interfaces
- **Comprehensive Output**: Detailed reports and summaries
- **Error Recovery**: Automatic retry with exponential backoff
- **Rate Limiting**: Respects API limits and prevents rate limiting

### Technical Details
- Built with TypeScript for type safety
- Uses ethers.js for blockchain interactions
- Axios for HTTP requests
- Jest for testing
- Support for multiple block explorers (Etherscan, Polygonscan, BscScan, etc.)
- Configurable retry and queue settings
- Environment-based configuration
