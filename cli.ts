#!/usr/bin/env node

import { EVMTransactionFilter } from './src/index';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('🔍 EVM Chain Toolkit CLI');
  console.log('========================\n');

  try {
    // Get API key
    const apiKey = await question('Enter your Etherscan API key: ');
    if (!apiKey) {
      console.error('❌ API key is required');
      process.exit(1);
    }

    // Get wallet address
    const address = await question('Enter wallet address (0x...): ');
    if (!address || !address.startsWith('0x')) {
      console.error('❌ Valid wallet address is required');
      process.exit(1);
    }

    // Get start date
    const startDateStr = await question('Enter start date (YYYY-MM-DD): ');
    const startDate = new Date(startDateStr + 'T00:00:00Z');
    if (isNaN(startDate.getTime())) {
      console.error('❌ Invalid start date format');
      process.exit(1);
    }

    // Get end date
    const endDateStr = await question('Enter end date (YYYY-MM-DD): ');
    const endDate = new Date(endDateStr + 'T23:59:59Z');
    if (isNaN(endDate.getTime())) {
      console.error('❌ Invalid end date format');
      process.exit(1);
    }

    // Get options
    const includeInternal = (await question('Include internal transactions? (y/n): ')).toLowerCase() === 'y';
    const includeTokenTransfers = (await question('Include ERC-20 token transfers? (y/n): ')).toLowerCase() === 'y';
    const includeERC721 = (await question('Include ERC-721 NFT transfers? (y/n): ')).toLowerCase() === 'y';
    const includeERC1155 = (await question('Include ERC-1155 multi-token transfers? (y/n): ')).toLowerCase() === 'y';
    
    // Ask about transaction direction
    const transactionDirection = (await question('Transaction direction (all/incoming/outgoing): ')).toLowerCase();
    const incomingOnly = transactionDirection === 'incoming';
    const outgoingOnly = transactionDirection === 'outgoing';

    console.log('\n🚀 Starting transaction filtering...\n');

    // Initialize filter
    const filter = new EVMTransactionFilter(apiKey);

    // Filter criteria
    const filterCriteria = {
      address,
      startDate,
      endDate,
      includeInternal,
      includeTokenTransfers,
      includeERC721,
      includeERC1155,
      incomingOnly,
      outgoingOnly
    };

    // Execute filtering
    const result = await filter.filterAndSave(filterCriteria);

    // Display results
    console.log('\n✅ Filtering completed!');
    console.log(`📊 Found ${result.result.summary.totalTransactions} transactions`);
    console.log(`🪙 Found ${result.result.summary.totalTokenTransfers} ERC-20 transfers`);
    console.log(`🎨 Found ${result.result.summary.totalERC721Transfers} ERC-721 transfers`);
    console.log(`🔢 Found ${result.result.summary.totalERC1155Transfers} ERC-1155 transfers`);
    console.log(`🏷️  Found ${result.result.summary.uniqueTokens} unique tokens`);
    console.log(`📞 API calls made: ${result.result.metadata.apiCalls}`);
    console.log(`⏱️  Processing time: ${result.result.metadata.processingTimeMs}ms`);
    console.log(`📁 Results saved to: ${result.files.join(', ')}`);
    
    // Show wallet summary info
    const walletSummaryFile = result.files.find(file => file.includes('wallet_summary'));
    if (walletSummaryFile) {
      console.log(`\n💼 Wallet Summary: ${walletSummaryFile}`);
      console.log(`   • Shows unique wallets with transaction counts`);
      console.log(`   • Includes full transaction details for each wallet`);
      console.log(`   • Includes token transfer summaries with formatted values`);
      console.log(`   • Values are formatted without decimals (e.g., 1000000 → 1 for 6-decimal tokens)`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
