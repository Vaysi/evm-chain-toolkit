#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { BatchTokenSender } from './src/services/batch-sender';
import { BatchReportManager } from './src/services/batch-report-manager';
import { BatchConfig, BatchRecipient, TransferResult, BatchReport } from './src/types/batch-sender';

// Load environment variables
require('dotenv').config();

interface CliArgs {
  token: string;
  input: string;
  privateKey?: string;
  rpcUrl?: string;
  dryRun?: boolean;
  retryMode?: boolean;
  outputDir?: string;
  batchSize?: number;
  maxRetries?: number;
  gasMultiplier?: number;
  help?: boolean;
}

class BatchSenderCLI {
  private args: CliArgs;

  constructor() {
    this.args = this.parseArguments();
  }

  /**
   * Parse command line arguments
   */
  private parseArguments(): CliArgs {
    const args: CliArgs = {
      token: '',
      input: ''
    };

    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i];
      const nextArg = process.argv[i + 1];

      switch (arg) {
        case '--token':
        case '-t':
          args.token = nextArg;
          i++;
          break;
        case '--input':
        case '-i':
          args.input = nextArg;
          i++;
          break;
        case '--private-key':
        case '-k':
          args.privateKey = nextArg;
          i++;
          break;
        case '--rpc-url':
        case '-r':
          args.rpcUrl = nextArg;
          i++;
          break;
        case '--dry-run':
        case '-d':
          args.dryRun = true;
          break;
        case '--retry-mode':
          args.retryMode = true;
          break;
        case '--output-dir':
        case '-o':
          args.outputDir = nextArg;
          i++;
          break;
        case '--batch-size':
        case '-b':
          args.batchSize = parseInt(nextArg);
          i++;
          break;
        case '--max-retries':
          args.maxRetries = parseInt(nextArg);
          i++;
          break;
        case '--gas-multiplier':
        case '-g':
          args.gasMultiplier = parseFloat(nextArg);
          i++;
          break;
        case '--help':
        case '-h':
          args.help = true;
          break;
      }
    }

    return args;
  }

  /**
   * Display help information
   */
  private showHelp(): void {
    console.log(`
🚀 Batch Token Sender for Polygon Network

USAGE:
  npm run batch-send -- [OPTIONS]

REQUIRED OPTIONS:
  --token, -t <address>     ERC-20 token contract address
  --input, -i <file>        JSON file with recipient list

OPTIONAL OPTIONS:
  --private-key, -k <key>    Wallet private key (or use PRIVATE_KEY env var)
  --rpc-url, -r <url>       Polygon RPC URL (or use POLYGON_RPC_URL env var)
  --dry-run, -d             Simulate transfers without sending
  --retry-mode              Retry failed transfers from previous batch
  --output-dir, -o <dir>    Output directory for reports (default: ./output)
  --batch-size, -b <size>   Process transfers in batches (default: 50)
  --max-retries <count>     Max retry attempts for failed transfers (default: 3)
  --gas-multiplier, -g <n>  Gas limit multiplier (default: 1.2)
  --help, -h                Show this help message

ENVIRONMENT VARIABLES:
  PRIVATE_KEY               Wallet private key
  POLYGON_RPC_URL          Polygon RPC endpoint
  POLYGONSCAN_API_KEY      Optional API key for verification

EXAMPLES:
  # Basic usage
  npm run batch-send -- --token 0xYourToken --input recipients.json

  # Dry run to estimate costs
  npm run batch-send -- --token 0xYourToken --input recipients.json --dry-run

  # Custom configuration
  npm run batch-send -- --token 0xYourToken --input recipients.json --batch-size 25 --gas-multiplier 1.5

INPUT JSON FORMAT:
  [
    {"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb", "amount": "100.5"},
    {"address": "0x1234567890123456789012345678901234567890", "amount": "50.25"}
  ]

OUTPUT FILES:
  - batch_transfer_report_<token>_<timestamp>.json  (Detailed report)
  - failed_transfers_<token>_<timestamp>.json      (Failed transfers for retry)
  - retry_failed_<token>_<timestamp>.sh            (Retry script)
`);
  }

  /**
   * Validate required arguments
   */
  private validateArguments(): void {
    if (this.args.help) {
      this.showHelp();
      process.exit(0);
    }

    if (!this.args.token) {
      console.error('❌ Error: Token contract address is required');
      console.error('Use --token <address> or --help for more information');
      process.exit(1);
    }

    if (!this.args.input) {
      console.error('❌ Error: Input JSON file is required');
      console.error('Use --input <file> or --help for more information');
      process.exit(1);
    }

    if (!fs.existsSync(this.args.input)) {
      console.error(`❌ Error: Input file not found: ${this.args.input}`);
      process.exit(1);
    }

    // Validate token address
    if (!this.isValidAddress(this.args.token)) {
      console.error(`❌ Error: Invalid token contract address: ${this.args.token}`);
      process.exit(1);
    }
  }

  /**
   * Check if address is valid
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get configuration from args and environment
   */
  private getConfig(): BatchConfig {
    const privateKey = this.args.privateKey || process.env.PRIVATE_KEY;
    const rpcUrl = this.args.rpcUrl || process.env.POLYGON_RPC_URL || 'https://polygon.llamarpc.com';

    if (!privateKey) {
      console.error('❌ Error: Private key is required');
      console.error('Provide via --private-key argument or PRIVATE_KEY environment variable');
      process.exit(1);
    }

    return {
      tokenContract: this.args.token,
      privateKey,
      rpcUrl,
      gasLimitMultiplier: this.args.gasMultiplier || parseFloat(process.env.GAS_LIMIT_MULTIPLIER || '1.2'),
      maxRetries: this.args.maxRetries || parseInt(process.env.MAX_RETRIES || '3'),
      retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '2000'),
      batchSize: this.args.batchSize || parseInt(process.env.BATCH_SIZE || '50'),
      dryRun: this.args.dryRun || false
    };
  }

  /**
   * Prompt user for confirmation
   */
  private async promptConfirmation(message: string): Promise<boolean> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(`${message} (y/N): `, (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Load recipients from file
   */
  private async loadRecipients(): Promise<BatchRecipient[]> {
    try {
      const fileContent = fs.readFileSync(this.args.input, 'utf8');
      const rawRecipients = JSON.parse(fileContent);
      
      if (!Array.isArray(rawRecipients)) {
        throw new Error('JSON file must contain an array of recipients');
      }

      // Convert to BatchRecipient format, handling both 'amount' and 'value' fields
      const recipients: BatchRecipient[] = rawRecipients.map((item: any) => {
        // Handle both 'amount' and 'value' field names
        const amount = item.amount || item.value;
        if (amount === undefined || amount === null) {
          throw new Error(`Recipient missing amount/value field: ${JSON.stringify(item)}`);
        }
        
        return {
          address: item.address,
          amount: amount.toString() // Ensure it's a string
        };
      });

      return recipients;
    } catch (error) {
      console.error(`❌ Error loading recipients: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }

  /**
   * Main execution method
   */
  async run(): Promise<void> {
    try {
      console.log('🚀 Batch Token Sender for Polygon Network');
      console.log('═══════════════════════════════════════');

      // Validate arguments
      this.validateArguments();

      // Get configuration
      const config = this.getConfig();
      
      // Load recipients
      const recipients = await this.loadRecipients();
      
      console.log(`📋 Loaded ${recipients.length} recipients from ${this.args.input}`);
      console.log(`🎯 Token Contract: ${config.tokenContract}`);
      console.log(`🔗 RPC URL: ${config.rpcUrl}`);
      console.log(`📦 Batch Size: ${config.batchSize}`);
      console.log(`🔄 Max Retries: ${config.maxRetries}`);
      console.log(`⛽ Gas Multiplier: ${config.gasLimitMultiplier}`);

      if (config.dryRun) {
        console.log(`🔍 DRY RUN MODE - No actual transactions will be sent`);
      }

      // Initialize services
      const batchSender = new BatchTokenSender(config);
      const reportManager = new BatchReportManager(this.args.outputDir);

      // Pre-flight checks
      console.log('\n🔍 Running pre-flight checks...');
      
      const tokenInfo = await batchSender.getTokenInfo();
      console.log(`✅ Token Info: ${tokenInfo.name} (${tokenInfo.symbol}) - ${tokenInfo.decimals} decimals`);
      
      const balanceCheck = await batchSender.checkBalances(recipients);
      console.log(`💰 Token Balance: ${balanceCheck.tokenBalance} ${tokenInfo.symbol}`);
      console.log(`💰 MATIC Balance: ${balanceCheck.maticBalance} MATIC`);
      console.log(`⛽ Estimated Gas Cost: ${balanceCheck.estimatedGasCost} MATIC`);

      if (!balanceCheck.sufficientToken) {
        console.error(`❌ Insufficient token balance!`);
        console.error(`   Required: ${recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0)} ${tokenInfo.symbol}`);
        console.error(`   Available: ${balanceCheck.tokenBalance} ${tokenInfo.symbol}`);
        process.exit(1);
      }

      if (!balanceCheck.sufficientMatic) {
        console.error(`❌ Insufficient MATIC balance for gas!`);
        console.error(`   Required: ${balanceCheck.estimatedGasCost} MATIC`);
        console.error(`   Available: ${balanceCheck.maticBalance} MATIC`);
        process.exit(1);
      }

      // Confirmation prompt
      if (!config.dryRun) {
        const confirmed = await this.promptConfirmation('\n⚠️  Are you sure you want to proceed with the batch transfer?');
        if (!confirmed) {
          console.log('❌ Batch transfer cancelled by user');
          process.exit(0);
        }
      }

      // Execute batch transfers with comprehensive error handling
      console.log(`\n🚀 Starting batch transfers...`);
      let results: TransferResult[] = [];
      let report: BatchReport | null = null;
      
      try {
        results = await batchSender.executeBatchTransfers(recipients);
      } catch (error) {
        console.error(`\n❌ Batch transfer execution failed: ${error instanceof Error ? error.message : String(error)}`);
        console.log(`\n🔄 Attempting to generate partial report with completed transfers...`);
        
        // Try to get partial results if any transfers completed
        if (results.length === 0) {
          console.log(`⚠️  No transfers completed before failure.`);
          process.exit(1);
        }
      }

      // Always generate and save report, even if there were errors
      try {
        console.log(`\n📊 Generating report...`);
        report = reportManager.generateReport(results, config, tokenInfo);
        
        const reportPath = await reportManager.saveReport(report);
        console.log(`📄 Report saved to: ${reportPath}`);

        // Display summary
        console.log(`\n📈 Summary:`);
        console.log(`  ✅ Successful: ${report.summary.successful}`);
        console.log(`  ❌ Failed: ${report.summary.failed}`);
        console.log(`  💰 Total sent: ${report.summary.totalAmountSent} ${tokenInfo.symbol}`);
        console.log(`  ⛽ Gas cost: ${report.summary.totalGasCostMatic} MATIC`);

        if (report.summary.failed > 0) {
          console.log(`\n⚠️  ${report.summary.failed} transfers failed. Check the report for details.`);
          
          // Save failed transfers for retry
          const failedPath = await reportManager.saveFailedTransfers(report.failed, config.tokenContract);
          console.log(`📄 Failed transfers saved to: ${failedPath}`);
        }

        console.log(`\n🎉 Batch transfer completed!`);
      } catch (reportError) {
        console.error(`\n❌ Failed to generate report: ${reportError instanceof Error ? reportError.message : String(reportError)}`);
        console.log(`\n📊 Manual Summary:`);
        console.log(`  📝 Total transfers attempted: ${results.length}`);
        console.log(`  ✅ Successful: ${results.filter(r => r.status === 'success').length}`);
        console.log(`  ❌ Failed: ${results.filter(r => r.status === 'failed').length}`);
        process.exit(1);
      }

    } catch (error) {
      console.error(`❌ Batch transfer failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  const cli = new BatchSenderCLI();
  
  // Handle process termination gracefully
  process.on('SIGINT', () => {
    console.log('\n\n⚠️  Process interrupted. Attempting to save partial results...');
    process.exit(1);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\n⚠️  Process terminated. Attempting to save partial results...');
    process.exit(1);
  });
  
  cli.run().catch((error) => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

export { BatchSenderCLI };
