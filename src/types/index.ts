// Core types for Polygon transaction filtering

export interface Transaction {
  hash: string;
  blockNumber: string;
  timeStamp: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  gas: string;
  gasPrice: string;
  isError: string;
  txreceipt_status: string;
  input: string;
  contractAddress: string;
  cumulativeGasUsed: string;
  gasUsed: string;
  confirmations: string;
  methodId: string;
  functionName: string;
}

export interface InternalTransaction {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  from: string;
  to: string;
  value: string;
  contractAddress: string;
  input: string;
  type: string;
  gas: string;
  gasUsed: string;
  traceId: string;
  isError: string;
  errCode: string;
}

export interface TokenTransfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  transactionIndex: string;
  from: string;
  to: string;
  value: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  contractAddress: string;
}

export interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: string;
  totalSupply: string;
  owner: string;
  txsCount: string;
  transfersCount: string;
  lastUpdated: string;
}

export interface ERC721Transfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  to: string;
  tokenID: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  contractAddress: string;
}

export interface ERC1155Transfer {
  blockNumber: string;
  timeStamp: string;
  hash: string;
  nonce: string;
  blockHash: string;
  from: string;
  to: string;
  tokenID: string;
  tokenValue: string;
  tokenName: string;
  tokenSymbol: string;
  transactionIndex: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  cumulativeGasUsed: string;
  input: string;
  contractAddress: string;
}

export interface TransactionFilter {
  address: string;
  startDate: Date;
  endDate: Date;
  includeInternal?: boolean;
  includeTokenTransfers?: boolean;
  includeERC721?: boolean;
  includeERC1155?: boolean;
  toAddress?: string; // Filter transactions sent TO this address
  fromAddress?: string; // Filter transactions sent FROM this address
  incomingOnly?: boolean; // Only show incoming transactions (tokens sent TO the wallet)
  outgoingOnly?: boolean; // Only show outgoing transactions (tokens sent FROM the wallet)
}

export interface EtherscanResponse<T> {
  status: string;
  message: string;
  result: T;
}

export interface FilteredTransactionResult {
  transaction: Transaction;
  internalTransactions?: InternalTransaction[];
  tokenTransfers?: ParsedTokenTransfer[];
  erc721Transfers?: ERC721Transfer[];
  erc1155Transfers?: ERC1155Transfer[];
  tokenMetadata?: Map<string, TokenInfo>;
}

export interface FilterResult {
  transactions: FilteredTransactionResult[];
  summary: {
    totalTransactions: number;
    totalInternalTransactions: number;
    totalTokenTransfers: number;
    totalERC721Transfers: number;
    totalERC1155Transfers: number;
    uniqueTokens: number;
    dateRange: {
      start: string;
      end: string;
    };
    walletAddress: string;
  };
  metadata: {
    generatedAt: string;
    apiCalls: number;
    processingTimeMs: number;
  };
}

export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface QueueConfig {
  maxConcurrent: number;
  rateLimitPerSecond: number;
}

export interface ApiConfig {
  apiKey: string;
  baseUrl: string;
  retryConfig: RetryConfig;
  queueConfig: QueueConfig;
}

export interface OutputConfig {
  outputDir: string;
  filename?: string;
  prettyPrint: boolean;
}

export type TokenStandard = 'ERC20' | 'ERC721' | 'ERC1155';

export interface ParsedTokenTransfer {
  standard: TokenStandard;
  contractAddress: string;
  from: string;
  to: string;
  value?: string;
  tokenId?: string;
  tokenMetadata?: TokenInfo;
  transactionHash: string;
  blockNumber: string;
  timestamp: string;
}
