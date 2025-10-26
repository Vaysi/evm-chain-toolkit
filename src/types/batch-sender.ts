// Types for batch token sender functionality

export interface BatchRecipient {
  address: string;
  amount: string; // Readable amount like "100.5"
}

export interface BatchConfig {
  tokenContract: string;
  privateKey: string;
  rpcUrl: string;
  gasLimitMultiplier?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  batchSize?: number;
  dryRun?: boolean;
}

export interface TransferResult {
  recipient: string;
  amount: string;
  status: 'success' | 'failed';
  txHash?: string;
  blockNumber?: number;
  gasUsed?: string;
  gasCostMatic?: string;
  timestamp?: string;
  error?: string;
  attempts?: number;
}

export interface BatchReport {
  summary: {
    totalRecipients: number;
    successful: number;
    failed: number;
    totalAmountSent: string;
    totalGasCostMatic: string;
    tokenContract: string;
    senderAddress: string;
    tokenSymbol?: string;
    tokenDecimals?: number;
    timestamp: string;
    processingTimeMs: number;
  };
  transfers: TransferResult[];
  failed: TransferResult[];
  metadata: {
    gasPriceGwei: string;
    averageGasPerTransfer: string;
    network: string;
    dryRun: boolean;
  };
}

export interface TokenInfo {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  totalSupply: string;
}

export interface BalanceCheck {
  maticBalance: string;
  tokenBalance: string;
  sufficientMatic: boolean;
  sufficientToken: boolean;
  estimatedGasCost: string;
}

export interface GasEstimate {
  gasLimit: string;
  gasPrice: string;
  gasCostMatic: string;
  priorityFee?: string;
  maxFeePerGas?: string;
}

export interface BatchSenderOptions {
  confirmBeforeSend?: boolean;
  saveReport?: boolean;
  outputDir?: string;
  customFilename?: string;
}
