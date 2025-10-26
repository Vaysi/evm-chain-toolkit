import * as fs from 'fs/promises';
import * as path from 'path';
import { FilterResult, OutputConfig } from '../types';

export class OutputManager {
  private config: OutputConfig;

  constructor(config: OutputConfig) {
    this.config = config;
  }

  /**
   * Save filter results to JSON file
   */
  async saveResults(result: FilterResult, customFilename?: string): Promise<string> {
    // Ensure output directory exists
    await this.ensureOutputDirectory();

    // Generate filename
    const filename = customFilename || this.generateFilename(result);
    const filePath = path.join(this.config.outputDir, filename);

    // Prepare data for output
    const outputData = {
      ...result,
      // Convert Maps to objects for JSON serialization
      transactions: result.transactions.map(tx => ({
        ...tx,
        tokenMetadata: tx.tokenMetadata ? Object.fromEntries(tx.tokenMetadata) : undefined
      }))
    };

    // Write file
    const jsonString = this.config.prettyPrint 
      ? JSON.stringify(outputData, null, 2)
      : JSON.stringify(outputData);

    await fs.writeFile(filePath, jsonString, 'utf8');

    console.log(`Results saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Generate filename based on result data
   */
  private generateFilename(result: FilterResult): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const walletShort = result.summary.walletAddress.slice(0, 8);
    const dateRange = `${result.summary.dateRange.start.split('T')[0]}_to_${result.summary.dateRange.end.split('T')[0]}`;
    
    return `evm_transactions_${walletShort}_${dateRange}_${timestamp}.json`;
  }

  /**
   * Ensure output directory exists
   */
  private async ensureOutputDirectory(): Promise<void> {
    try {
      await fs.access(this.config.outputDir);
    } catch {
      await fs.mkdir(this.config.outputDir, { recursive: true });
    }
  }

  /**
   * Save wallet summary report
   */
  async saveWalletSummaryReport(result: FilterResult, customFilename?: string): Promise<string> {
    await this.ensureOutputDirectory();

    const filename = customFilename || `wallet_summary_${this.generateFilename(result)}`;
    const filePath = path.join(this.config.outputDir, filename);

    const walletSummary = {
      generatedAt: result.metadata.generatedAt,
      processingTimeMs: result.metadata.processingTimeMs,
      apiCalls: result.metadata.apiCalls,
      dateRange: result.summary.dateRange,
      wallets: this.generateWalletSummary(result)
    };

    const jsonString = this.config.prettyPrint 
      ? JSON.stringify(walletSummary, null, 2)
      : JSON.stringify(walletSummary);

    await fs.writeFile(filePath, jsonString, 'utf8');

    console.log(`Wallet summary report saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Save summary report
   */
  async saveSummaryReport(result: FilterResult, customFilename?: string): Promise<string> {
    await this.ensureOutputDirectory();

    const filename = customFilename || `summary_${this.generateFilename(result)}`;
    const filePath = path.join(this.config.outputDir, filename);

    const summaryReport = {
      generatedAt: result.metadata.generatedAt,
      processingTimeMs: result.metadata.processingTimeMs,
      apiCalls: result.metadata.apiCalls,
      summary: result.summary,
      tokenSummary: this.generateTokenSummary(result),
      transactionSummary: this.generateTransactionSummary(result)
    };

    const jsonString = this.config.prettyPrint 
      ? JSON.stringify(summaryReport, null, 2)
      : JSON.stringify(summaryReport);

    await fs.writeFile(filePath, jsonString, 'utf8');

    console.log(`Summary report saved to: ${filePath}`);
    return filePath;
  }

  /**
   * Generate wallet summary
   */
  private generateWalletSummary(result: FilterResult): any {
    const walletMap = new Map<string, {
      address: string;
      transactionCount: number;
      transactions: any[];
      tokenTransfers: Map<string, {
        contractAddress: string;
        tokenSymbol: string;
        tokenName: string;
        decimals: number;
        totalValue: string;
        formattedValue: string;
        transferCount: number;
      }>;
    }>();

    // Process all transactions
    for (const txResult of result.transactions) {
      const tx = txResult.transaction;
      
      // Count transactions for each wallet (from and to)
      const wallets = [tx.from, tx.to].filter(addr => addr && addr !== '0x0000000000000000000000000000000000000000');
      
      for (const wallet of wallets) {
        if (!walletMap.has(wallet)) {
          walletMap.set(wallet, {
            address: wallet,
            transactionCount: 0,
            transactions: [],
            tokenTransfers: new Map()
          });
        }
        
        const walletData = walletMap.get(wallet)!;
        walletData.transactionCount++;
        
        // Add transaction details
        walletData.transactions.push({
          hash: tx.hash,
          blockNumber: tx.blockNumber,
          timeStamp: tx.timeStamp,
          from: tx.from,
          to: tx.to,
          value: tx.value,
          gas: tx.gas,
          gasPrice: tx.gasPrice,
          gasUsed: tx.gasUsed,
          isError: tx.isError,
          txreceipt_status: tx.txreceipt_status,
          methodId: tx.methodId,
          functionName: tx.functionName,
          tokenTransfers: txResult.tokenTransfers || []
        });
      }

      // Process token transfers
      if (txResult.tokenTransfers) {
        for (const transfer of txResult.tokenTransfers) {
          const contractAddress = transfer.contractAddress;
          const decimals = parseInt(transfer.tokenMetadata?.decimals || '18');
          const symbol = transfer.tokenMetadata?.symbol || 'UNKNOWN';
          const name = transfer.tokenMetadata?.name || 'Unknown Token';
          
          // Process both from and to wallets
          const transferWallets = [transfer.from, transfer.to].filter(addr => 
            addr && addr !== '0x0000000000000000000000000000000000000000'
          );
          
          for (const wallet of transferWallets) {
            if (!walletMap.has(wallet)) {
              walletMap.set(wallet, {
                address: wallet,
                transactionCount: 0,
                transactions: [],
                tokenTransfers: new Map()
              });
            }
            
            const walletData = walletMap.get(wallet)!;
            
            if (!walletData.tokenTransfers.has(contractAddress)) {
              walletData.tokenTransfers.set(contractAddress, {
                contractAddress,
                tokenSymbol: symbol,
                tokenName: name,
                decimals,
                totalValue: '0',
                formattedValue: '0',
                transferCount: 0
              });
            }
            
            const tokenData = walletData.tokenTransfers.get(contractAddress)!;
            tokenData.transferCount++;
            
            if (transfer.value) {
              const currentValue = BigInt(tokenData.totalValue);
              const transferValue = BigInt(transfer.value);
              const newValue = currentValue + transferValue;
              tokenData.totalValue = newValue.toString();
              
              // Format value by removing decimals
              const formattedValue = this.formatTokenValue(newValue.toString(), decimals);
              tokenData.formattedValue = formattedValue;
            }
          }
        }
      }
    }

    // Convert to array format
    const walletSummary = Array.from(walletMap.values()).map(wallet => ({
      address: wallet.address,
      transactionCount: wallet.transactionCount,
      transactions: wallet.transactions,
      tokenTransfers: Array.from(wallet.tokenTransfers.values()).map(token => ({
        contractAddress: token.contractAddress,
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        decimals: token.decimals,
        totalValue: token.totalValue,
        formattedValue: token.formattedValue,
        transferCount: token.transferCount
      }))
    }));

    // Sort by transaction count (descending)
    walletSummary.sort((a, b) => b.transactionCount - a.transactionCount);

    return {
      totalWallets: walletSummary.length,
      wallets: walletSummary
    };
  }

  /**
   * Format token value by removing decimals
   */
  private formatTokenValue(value: string, decimals: number): string {
    const valueBigInt = BigInt(value);
    const divisor = BigInt(10 ** decimals);
    
    const wholePart = valueBigInt / divisor;
    const remainder = valueBigInt % divisor;
    
    if (remainder === BigInt(0)) {
      return wholePart.toString();
    } else {
      // Include decimal places if there's a remainder
      const remainderStr = remainder.toString().padStart(decimals, '0');
      const trimmedRemainder = remainderStr.replace(/0+$/, '');
      
      if (trimmedRemainder === '') {
        return wholePart.toString();
      } else {
        return `${wholePart}.${trimmedRemainder}`;
      }
    }
  }

  /**
   * Generate token summary
   */
  private generateTokenSummary(result: FilterResult): any {
    const tokenCounts = new Map<string, number>();
    const tokenValues = new Map<string, { value: string; decimals: number; symbol: string }>();

    for (const tx of result.transactions) {
      if (tx.tokenTransfers) {
        for (const transfer of tx.tokenTransfers) {
          const contractAddress = transfer.contractAddress;
          
          // Count transfers
          tokenCounts.set(contractAddress, (tokenCounts.get(contractAddress) || 0) + 1);
          
          // Sum values for ERC-20 tokens
          if (transfer.standard === 'ERC20' && transfer.value && transfer.tokenMetadata) {
            const decimals = parseInt(transfer.tokenMetadata.decimals) || 0;
            const symbol = transfer.tokenMetadata.symbol || 'UNKNOWN';
            
            if (!tokenValues.has(contractAddress)) {
              tokenValues.set(contractAddress, { value: '0', decimals, symbol });
            }
            
            const current = tokenValues.get(contractAddress)!;
            const currentValue = BigInt(current.value);
            const transferValue = BigInt(transfer.value);
            const newValue = currentValue + transferValue;
            
            tokenValues.set(contractAddress, {
              value: newValue.toString(),
              decimals,
              symbol
            });
          }
        }
      }
    }

    return {
      uniqueTokens: result.summary.uniqueTokens,
      tokenCounts: Object.fromEntries(tokenCounts),
      tokenValues: Object.fromEntries(tokenValues),
      erc20Transfers: result.summary.totalTokenTransfers,
      erc721Transfers: result.summary.totalERC721Transfers,
      erc1155Transfers: result.summary.totalERC1155Transfers
    };
  }

  /**
   * Generate transaction summary
   */
  private generateTransactionSummary(result: FilterResult): any {
    const gasUsed = result.transactions.reduce((sum, tx) => {
      return sum + parseInt(tx.transaction.gasUsed || '0');
    }, 0);

    const totalValue = result.transactions.reduce((sum, tx) => {
      return sum + parseInt(tx.transaction.value || '0');
    }, 0);

    const errorCount = result.transactions.filter(tx => tx.transaction.isError === '1').length;

    return {
      totalTransactions: result.summary.totalTransactions,
      totalInternalTransactions: result.summary.totalInternalTransactions,
      totalGasUsed: gasUsed.toString(),
      totalValueWei: totalValue.toString(),
      totalValueEth: (totalValue / Math.pow(10, 18)).toFixed(6),
      errorCount,
      successRate: ((result.summary.totalTransactions - errorCount) / result.summary.totalTransactions * 100).toFixed(2) + '%'
    };
  }

  /**
   * Save raw data (without processing)
   */
  async saveRawData(data: any, filename: string): Promise<string> {
    await this.ensureOutputDirectory();
    const filePath = path.join(this.config.outputDir, filename);

    const jsonString = this.config.prettyPrint 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    await fs.writeFile(filePath, jsonString, 'utf8');

    console.log(`Raw data saved to: ${filePath}`);
    return filePath;
  }

  /**
   * List existing output files
   */
  async listOutputFiles(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.config.outputDir);
      return files.filter(file => file.endsWith('.json'));
    } catch {
      return [];
    }
  }

  /**
   * Delete output file
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.config.outputDir, filename);
    await fs.unlink(filePath);
    console.log(`Deleted file: ${filePath}`);
  }

  /**
   * Clear all output files
   */
  async clearOutput(): Promise<void> {
    const files = await this.listOutputFiles();
    for (const file of files) {
      await this.deleteFile(file);
    }
    console.log(`Cleared ${files.length} output files`);
  }

  /**
   * Create default output configuration
   */
  static createDefaultConfig(): OutputConfig {
    return {
      outputDir: './output',
      prettyPrint: true
    };
  }
}
