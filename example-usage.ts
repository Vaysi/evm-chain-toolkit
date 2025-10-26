import { EVMTransactionFilter } from './src/index';

// Example with real wallet and date range
async function exampleUsage() {
  console.log('🔍 EVM Chain Toolkit - Example Usage');
  console.log('====================================\n');

  // Replace with your actual API key
  const API_KEY = 'your_etherscan_api_key_here';
  
  // Example wallet address (replace with your target wallet)
  const WALLET_ADDRESS = '0x0000000000000000000000000000000000000001';
  
  // Example date range (last 30 days)
  const START_DATE = new Date('2025-01-01T00:00:00Z');
  const END_DATE = new Date('2025-01-31T23:59:59Z');

  console.log(`📅 Date Range: ${START_DATE.toISOString().split('T')[0]} to ${END_DATE.toISOString().split('T')[0]}`);
  console.log(`👛 Wallet: ${WALLET_ADDRESS}\n`);

  try {
    const filter = new EVMTransactionFilter(API_KEY);

    const filterCriteria = {
      address: WALLET_ADDRESS,
      startDate: START_DATE,
      endDate: END_DATE,
      includeInternal: true,
      includeTokenTransfers: true,
      includeERC721: true,
      includeERC1155: true
    };

    console.log('🚀 Starting transaction filtering...\n');

    const result = await filter.filterAndSave(filterCriteria);

    // Display results
    console.log('✅ Filtering completed!\n');
    console.log('📊 Summary:');
    console.log(`   • Total Transactions: ${result.result.summary.totalTransactions}`);
    console.log(`   • Internal Transactions: ${result.result.summary.totalInternalTransactions}`);
    console.log(`   • ERC-20 Transfers: ${result.result.summary.totalTokenTransfers}`);
    console.log(`   • ERC-721 Transfers: ${result.result.summary.totalERC721Transfers}`);
    console.log(`   • ERC-1155 Transfers: ${result.result.summary.totalERC1155Transfers}`);
    console.log(`   • Unique Tokens: ${result.result.summary.uniqueTokens}`);
    console.log(`   • API Calls: ${result.result.metadata.apiCalls}`);
    console.log(`   • Processing Time: ${result.result.metadata.processingTimeMs}ms\n`);

    console.log('📁 Output Files:');
    result.files.forEach(file => console.log(`   • ${file}`));

    // Show sample transactions with token transfers
    const transactionsWithTokens = result.result.transactions.filter(tx => 
      tx.tokenTransfers && tx.tokenTransfers.length > 0
    );

    if (transactionsWithTokens.length > 0) {
      console.log('\n🪙 Sample Token Transfers:');
      transactionsWithTokens.slice(0, 3).forEach((tx, index) => {
        console.log(`   ${index + 1}. Transaction: ${tx.transaction.hash.slice(0, 10)}...`);
        tx.tokenTransfers?.slice(0, 2).forEach(transfer => {
          const amount = transfer.value || transfer.tokenId || 'N/A';
          const symbol = transfer.tokenMetadata?.symbol || 'Unknown';
          console.log(`      • ${transfer.standard}: ${amount} ${symbol}`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

// Run the example
exampleUsage();
