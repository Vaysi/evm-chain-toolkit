// Main library exports
export * from './types';
export { EtherscanClient } from './api/etherscan';
export { RetryUtil, RetryError } from './utils/retry';
export { RequestQueue } from './utils/queue';
export { TokenParser } from './services/token-parser';
export { TransactionFilterService } from './services/transaction-filter';
export { OutputManager } from './services/output-manager';

// Main service class that combines everything
import { 
  ApiConfig, 
  TransactionFilter, 
  FilterResult, 
  OutputConfig,
  RetryConfig,
  QueueConfig
} from './types';
import { EtherscanClient } from './api/etherscan';
import { TransactionFilterService } from './services/transaction-filter';
import { OutputManager } from './services/output-manager';
import { RetryUtil } from './utils/retry';
import { RequestQueue } from './utils/queue';

export class EVMTransactionFilter {
  private etherscanClient: EtherscanClient;
  private transactionFilter: TransactionFilterService;
  private outputManager: OutputManager;

  constructor(apiKey: string, config?: {
    retryConfig?: Partial<RetryConfig>;
    queueConfig?: Partial<QueueConfig>;
    outputConfig?: Partial<OutputConfig>;
  }) {
    const retryConfig: RetryConfig = {
      ...RetryUtil.createDefaultConfig(),
      ...config?.retryConfig
    };

    const queueConfig: QueueConfig = {
      ...RequestQueue.createDefaultConfig(),
      ...config?.queueConfig
    };

    const outputConfig: OutputConfig = {
      ...OutputManager.createDefaultConfig(),
      ...config?.outputConfig
    };

    const apiConfig: ApiConfig = {
      apiKey,
      baseUrl: 'https://api.etherscan.io/v2/api',
      retryConfig,
      queueConfig
    };

    this.etherscanClient = new EtherscanClient(apiConfig);
    this.transactionFilter = new TransactionFilterService(this.etherscanClient);
    this.outputManager = new OutputManager(outputConfig);
  }

  /**
   * Filter transactions and save results
   */
  async filterAndSave(
    filter: TransactionFilter,
    options?: {
      saveResults?: boolean;
      saveSummary?: boolean;
      saveWalletSummary?: boolean;
      customFilename?: string;
    }
  ): Promise<{
    result: FilterResult;
    files: string[];
  }> {
    const result = await this.transactionFilter.filterTransactions(filter);
    const files: string[] = [];

    if (options?.saveResults !== false) {
      const resultFile = await this.outputManager.saveResults(result, options?.customFilename);
      files.push(resultFile);
    }

    if (options?.saveSummary !== false) {
      const summaryFile = await this.outputManager.saveSummaryReport(result);
      files.push(summaryFile);
    }

    if (options?.saveWalletSummary !== false) {
      const walletSummaryFile = await this.outputManager.saveWalletSummaryReport(result);
      files.push(walletSummaryFile);
    }

    return { result, files };
  }

  /**
   * Get API call count
   */
  getApiCallCount(): number {
    return this.transactionFilter.getApiCallCount();
  }

  /**
   * Reset API call count
   */
  resetApiCallCount(): void {
    this.transactionFilter.resetApiCallCount();
  }

  /**
   * Wait for all requests to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.transactionFilter.waitForCompletion();
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.etherscanClient.destroy();
  }
}
