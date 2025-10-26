import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';
import { 
  BatchRecipient, 
  BatchConfig, 
  TransferResult, 
  BatchReport, 
  TokenInfo, 
  BalanceCheck, 
  GasEstimate,
  BatchSenderOptions 
} from '../types/batch-sender';
import { RetryUtil } from '../utils/retry';

// ERC-20 ABI for token transfers
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function totalSupply() view returns (uint256)'
];

export class BatchTokenSender {
  private provider: ethers.Provider;
  private wallet: ethers.Wallet;
  private tokenContract: ethers.Contract;
  private config: BatchConfig;
  private tokenInfo: TokenInfo | null = null;

  constructor(config: BatchConfig) {
    this.config = {
      gasLimitMultiplier: 1.2,
      maxRetries: 3,
      retryDelayMs: 2000,
      batchSize: 10, // Reduced batch size to avoid rate limits
      dryRun: false,
      ...config
    };

    // Initialize provider and wallet
    this.provider = new ethers.JsonRpcProvider(this.config.rpcUrl);
    this.wallet = new ethers.Wallet(this.config.privateKey, this.provider);
    this.tokenContract = new ethers.Contract(this.config.tokenContract, ERC20_ABI, this.wallet);
  }

  /**
   * Load recipients from JSON file
   */
  async loadRecipientsFromJson(filepath: string): Promise<BatchRecipient[]> {
    try {
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const rawRecipients = JSON.parse(fileContent);
      
      if (!Array.isArray(rawRecipients)) {
        throw new Error('JSON file must contain an array of recipients');
      }

      // Convert to BatchRecipient format, handling both 'amount' and 'value' fields
      const recipients: BatchRecipient[] = rawRecipients.map((item: any, index: number) => {
        // Debug logging
        console.log(`🔍 Debug item ${index}:`, JSON.stringify(item));
        
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

      return this.validateRecipients(recipients);
    } catch (error) {
      throw new Error(`Failed to load recipients from ${filepath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Validate recipient addresses and amounts
   */
  validateRecipients(recipients: BatchRecipient[]): BatchRecipient[] {
    const validated: BatchRecipient[] = [];
    const seenAddresses = new Set<string>();

    for (const recipient of recipients) {
      // Validate address
      if (!ethers.isAddress(recipient.address)) {
        throw new Error(`Invalid address: ${recipient.address}`);
      }

      // Normalize address to checksum
      const checksumAddress = ethers.getAddress(recipient.address);

      // Check for duplicates
      if (seenAddresses.has(checksumAddress)) {
        throw new Error(`Duplicate address found: ${checksumAddress}`);
      }
      seenAddresses.add(checksumAddress);

      // Validate amount
      const amount = parseFloat(recipient.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount for ${checksumAddress}: ${recipient.amount}`);
      }

      validated.push({
        address: checksumAddress,
        amount: recipient.amount
      });
    }

    return validated;
  }

  /**
   * Get token information
   */
  async getTokenInfo(): Promise<TokenInfo> {
    if (this.tokenInfo) {
      return this.tokenInfo;
    }

    try {
      const [symbol, name, decimals, totalSupply] = await Promise.all([
        this.tokenContract.symbol(),
        this.tokenContract.name(),
        this.tokenContract.decimals(),
        this.tokenContract.totalSupply()
      ]);

      this.tokenInfo = {
        address: this.config.tokenContract,
        symbol,
        name,
        decimals: Number(decimals),
        totalSupply: totalSupply.toString()
      };

      return this.tokenInfo;
    } catch (error) {
      throw new Error(`Failed to get token info: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Check wallet balances
   */
  async checkBalances(recipients: BatchRecipient[]): Promise<BalanceCheck> {
    const tokenInfo = await this.getTokenInfo();
    
    // Calculate total amount needed with validation
    let totalAmount = 0;
    for (const recipient of recipients) {
      const amountNum = parseFloat(recipient.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error(`Invalid amount for recipient ${recipient.address}: "${recipient.amount}"`);
      }
      totalAmount += amountNum;
    }

    // Convert amounts to smallest units (your amounts are in full tokens)
    // For example: 27500 tokens = 27500 * 10^18 smallest units
    const totalAmountWei = ethers.parseUnits(totalAmount.toString(), tokenInfo.decimals);

    // Get balances
    const [maticBalance, tokenBalance] = await Promise.all([
      this.provider.getBalance(this.wallet.address),
      this.tokenContract.balanceOf(this.wallet.address)
    ]);

    // Estimate gas cost
    const gasEstimate = await this.estimateGasForBatch(recipients);
    const estimatedGasCost = gasEstimate.gasCostMatic;

    return {
      maticBalance: ethers.formatEther(maticBalance),
      tokenBalance: ethers.formatUnits(tokenBalance, tokenInfo.decimals),
      sufficientMatic: parseFloat(ethers.formatEther(maticBalance)) >= parseFloat(estimatedGasCost),
      sufficientToken: tokenBalance >= totalAmountWei,
      estimatedGasCost
    };
  }

  /**
   * Estimate gas for batch transfers
   */
  async estimateGasForBatch(recipients: BatchRecipient[]): Promise<GasEstimate> {
    const tokenInfo = await this.getTokenInfo();
    
    // Estimate gas for a single transfer
    const sampleRecipient = recipients[0];
    
    // Validate amount before parsing
    const amountNum = parseFloat(sampleRecipient.amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new Error(`Invalid amount for gas estimation: "${sampleRecipient.amount}"`);
    }
    
    // Convert amount to smallest units (your amounts are in full tokens)
    const sampleAmount = ethers.parseUnits(sampleRecipient.amount, tokenInfo.decimals);
    
    const gasLimit = await this.tokenContract.transfer.estimateGas(
      sampleRecipient.address,
      sampleAmount
    );

    // Apply multiplier
    const adjustedGasLimit = BigInt(Math.floor(Number(gasLimit) * this.config.gasLimitMultiplier!));

    // Get current gas price
    const feeData = await this.provider.getFeeData();
    const gasPrice = feeData.gasPrice || ethers.parseUnits('30', 'gwei'); // Fallback

    // Calculate total gas cost
    const totalGasLimit = adjustedGasLimit * BigInt(recipients.length);
    const gasCostWei = totalGasLimit * gasPrice;
    const gasCostMatic = ethers.formatEther(gasCostWei);

    return {
      gasLimit: adjustedGasLimit.toString(),
      gasPrice: ethers.formatUnits(gasPrice, 'gwei'),
      gasCostMatic: gasCostMatic,
      priorityFee: feeData.maxPriorityFeePerGas ? ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei') : undefined,
      maxFeePerGas: feeData.maxFeePerGas ? ethers.formatUnits(feeData.maxFeePerGas, 'gwei') : undefined
    };
  }

  /**
   * Execute a single token transfer
   */
  async executeTransfer(recipient: BatchRecipient, nonce: number): Promise<TransferResult> {
    const tokenInfo = await this.getTokenInfo();
    
    // Convert amount to smallest units (your amounts are in full tokens)
    const amount = ethers.parseUnits(recipient.amount, tokenInfo.decimals);

    try {
      // Estimate gas for this specific transfer
      const gasLimit = await this.tokenContract.transfer.estimateGas(
        recipient.address,
        amount
      );

      const adjustedGasLimit = BigInt(Math.floor(Number(gasLimit) * this.config.gasLimitMultiplier!));

      // Get current gas price
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || ethers.parseUnits('30', 'gwei');

      // Build transaction
      const tx = await this.tokenContract.transfer.populateTransaction(
        recipient.address,
        amount
      );

      tx.gasLimit = adjustedGasLimit;
      tx.gasPrice = gasPrice;
      tx.nonce = nonce;

      if (this.config.dryRun) {
        return {
          recipient: recipient.address,
          amount: recipient.amount,
          status: 'success',
          txHash: '0x' + '0'.repeat(64), // Mock hash for dry run
          gasUsed: adjustedGasLimit.toString(),
          gasCostMatic: ethers.formatEther(adjustedGasLimit * gasPrice),
          timestamp: new Date().toISOString()
        };
      }

      // Send transaction
      const txResponse = await this.wallet.sendTransaction(tx);
      
      // Wait for confirmation with timeout and retry
      let receipt;
      try {
        receipt = await txResponse.wait();
      } catch (receiptError) {
        // If receipt fails due to rate limiting, still return success with tx hash
        const errorMessage = receiptError instanceof Error ? receiptError.message : String(receiptError);
        if (errorMessage.includes('rate limit') || errorMessage.includes('Too many requests')) {
          console.log(`    ⚠️  Transaction sent but receipt check failed due to rate limit`);
          return {
            recipient: recipient.address,
            amount: recipient.amount,
            status: 'success',
            txHash: txResponse.hash,
            blockNumber: undefined,
            gasUsed: adjustedGasLimit.toString(),
            gasCostMatic: ethers.formatEther(adjustedGasLimit * gasPrice),
            timestamp: new Date().toISOString()
          };
        }
        throw receiptError;
      }

      return {
        recipient: recipient.address,
        amount: recipient.amount,
        status: 'success',
        txHash: receipt!.hash,
        blockNumber: receipt!.blockNumber,
        gasUsed: receipt!.gasUsed.toString(),
        gasCostMatic: ethers.formatEther(receipt!.gasUsed * gasPrice),
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      return {
        recipient: recipient.address,
        amount: recipient.amount,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Execute batch transfers with retry logic
   */
  async executeBatchTransfers(recipients: BatchRecipient[]): Promise<TransferResult[]> {
    const results: TransferResult[] = [];
    const tokenInfo = await this.getTokenInfo();
    
    console.log(`🚀 Starting batch transfer of ${recipients.length} recipients`);
    console.log(`📊 Token: ${tokenInfo.symbol} (${tokenInfo.name})`);
    console.log(`💰 Total amount: ${recipients.reduce((sum, r) => sum + parseFloat(r.amount), 0)} ${tokenInfo.symbol}`);
    
    if (this.config.dryRun) {
      console.log(`🔍 DRY RUN MODE - No actual transactions will be sent`);
    }

    // Process in batches with proper nonce management
    const batches = this.chunkArray(recipients, this.config.batchSize!);
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`\n📦 Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} transfers)`);

      // Get fresh nonce for each batch to avoid nonce conflicts
      let currentNonce = await this.provider.getTransactionCount(this.wallet.address, 'pending');
      console.log(`  🔢 Starting nonce: ${currentNonce}`);

      for (let i = 0; i < batch.length; i++) {
        const recipient = batch[i];
        const transferIndex = batchIndex * this.config.batchSize! + i + 1;
        
        console.log(`  ${transferIndex}/${recipients.length} Transferring ${recipient.amount} ${tokenInfo.symbol} to ${recipient.address} (nonce: ${currentNonce})`);

        // Retry logic for failed transfers
        const retryConfig = {
          maxRetries: this.config.maxRetries!,
          baseDelayMs: this.config.retryDelayMs!,
          maxDelayMs: 10000,
          backoffMultiplier: 2
        };

        let result: TransferResult;
        let transferSuccessful = false;
        
        try {
          const retryUtil = new RetryUtil(retryConfig);
          result = await retryUtil.executeWithRetry(
            () => this.executeTransfer(recipient, currentNonce),
            `transfer to ${recipient.address}`
          );
          transferSuccessful = result.status === 'success';
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.log(`    ❌ Transfer failed: ${errorMessage}`);
          
          // Handle rate limiting specifically
          if (errorMessage.includes('rate limit') || errorMessage.includes('Too many requests')) {
            console.log(`    ⏳ Rate limited, waiting 60 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
          }
          
          result = {
            recipient: recipient.address,
            amount: recipient.amount,
            status: 'failed',
            error: errorMessage,
            timestamp: new Date().toISOString(),
            attempts: retryConfig.maxRetries + 1
          };
        }

        if (transferSuccessful) {
          console.log(`    ✅ Success: ${result.txHash}`);
          currentNonce++; // Only increment nonce on successful transfer
        } else {
          console.log(`    ❌ Failed: ${result.error}`);
        }

        results.push(result);

        // Longer delay between transfers to avoid rate limiting
        if (!this.config.dryRun && i < batch.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay
        }
      }

      // Longer delay between batches to avoid rate limiting
      if (!this.config.dryRun && batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting 15 seconds before next batch to avoid rate limits...`);
        await new Promise(resolve => setTimeout(resolve, 15000)); // 15 second delay
      }
    }

    return results;
  }

  /**
   * Generate batch report
   */
  generateReport(results: TransferResult[], startTime: number): BatchReport {
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    const totalAmountSent = successful.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalGasCost = successful.reduce((sum, r) => sum + parseFloat(r.gasCostMatic || '0'), 0);
    const averageGasPerTransfer = successful.length > 0 
      ? (successful.reduce((sum, r) => sum + parseFloat(r.gasUsed || '0'), 0) / successful.length).toString()
      : '0';

    return {
      summary: {
        totalRecipients: results.length,
        successful: successful.length,
        failed: failed.length,
        totalAmountSent: totalAmountSent.toString(),
        totalGasCostMatic: totalGasCost.toString(),
        tokenContract: this.config.tokenContract,
        senderAddress: this.wallet.address,
        tokenSymbol: this.tokenInfo?.symbol,
        tokenDecimals: this.tokenInfo?.decimals,
        timestamp: new Date().toISOString(),
        processingTimeMs: Date.now() - startTime
      },
      transfers: results,
      failed,
      metadata: {
        gasPriceGwei: '30', // This would be dynamic in real implementation
        averageGasPerTransfer,
        network: 'polygon',
        dryRun: this.config.dryRun || false
      }
    };
  }

  /**
   * Utility function to chunk array
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Main execution method
   */
  async executeBatch(recipients: BatchRecipient[], options: BatchSenderOptions = {}): Promise<BatchReport> {
    const startTime = Date.now();
    
    try {
      // Validate recipients
      const validatedRecipients = this.validateRecipients(recipients);
      
      // Get token info
      await this.getTokenInfo();
      
      // Check balances
      const balanceCheck = await this.checkBalances(validatedRecipients);
      
      if (!balanceCheck.sufficientToken) {
        throw new Error(`Insufficient token balance. Required: ${validatedRecipients.reduce((sum, r) => sum + parseFloat(r.amount), 0)} ${this.tokenInfo?.symbol}, Available: ${balanceCheck.tokenBalance}`);
      }
      
      if (!balanceCheck.sufficientMatic) {
        throw new Error(`Insufficient MATIC balance for gas. Required: ${balanceCheck.estimatedGasCost} MATIC, Available: ${balanceCheck.maticBalance}`);
      }

      console.log(`\n💰 Balance Check:`);
      console.log(`  Token Balance: ${balanceCheck.tokenBalance} ${this.tokenInfo?.symbol}`);
      console.log(`  MATIC Balance: ${balanceCheck.maticBalance} MATIC`);
      console.log(`  Estimated Gas Cost: ${balanceCheck.estimatedGasCost} MATIC`);

      // Execute transfers
      const results = await this.executeBatchTransfers(validatedRecipients);
      
      // Generate report
      const report = this.generateReport(results, startTime);
      
      return report;
      
    } catch (error) {
      throw new Error(`Batch execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
