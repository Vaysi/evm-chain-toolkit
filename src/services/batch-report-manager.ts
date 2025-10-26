import * as fs from 'fs';
import * as path from 'path';
import { BatchReport, TransferResult } from '../types/batch-sender';

export class BatchReportManager {
  private outputDir: string;

  constructor(outputDir: string = './output') {
    this.outputDir = outputDir;
    this.ensureOutputDir();
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDir(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Generate batch report from transfer results
   */
  generateReport(results: TransferResult[], config: any, tokenInfo: any): BatchReport {
    const successful = results.filter(r => r.status === 'success');
    const failed = results.filter(r => r.status === 'failed');
    
    const totalAmountSent = successful.reduce((sum, r) => sum + parseFloat(r.amount), 0);
    const totalGasCost = successful.reduce((sum, r) => sum + parseFloat(r.gasCostMatic || '0'), 0);

    return {
      summary: {
        totalRecipients: results.length,
        successful: successful.length,
        failed: failed.length,
        totalAmountSent: totalAmountSent.toString(),
        totalGasCostMatic: totalGasCost.toString(),
        tokenContract: config.tokenContract,
        senderAddress: config.privateKey ? '0x' + config.privateKey.slice(-40) : 'unknown',
        tokenSymbol: tokenInfo.symbol,
        tokenDecimals: tokenInfo.decimals,
        timestamp: new Date().toISOString(),
        processingTimeMs: 0 // Will be calculated by the actual execution
      },
      transfers: results,
      failed: failed,
      metadata: {
        gasPriceGwei: '0', // Will be filled by actual execution
        averageGasPerTransfer: '0',
        network: 'polygon',
        dryRun: config.dryRun || false
      }
    };
  }

  /**
   * Generate filename for batch report
   */
  private generateFilename(tokenContract: string, customFilename?: string): string {
    if (customFilename) {
      return customFilename.endsWith('.json') ? customFilename : `${customFilename}.json`;
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortAddress = tokenContract.slice(0, 8);
    return `batch_transfer_report_${shortAddress}_${timestamp}.json`;
  }

  /**
   * Save batch report to JSON file (alias for saveBatchReport)
   */
  async saveReport(report: BatchReport, customFilename?: string): Promise<string> {
    return this.saveBatchReport(report, customFilename);
  }

  /**
   * Save batch report to JSON file
   */
  async saveBatchReport(report: BatchReport, customFilename?: string): Promise<string> {
    const filename = this.generateFilename(report.summary.tokenContract, customFilename);
    const filepath = path.join(this.outputDir, filename);

    try {
      const jsonContent = JSON.stringify(report, null, 2);
      fs.writeFileSync(filepath, jsonContent, 'utf8');
      
      console.log(`📄 Batch report saved to: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save batch report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save failed transfers for retry
   */
  async saveFailedTransfers(failedTransfers: TransferResult[], tokenContract: string): Promise<string> {
    if (failedTransfers.length === 0) {
      console.log(`✅ No failed transfers to save`);
      return '';
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortAddress = tokenContract.slice(0, 8);
    const filename = `failed_transfers_${shortAddress}_${timestamp}.json`;
    const filepath = path.join(this.outputDir, filename);

    try {
      // Convert failed transfers back to recipient format for easy retry
      const retryRecipients = failedTransfers.map(transfer => ({
        address: transfer.recipient,
        amount: transfer.amount
      }));

      const retryData = {
        metadata: {
          originalBatch: tokenContract,
          failedCount: failedTransfers.length,
          generatedAt: new Date().toISOString(),
          note: "This file contains failed transfers that can be retried"
        },
        recipients: retryRecipients,
        failedDetails: failedTransfers
      };

      const jsonContent = JSON.stringify(retryData, null, 2);
      fs.writeFileSync(filepath, jsonContent, 'utf8');
      
      console.log(`🔄 Failed transfers saved for retry: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save failed transfers: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate console summary
   */
  printSummary(report: BatchReport): void {
    console.log(`\n📊 BATCH TRANSFER SUMMARY`);
    console.log(`═══════════════════════════════════════`);
    console.log(`Token Contract: ${report.summary.tokenContract}`);
    console.log(`Sender Address: ${report.summary.senderAddress}`);
    console.log(`Token Symbol: ${report.summary.tokenSymbol}`);
    console.log(`Total Recipients: ${report.summary.totalRecipients}`);
    console.log(`✅ Successful: ${report.summary.successful}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`💰 Total Amount Sent: ${report.summary.totalAmountSent} ${report.summary.tokenSymbol}`);
    console.log(`⛽ Total Gas Cost: ${report.summary.totalGasCostMatic} MATIC`);
    console.log(`⏱️  Processing Time: ${(report.summary.processingTimeMs / 1000).toFixed(2)}s`);
    console.log(`🌐 Network: ${report.metadata.network}`);
    console.log(`🔍 Dry Run: ${report.metadata.dryRun ? 'Yes' : 'No'}`);
    
    if (report.summary.failed > 0) {
      console.log(`\n❌ FAILED TRANSFERS:`);
      report.failed.forEach((transfer, index) => {
        console.log(`  ${index + 1}. ${transfer.recipient} - ${transfer.amount} ${report.summary.tokenSymbol}`);
        console.log(`     Error: ${transfer.error}`);
      });
    }

    console.log(`═══════════════════════════════════════`);
  }

  /**
   * Generate detailed transaction log
   */
  printDetailedLog(report: BatchReport): void {
    console.log(`\n📋 DETAILED TRANSACTION LOG`);
    console.log(`═══════════════════════════════════════`);
    
    report.transfers.forEach((transfer, index) => {
      const status = transfer.status === 'success' ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${transfer.recipient}`);
      console.log(`   Amount: ${transfer.amount} ${report.summary.tokenSymbol}`);
      
      if (transfer.status === 'success') {
        console.log(`   TX Hash: ${transfer.txHash}`);
        console.log(`   Block: ${transfer.blockNumber}`);
        console.log(`   Gas Used: ${transfer.gasUsed}`);
        console.log(`   Gas Cost: ${transfer.gasCostMatic} MATIC`);
      } else {
        console.log(`   Error: ${transfer.error}`);
        console.log(`   Attempts: ${transfer.attempts || 1}`);
      }
      console.log(`   Time: ${transfer.timestamp}`);
      console.log('');
    });
  }

  /**
   * Create retry script content
   */
  generateRetryScript(failedTransfers: TransferResult[], tokenContract: string): string {
    if (failedTransfers.length === 0) {
      return '';
    }

    const retryRecipients = failedTransfers.map(transfer => ({
      address: transfer.recipient,
      amount: transfer.amount
    }));

    const scriptContent = `#!/bin/bash
# Retry script for failed transfers
# Generated on ${new Date().toISOString()}

echo "🔄 Retrying ${failedTransfers.length} failed transfers..."

npm run batch-send -- \\
  --token ${tokenContract} \\
  --input failed_transfers_${tokenContract.slice(0, 8)}_${new Date().toISOString().replace(/[:.]/g, '-')}.json \\
  --retry-mode

echo "✅ Retry completed!"
`;

    return scriptContent;
  }

  /**
   * Save retry script
   */
  async saveRetryScript(failedTransfers: TransferResult[], tokenContract: string): Promise<string> {
    if (failedTransfers.length === 0) {
      return '';
    }

    const scriptContent = this.generateRetryScript(failedTransfers, tokenContract);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortAddress = tokenContract.slice(0, 8);
    const filename = `retry_failed_${shortAddress}_${timestamp}.sh`;
    const filepath = path.join(this.outputDir, filename);

    try {
      fs.writeFileSync(filepath, scriptContent, 'utf8');
      fs.chmodSync(filepath, '755'); // Make executable
      
      console.log(`🔄 Retry script saved: ${filepath}`);
      return filepath;
    } catch (error) {
      throw new Error(`Failed to save retry script: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Load and parse existing batch report
   */
  async loadBatchReport(filepath: string): Promise<BatchReport> {
    try {
      const fileContent = fs.readFileSync(filepath, 'utf8');
      const report = JSON.parse(fileContent) as BatchReport;
      
      // Validate report structure
      if (!report.summary || !report.transfers) {
        throw new Error('Invalid batch report format');
      }
      
      return report;
    } catch (error) {
      throw new Error(`Failed to load batch report: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Compare two batch reports
   */
  compareReports(report1: BatchReport, report2: BatchReport): void {
    console.log(`\n📊 BATCH REPORT COMPARISON`);
    console.log(`═══════════════════════════════════════`);
    
    const metrics = [
      { name: 'Total Recipients', val1: report1.summary.totalRecipients, val2: report2.summary.totalRecipients },
      { name: 'Successful', val1: report1.summary.successful, val2: report2.summary.successful },
      { name: 'Failed', val1: report1.summary.failed, val2: report2.summary.failed },
      { name: 'Total Amount', val1: report1.summary.totalAmountSent, val2: report2.summary.totalAmountSent },
      { name: 'Gas Cost', val1: report1.summary.totalGasCostMatic, val2: report2.summary.totalGasCostMatic }
    ];

    metrics.forEach(metric => {
      const diff = Number(metric.val2) - Number(metric.val1);
      const diffStr = diff > 0 ? `+${diff}` : diff.toString();
      console.log(`${metric.name}: ${metric.val1} → ${metric.val2} (${diffStr})`);
    });
    
    console.log(`═══════════════════════════════════════`);
  }

  /**
   * Create default configuration
   */
  static createDefaultConfig() {
    return {
      outputDir: './output',
      prettyPrint: true,
      saveFailedTransfers: true,
      generateRetryScript: true
    };
  }
}
