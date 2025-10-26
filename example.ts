import { EVMTransactionFilter } from './src/index';

async function example() {
  // Initialize the filter with your Etherscan API key
  const filter = new EVMTransactionFilter('your-etherscan-api-key-here');

  // Define filter criteria
  const filterCriteria = {
    address: '0x0000000000000000000000000000000000000001', // Example wallet address
    startDate: new Date('2025-01-01T00:00:00Z'),
    endDate: new Date('2025-01-02T00:00:00Z'),
    includeInternal: true,
    includeTokenTransfers: true,
    includeERC721: true,
    includeERC1155: true
  };

  try {
    console.log('Starting transaction filtering...');
    
    // Filter transactions and save results
    const result = await filter.filterAndSave(filterCriteria);

    console.log(`✅ Found ${result.result.summary.totalTransactions} transactions`);
    console.log(`✅ Found ${result.result.summary.totalTokenTransfers} token transfers`);
    console.log(`✅ Found ${result.result.summary.totalERC721Transfers} ERC721 transfers`);
    console.log(`✅ Found ${result.result.summary.totalERC1155Transfers} ERC1155 transfers`);
    console.log(`✅ Found ${result.result.summary.uniqueTokens} unique tokens`);
    console.log(`✅ API calls made: ${result.result.metadata.apiCalls}`);
    console.log(`✅ Processing time: ${result.result.metadata.processingTimeMs}ms`);
    console.log(`✅ Results saved to: ${result.files.join(', ')}`);

    // Analyze token transfers
    result.result.transactions.forEach((tx, index) => {
      if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
        console.log(`\nTransaction ${index + 1} (${tx.transaction.hash}):`);
        tx.tokenTransfers.forEach(transfer => {
          console.log(`  - ${transfer.standard} transfer: ${transfer.value || transfer.tokenId} ${transfer.tokenMetadata?.symbol || 'tokens'}`);
        });
      }
    });

  } catch (error) {
    console.error('❌ Error filtering transactions:', error.message);
  } finally {
    // Cleanup
    filter.destroy();
  }
}

// Run the example
example();
