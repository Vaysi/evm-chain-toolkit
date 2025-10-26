# EVM Chain Toolkit

A comprehensive TypeScript toolkit for EVM blockchain transaction reporting and batch token transfers. Works with Ethereum, Polygon, BSC, Avalanche, and other EVM-compatible chains.

## Features

- 🔍 **Transaction Reporting**: Filter and analyze blockchain transactions with token transfer parsing
- 🚀 **Batch Token Transfers**: Send ERC-20 tokens to multiple recipients efficiently
- 🌐 **Multi-Chain Support**: Works with any EVM-compatible blockchain
- 🪙 **Token Support**: Parse ERC-20, ERC-721, and ERC-1155 token transfers
- 🔄 **Retry Logic**: Automatic retry with exponential backoff for failed requests
- ⏱️ **Rate Limiting**: Request queue management to respect API limits
- 📊 **Rich Output**: Detailed JSON reports with summary statistics
- 🛡️ **Error Handling**: Robust error handling and recovery
- 🧪 **Full Test Coverage**: Comprehensive Jest test suite

## Supported Networks

- **Ethereum** (Mainnet, Goerli, Sepolia)
- **Polygon** (Mainnet, Mumbai)
- **BSC** (Binance Smart Chain)
- **Avalanche** (C-Chain)
- **Arbitrum** (One, Nova)
- **Optimism** (Mainnet, Goerli)
- **Base** (Mainnet, Goerli)

## Installation

```bash
npm install evm-chain-toolkit
```

## Quick Start

### Transaction Reporting

```typescript
import { EVMTransactionFilter } from 'evm-chain-toolkit';

// Initialize with your Etherscan API key
const filter = new EVMTransactionFilter('your-etherscan-api-key');

// Define filter criteria
const filterCriteria = {
  address: '0x0000000000000000000000000000000000000001',
  startDate: new Date('2025-01-01T00:00:00Z'),
  endDate: new Date('2025-01-02T00:00:00Z'),
  includeInternal: true,
  includeTokenTransfers: true,
  includeERC721: true,
  includeERC1155: true
};

// Filter transactions and save results
const result = await filter.filterAndSave(filterCriteria);

console.log(`Found ${result.result.summary.totalTransactions} transactions`);
console.log(`Results saved to: ${result.files.join(', ')}`);
```

### Batch Token Transfers

```bash
# Create recipients file
echo '[{"address": "0x0000000000000000000000000000000000000001", "amount": "100"}, {"address": "0x0000000000000000000000000000000000000002", "amount": "250"}]' > recipients.json

# Run batch transfer
npm run batch-send -- --token 0xYourTokenAddress --input recipients.json --dry-run
```

## CLI Usage

### Transaction Reporter CLI

```bash
npm run cli
```

Interactive CLI that guides you through:
- API key setup
- Wallet address input
- Date range selection
- Transaction type filtering
- Output generation

### Batch Sender CLI

```bash
npm run batch-send -- --token 0xYourTokenAddress --input recipients.json
```

Options:
- `--token, -t`: ERC-20 token contract address
- `--input, -i`: JSON file with recipient list
- `--dry-run, -d`: Simulate transfers without sending
- `--batch-size, -b`: Process transfers in batches (default: 50)
- `--gas-multiplier, -g`: Gas limit multiplier (default: 1.2)

## Configuration

### Environment Variables

Create a `.env` file:

```env
# For transaction reporting
ETHERSCAN_API_KEY=your_etherscan_api_key_here
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here
BSCSCAN_API_KEY=your_bscscan_api_key_here

# For batch transfers
PRIVATE_KEY=your_private_key_without_0x_prefix
ETHEREUM_RPC_URL=https://eth.llamarpc.com
POLYGON_RPC_URL=https://polygon.llamarpc.com
BSC_RPC_URL=https://bsc.llamarpc.com
```

### Network Configuration

The toolkit automatically detects the network based on the RPC URL or API endpoint. For custom networks, you can specify the explorer API:

```typescript
const filter = new EVMTransactionFilter('api-key', {
  outputConfig: {
    outputDir: './custom-output',
    networkName: 'custom-network'
  }
});
```

## API Reference

### EVMTransactionFilter

Main class for transaction filtering.

#### Constructor

```typescript
new EVMTransactionFilter(apiKey: string, config?: {
  retryConfig?: Partial<RetryConfig>;
  queueConfig?: Partial<QueueConfig>;
  outputConfig?: Partial<OutputConfig>;
})
```

#### Methods

- `filterAndSave(filter: TransactionFilter, options?: FilterOptions): Promise<FilterResult>`
- `getApiCallCount(): number`
- `resetApiCallCount(): void`
- `waitForCompletion(): Promise<void>`
- `destroy(): void`

### TransactionFilter

```typescript
interface TransactionFilter {
  address: string;                    // Wallet address to filter
  startDate: Date;                    // Start date for filtering
  endDate: Date;                      // End date for filtering
  includeInternal?: boolean;          // Include internal transactions
  includeTokenTransfers?: boolean;    // Include ERC-20 token transfers
  includeERC721?: boolean;           // Include ERC-721 NFT transfers
  includeERC1155?: boolean;          // Include ERC-1155 multi-token transfers
}
```

## Output Files

### Transaction Reports

1. **Transaction Results** (`evm_transactions_{wallet}_{date_range}_{timestamp}.json`)
2. **Summary Report** (`summary_evm_transactions_{wallet}_{date_range}_{timestamp}.json`)
3. **Wallet Summary** (`wallet_summary_evm_transactions_{wallet}_{date_range}_{timestamp}.json`)

### Batch Transfer Reports

1. **Batch Report** (`batch_transfer_report_{token}_{timestamp}.json`)
2. **Failed Transfers** (`failed_transfers_{token}_{timestamp}.json`)
3. **Retry Script** (`retry_failed_{token}_{timestamp}.sh`)

## Examples

### Multi-Chain Setup

```typescript
// Ethereum
const ethFilter = new EVMTransactionFilter('eth-api-key');

// Polygon
const polygonFilter = new EVMTransactionFilter('polygon-api-key');

// BSC
const bscFilter = new EVMTransactionFilter('bsc-api-key');
```

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

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Author

**Abolfazl Vaysi** - [@vaysi](https://github.com/vaysi)

### Connect with me
- 💼 [LinkedIn](https://linkedin.com/in/abolfazl-vaysi)
- 🐦 [Twitter](https://twitter.com/abolfazl_vaysi)
- 📧 [GitHub](https://github.com/vaysi)

## Support

- 📖 [Documentation](https://github.com/vaysi/evm-chain-toolkit#readme)
- 🐛 [Report Issues](https://github.com/vaysi/evm-chain-toolkit/issues)
- 💬 [Discussions](https://github.com/vaysi/evm-chain-toolkit/discussions)

## Changelog

### v1.0.0
- Initial release
- Multi-chain EVM support
- Transaction reporting with token transfer parsing
- Batch token transfer functionality
- Comprehensive CLI tools
- Full test coverage