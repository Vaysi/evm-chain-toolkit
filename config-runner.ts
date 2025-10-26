import { EVMTransactionFilter } from './src/index';
import * as fs from 'fs';

// Load configuration from file
interface Config {
  apiKey: string;
  filters: {
    address: string;
    startDate: string;
    endDate: string;
    includeInternal: boolean;
    includeTokenTransfers: boolean;
    includeERC721: boolean;
    includeERC1155: boolean;
  }[];
}

async function loadConfigAndRun() {
  try {
    // Load config from file
    const configData = fs.readFileSync('config.json', 'utf8');
    const config: Config = JSON.parse(configData);

    console.log('🔍 EVM Chain Toolkit - Config Mode');
    console.log('==================================\n');

    const filter = new EVMTransactionFilter(config.apiKey);

    for (const filterConfig of config.filters) {
      console.log(`Processing wallet: ${filterConfig.address}`);
      console.log(`Date range: ${filterConfig.startDate} to ${filterConfig.endDate}\n`);

      const filterCriteria = {
        address: filterConfig.address,
        startDate: new Date(filterConfig.startDate),
        endDate: new Date(filterConfig.endDate),
        includeInternal: filterConfig.includeInternal,
        includeTokenTransfers: filterConfig.includeTokenTransfers,
        includeERC721: filterConfig.includeERC721,
        includeERC1155: filterConfig.includeERC1155
      };

      const result = await filter.filterAndSave(filterCriteria);

      console.log(`✅ Completed: ${result.result.summary.totalTransactions} transactions`);
      console.log(`📁 Files: ${result.files.join(', ')}\n`);
    }

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
  }
}

loadConfigAndRun();
