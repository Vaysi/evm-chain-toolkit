import { 
  TransactionFilter, 
  FilteredTransactionResult, 
  FilterResult,
  Transaction,
  InternalTransaction,
  TokenTransfer,
  ERC721Transfer,
  ERC1155Transfer,
  ParsedTokenTransfer
} from '../types';
import { EtherscanClient } from '../api/etherscan';
import { TokenParser } from './token-parser';

export class TransactionFilterService {
  private etherscanClient: EtherscanClient;
  private tokenParser: TokenParser;

  constructor(etherscanClient: EtherscanClient) {
    this.etherscanClient = etherscanClient;
    this.tokenParser = new TokenParser(etherscanClient);
  }

  /**
   * Filter transactions based on criteria
   */
  async filterTransactions(filter: TransactionFilter): Promise<FilterResult> {
    const startTime = Date.now();
    const startTimestamp = Math.floor(filter.startDate.getTime() / 1000);
    const endTimestamp = Math.floor(filter.endDate.getTime() / 1000);

    console.log(`Filtering transactions for ${filter.address} from ${filter.startDate.toISOString()} to ${filter.endDate.toISOString()}`);

    // For now, we'll use a broad block range and filter by timestamp in the results
    // This avoids the getblocknobytime API which might not be available
    const startBlock = 0; // Start from genesis
    const endBlock = 99999999; // Go to latest

    console.log(`Using block range: ${startBlock} to ${endBlock} (will filter by timestamp)`);

    // Fetch all data in parallel
    const [
      transactions,
      internalTransactions,
      tokenTransfers,
      erc721Transfers,
      erc1155Transfers
    ] = await Promise.all([
      this.fetchAllTransactions(filter.address, startBlock, endBlock),
      filter.includeInternal ? this.fetchAllInternalTransactions(filter.address, startBlock, endBlock) : Promise.resolve([]),
      filter.includeTokenTransfers ? this.fetchAllTokenTransfers(filter.address, startBlock, endBlock) : Promise.resolve([]),
      filter.includeERC721 ? this.fetchAllERC721Transfers(filter.address, startBlock, endBlock) : Promise.resolve([]),
      filter.includeERC1155 ? this.fetchAllERC1155Transfers(filter.address, startBlock, endBlock) : Promise.resolve([])
    ]);

    // Filter by timestamp
    const filteredTransactions = transactions.filter(tx => {
      const txTimestamp = parseInt(tx.timeStamp);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    const filteredInternalTransactions = internalTransactions.filter(tx => {
      const txTimestamp = parseInt(tx.timeStamp);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    const filteredTokenTransfers = tokenTransfers.filter(tx => {
      const txTimestamp = parseInt(tx.timeStamp);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    const filteredERC721Transfers = erc721Transfers.filter(tx => {
      const txTimestamp = parseInt(tx.timeStamp);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    const filteredERC1155Transfers = erc1155Transfers.filter(tx => {
      const txTimestamp = parseInt(tx.timeStamp);
      return txTimestamp >= startTimestamp && txTimestamp <= endTimestamp;
    });

    // Apply incoming/outgoing filters
    const finalFilteredTransactions = this.applyDirectionFilter(filteredTransactions, filter);
    const finalFilteredInternalTransactions = this.applyDirectionFilter(filteredInternalTransactions, filter);
    const finalFilteredTokenTransfers = this.applyDirectionFilter(filteredTokenTransfers, filter);
    const finalFilteredERC721Transfers = this.applyDirectionFilter(filteredERC721Transfers, filter);
    const finalFilteredERC1155Transfers = this.applyDirectionFilter(filteredERC1155Transfers, filter);

    console.log(`Found ${finalFilteredTransactions.length} transactions, ${finalFilteredInternalTransactions.length} internal transactions, ${finalFilteredTokenTransfers.length} token transfers, ${finalFilteredERC721Transfers.length} ERC721 transfers, ${finalFilteredERC1155Transfers.length} ERC1155 transfers`);

    // Parse token transfers
    const parsedTokenTransfers = await this.tokenParser.parseAllTokenTransfers(
      finalFilteredTokenTransfers,
      finalFilteredERC721Transfers,
      finalFilteredERC1155Transfers,
      true
    );

    // Group transfers by transaction hash
    const transfersByTxHash = this.groupTransfersByTransactionHash(parsedTokenTransfers);
    const internalByTxHash = this.groupInternalTransactionsByHash(finalFilteredInternalTransactions);

    // Create filtered results
    const filteredResults: FilteredTransactionResult[] = finalFilteredTransactions.map(tx => ({
      transaction: tx,
      internalTransactions: internalByTxHash.get(tx.hash) || [],
      tokenTransfers: transfersByTxHash.get(tx.hash) || [],
      erc721Transfers: [],
      erc1155Transfers: [],
      tokenMetadata: new Map()
    }));

    // Calculate summary statistics
    const uniqueTokens = this.tokenParser.getUniqueTokens(parsedTokenTransfers);
    const totalValueByToken = this.tokenParser.calculateTotalValue(parsedTokenTransfers);

    const processingTime = Date.now() - startTime;
    const apiCalls = this.etherscanClient.getApiCallCount();

    const result: FilterResult = {
      transactions: filteredResults,
      summary: {
        totalTransactions: finalFilteredTransactions.length,
        totalInternalTransactions: finalFilteredInternalTransactions.length,
        totalTokenTransfers: finalFilteredTokenTransfers.length,
        totalERC721Transfers: finalFilteredERC721Transfers.length,
        totalERC1155Transfers: finalFilteredERC1155Transfers.length,
        uniqueTokens: uniqueTokens.length,
        dateRange: {
          start: filter.startDate.toISOString(),
          end: filter.endDate.toISOString()
        },
        walletAddress: filter.address
      },
      metadata: {
        generatedAt: new Date().toISOString(),
        apiCalls,
        processingTimeMs: processingTime
      }
    };

    console.log(`Filtering completed in ${processingTime}ms with ${apiCalls} API calls`);
    return result;
  }

  /**
   * Apply direction filter (incoming/outgoing)
   */
  private applyDirectionFilter<T extends { from: string; to: string }>(
    items: T[],
    filter: TransactionFilter
  ): T[] {
    if (!filter.incomingOnly && !filter.outgoingOnly) {
      return items;
    }

    return items.filter(item => {
      if (filter.incomingOnly) {
        // Only include items where tokens are sent TO the wallet
        return item.to.toLowerCase() === filter.address.toLowerCase();
      }
      
      if (filter.outgoingOnly) {
        // Only include items where tokens are sent FROM the wallet
        return item.from.toLowerCase() === filter.address.toLowerCase();
      }
      
      return true;
    });
  }

  /**
   * Fetch all transactions with pagination
   */
  private async fetchAllTransactions(address: string, startBlock: number, endBlock: number): Promise<Transaction[]> {
    const allTransactions: Transaction[] = [];
    let page = 1;
    const offset = 10000;

    while (true) {
      const transactions = await this.etherscanClient.getTransactions(
        address,
        startBlock,
        endBlock,
        page,
        offset,
        'desc'
      );

      if (transactions.length === 0) {
        break;
      }

      allTransactions.push(...transactions);
      
      if (transactions.length < offset) {
        break;
      }

      page++;
    }

    return allTransactions;
  }

  /**
   * Fetch all internal transactions with pagination
   */
  private async fetchAllInternalTransactions(address: string, startBlock: number, endBlock: number): Promise<InternalTransaction[]> {
    const allTransactions: InternalTransaction[] = [];
    let page = 1;
    const offset = 10000;

    while (true) {
      const transactions = await this.etherscanClient.getInternalTransactions(
        address,
        startBlock,
        endBlock,
        page,
        offset,
        'desc'
      );

      if (transactions.length === 0) {
        break;
      }

      allTransactions.push(...transactions);
      
      if (transactions.length < offset) {
        break;
      }

      page++;
    }

    return allTransactions;
  }

  /**
   * Fetch all token transfers with pagination
   */
  private async fetchAllTokenTransfers(address: string, startBlock: number, endBlock: number): Promise<TokenTransfer[]> {
    const allTransfers: TokenTransfer[] = [];
    let page = 1;
    const offset = 10000;

    while (true) {
      const transfers = await this.etherscanClient.getTokenTransfers(
        address,
        undefined,
        startBlock,
        endBlock,
        page,
        offset,
        'desc'
      );

      if (transfers.length === 0) {
        break;
      }

      allTransfers.push(...transfers);
      
      if (transfers.length < offset) {
        break;
      }

      page++;
    }

    return allTransfers;
  }

  /**
   * Fetch all ERC721 transfers with pagination
   */
  private async fetchAllERC721Transfers(address: string, startBlock: number, endBlock: number): Promise<ERC721Transfer[]> {
    const allTransfers: ERC721Transfer[] = [];
    let page = 1;
    const offset = 10000;

    while (true) {
      const transfers = await this.etherscanClient.getERC721Transfers(
        address,
        undefined,
        startBlock,
        endBlock,
        page,
        offset,
        'desc'
      );

      if (transfers.length === 0) {
        break;
      }

      allTransfers.push(...transfers);
      
      if (transfers.length < offset) {
        break;
      }

      page++;
    }

    return allTransfers;
  }

  /**
   * Fetch all ERC1155 transfers with pagination
   */
  private async fetchAllERC1155Transfers(address: string, startBlock: number, endBlock: number): Promise<ERC1155Transfer[]> {
    const allTransfers: ERC1155Transfer[] = [];
    let page = 1;
    const offset = 10000;

    while (true) {
      const transfers = await this.etherscanClient.getERC1155Transfers(
        address,
        undefined,
        startBlock,
        endBlock,
        page,
        offset,
        'desc'
      );

      if (transfers.length === 0) {
        break;
      }

      allTransfers.push(...transfers);
      
      if (transfers.length < offset) {
        break;
      }

      page++;
    }

    return allTransfers;
  }

  /**
   * Group token transfers by transaction hash
   */
  private groupTransfersByTransactionHash(transfers: ParsedTokenTransfer[]): Map<string, ParsedTokenTransfer[]> {
    const grouped = new Map<string, ParsedTokenTransfer[]>();

    for (const transfer of transfers) {
      const txHash = transfer.transactionHash;
      if (!grouped.has(txHash)) {
        grouped.set(txHash, []);
      }
      grouped.get(txHash)!.push(transfer);
    }

    return grouped;
  }

  /**
   * Group internal transactions by transaction hash
   */
  private groupInternalTransactionsByHash(transactions: InternalTransaction[]): Map<string, InternalTransaction[]> {
    const grouped = new Map<string, InternalTransaction[]>();

    for (const tx of transactions) {
      const txHash = tx.hash;
      if (!grouped.has(txHash)) {
        grouped.set(txHash, []);
      }
      grouped.get(txHash)!.push(tx);
    }

    return grouped;
  }

  /**
   * Wait for all API requests to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.etherscanClient.waitForCompletion();
  }

  /**
   * Get API call count
   */
  getApiCallCount(): number {
    return this.etherscanClient.getApiCallCount();
  }

  /**
   * Reset API call count
   */
  resetApiCallCount(): void {
    this.etherscanClient.resetApiCallCount();
  }
}
