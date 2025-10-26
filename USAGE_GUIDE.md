# EVM Chain Toolkit - Complete Usage Guide

This comprehensive guide covers everything you need to know about using EVM Chain Toolkit for blockchain transaction reporting and batch token transfers.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Transaction Reporter](#transaction-reporter)
5. [Batch Token Sender](#batch-token-sender)
6. [CLI Usage](#cli-usage)
7. [Programmatic API](#programmatic-api)
8. [Multi-Chain Setup](#multi-chain-setup)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Usage](#advanced-usage)
11. [Best Practices](#best-practices)

## Getting Started

EVM Chain Toolkit is a comprehensive solution for blockchain developers who need to:
- Analyze transaction history across multiple EVM chains
- Send batch token transfers efficiently
- Generate detailed reports and summaries

### Supported Networks

- **Ethereum** (Mainnet, Goerli, Sepolia)
- **Polygon** (Mainnet, Mumbai)
- **BSC** (Binance Smart Chain)
- **Avalanche** (C-Chain)
- **Arbitrum** (One, Nova)
- **Optimism** (Mainnet, Goerli)
- **Base** (Mainnet, Goerli)

## Installation

### Prerequisites
- Node.js 16 or higher
- npm or yarn
- Git

### Install from npm
```bash
npm install evm-chain-toolkit
```

### Install from source
```bash
git clone https://github.com/vaysi/evm-chain-toolkit.git
cd evm-chain-toolkit
npm install
npm run build
```

## Configuration

### Environment Variables

Create a `.env` file in your project root:

```env
# API Keys for different networks
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# RPC URLs for different networks
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
AVALANCHE_RPC_URL=https://avalanche.llamarpc.com

# Batch transfer settings
PRIVATE_KEY=your_private_key_without_0x_prefix
MAX_RETRIES=3
RETRY_DELAY_MS=2000
BATCH_SIZE=50
GAS_LIMIT_MULTIPLIER=1.2
```

### Getting API Keys

1. **Etherscan**: Visit [etherscan.io](https://etherscan.io) and create an account
2. **Polygonscan**: Visit [polygonscan.com](https://polygonscan.com) and create an account
3. **BscScan**: Visit [bscscan.com](https://bscscan.com) and create an account

## Transaction Reporter

The Transaction Reporter helps you analyze blockchain transactions with detailed filtering and token transfer parsing.

### Basic Usage

```typescript
import { EVMTransactionFilter } from 'evm-chain-toolkit';

const filter = new EVMTransactionFilter('your-api-key');

const result = await filter.filterAndSave({
  address: '0x0000000000000000000000000000000000000001',
  startDate: new Date('2025-01-01T00:00:00Z'),
  endDate: new Date('2025-01-31T23:59:59Z'),
  includeInternal: true,
  includeTokenTransfers: true,
  includeERC721: true,
  includeERC1155: true
});

console.log(`Found ${result.result.summary.totalTransactions} transactions`);
```

### Filter Options

```typescript
interface TransactionFilter {
  address: string;                    // Wallet address to analyze
  startDate: Date;                    // Start date for filtering
  endDate: Date;                      // End date for filtering
  includeInternal?: boolean;          // Include internal transactions
  includeTokenTransfers?: boolean;    // Include ERC-20 token transfers
  includeERC721?: boolean;           // Include ERC-721 NFT transfers
  includeERC1155?: boolean;          // Include ERC-1155 multi-token transfers
  incomingOnly?: boolean;            // Only incoming transactions
  outgoingOnly?: boolean;            // Only outgoing transactions
}
```

### Output Files

The Transaction Reporter generates three types of files:

1. **Transaction Results** (`evm_transactions_{wallet}_{date_range}_{timestamp}.json`)
   - Complete transaction data with all transfers
   - Token metadata and formatted values
   - Gas usage and block information

2. **Summary Report** (`summary_evm_transactions_{wallet}_{date_range}_{timestamp}.json`)
   - High-level statistics
   - Token transfer counts
   - Processing metadata

3. **Wallet Summary** (`wallet_summary_evm_transactions_{wallet}_{date_range}_{timestamp}.json`)
   - Unique wallets with transaction counts
   - Token transfer summaries
   - Formatted values without decimals

## Batch Token Sender

The Batch Token Sender allows you to send ERC-20 tokens to multiple recipients efficiently.

### Basic Usage

```bash
# Create recipients file
echo '[{"address": "0x0000000000000000000000000000000000000001", "amount": "100"}, {"address": "0x0000000000000000000000000000000000000002", "amount": "250"}]' > recipients.json

# Run batch transfer
npm run batch-send -- --token 0xYourTokenAddress --input recipients.json
```

### Recipients File Format

```json
[
  {
    "address": "0x0000000000000000000000000000000000000001",
    "amount": "100.5"
  },
  {
    "address": "0x0000000000000000000000000000000000000002",
    "amount": "50.25"
  }
]
```

### Command Line Options

```bash
npm run batch-send -- [OPTIONS]

REQUIRED:
  --token, -t <address>     ERC-20 token contract address
  --input, -i <file>        JSON file with recipient list

OPTIONAL:
  --private-key, -k <key>    Wallet private key (or use PRIVATE_KEY env var)
  --rpc-url, -r <url>       RPC URL (or use network-specific env var)
  --dry-run, -d             Simulate transfers without sending
  --output-dir, -o <dir>    Output directory for reports (default: ./output)
  --batch-size, -b <size>   Process transfers in batches (default: 50)
  --max-retries <count>     Max retry attempts for failed transfers (default: 3)
  --gas-multiplier, -g <n>  Gas limit multiplier (default: 1.2)
  --help, -h                Show help message
```

### Safety Features

- **Balance Validation**: Checks token and native currency balances
- **Address Validation**: Validates all recipient addresses
- **Confirmation Prompt**: Asks for confirmation before sending
- **Dry Run Mode**: Test transfers without spending gas
- **Error Recovery**: Continues processing even if some transfers fail

## CLI Usage

### Transaction Reporter CLI

```bash
npm run cli
```

The interactive CLI guides you through:
1. API key input
2. Wallet address selection
3. Date range specification
4. Transaction type filtering
5. Output generation

### Batch Sender CLI

```bash
npm run batch-send -- --token 0xYourToken --input recipients.json --dry-run
```

## Programmatic API

### Custom Configuration

```typescript
const filter = new EVMTransactionFilter('api-key', {
  retryConfig: {
    maxRetries: 5,
    baseDelayMs: 2000,
    maxDelayMs: 30000,
    backoffMultiplier: 1.5
  },
  queueConfig: {
    maxConcurrent: 5,
    rateLimitPerSecond: 10
  },
  outputConfig: {
    outputDir: './custom-output',
    prettyPrint: false
  }
});
```

### Advanced Filtering

```typescript
// Filter for specific token transfers
const result = await filter.filterAndSave({
  address: '0x0000000000000000000000000000000000000001',
  startDate: new Date('2025-01-01T00:00:00Z'),
  endDate: new Date('2025-01-31T23:59:59Z'),
  includeTokenTransfers: true,
  includeERC721: false,
  includeERC1155: false
});

// Analyze token transfers
result.result.transactions.forEach(tx => {
  if (tx.tokenTransfers.length > 0) {
    console.log(`Transaction ${tx.transaction.hash} has ${tx.tokenTransfers.length} token transfers`);
    
    tx.tokenTransfers.forEach(transfer => {
      console.log(`${transfer.standard} transfer: ${transfer.value} ${transfer.tokenMetadata?.symbol}`);
    });
  }
});
```

## Multi-Chain Setup

### Network-Specific Configuration

```typescript
// Ethereum
const ethFilter = new EVMTransactionFilter('eth-api-key', {
  outputConfig: { networkName: 'ethereum' }
});

// Polygon
const polygonFilter = new EVMTransactionFilter('polygon-api-key', {
  outputConfig: { networkName: 'polygon' }
});

// BSC
const bscFilter = new EVMTransactionFilter('bsc-api-key', {
  outputConfig: { networkName: 'bsc' }
});
```

### RPC URL Configuration

```env
# Different networks
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
AVALANCHE_RPC_URL=https://avalanche.llamarpc.com
ARBITRUM_RPC_URL=https://arbitrum.llamarpc.com
OPTIMISM_RPC_URL=https://optimism.llamarpc.com
BASE_RPC_URL=https://base.llamarpc.com
```

## Troubleshooting

### Common Issues

#### "Invalid API key"
- Verify your API key is correct
- Check if you've exceeded rate limits
- Ensure you're using the right API key for the network

#### "Insufficient balance"
- Check both token balance and native currency balance
- Ensure you have enough native currency for gas fees
- Verify token contract address is correct

#### "Gas estimation failed"
- Check token contract is valid ERC-20 token
- Verify token contract address is correct
- Ensure wallet has sufficient native currency for gas

#### "Rate limit exceeded"
- Reduce `rateLimitPerSecond` in configuration
- Increase delays between requests
- Consider upgrading to a paid API plan

### Debug Mode

Enable verbose logging:

```bash
VERBOSE=true npm run batch-send -- --token 0xYourToken --input recipients.json
```

## Advanced Usage

### Custom Output Formats

```typescript
const result = await filter.filterAndSave(filterCriteria, {
  saveResults: true,
  saveSummary: true,
  saveWalletSummary: false,
  customFilename: 'custom-report'
});
```

### Batch Processing

```typescript
// Process multiple wallets
const wallets = [
  '0x0000000000000000000000000000000000000001',
  '0x0000000000000000000000000000000000000002',
  '0x0000000000000000000000000000000000000003'
];

for (const wallet of wallets) {
  const result = await filter.filterAndSave({
    address: wallet,
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-31T23:59:59Z'),
    includeTokenTransfers: true
  });
  
  console.log(`Processed ${wallet}: ${result.result.summary.totalTransactions} transactions`);
}
```

### Error Handling

```typescript
try {
  const result = await filter.filterAndSave(filterCriteria);
  console.log('Success:', result.files);
} catch (error) {
  if (error instanceof RetryError) {
    console.error('Failed after retries:', error.originalError.message);
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Best Practices

### Security
- Never commit private keys to version control
- Use environment variables for sensitive data
- Test with small amounts first
- Always use dry run mode before production

### Performance
- Use specific date ranges to reduce data volume
- Disable unnecessary transfer types if not needed
- Consider using paid API tiers for higher rate limits
- Process large datasets in batches

### Development
- Write tests for new functionality
- Follow TypeScript best practices
- Use meaningful variable names
- Add JSDoc comments for public APIs

### Production
- Monitor gas prices before large transfers
- Keep backups of important data
- Use retry scripts for failed transfers
- Monitor API usage and limits

## Support

- 📖 [Documentation](https://github.com/vaysi/evm-chain-toolkit#readme)
- 🐛 [Report Issues](https://github.com/vaysi/evm-chain-toolkit/issues)
- 💬 [Discussions](https://github.com/vaysi/evm-chain-toolkit/discussions)
- 💼 [LinkedIn](https://linkedin.com/in/abolfazl-vaysi)
- 🐦 [Twitter](https://twitter.com/abolfazl_vaysi)

## License

MIT License - see [LICENSE](LICENSE) file for details.
