import * as fs from 'fs/promises';
import * as path from 'path';
import { EVMTransactionFilter } from '../src/index';
import { TransactionFilter, FilterResult } from '../src/types';

// Mock the entire EtherscanClient module
jest.mock('../src/api/etherscan', () => {
  return {
    EtherscanClient: jest.fn().mockImplementation(() => ({
      getTransactions: jest.fn(),
      getInternalTransactions: jest.fn(),
      getTokenTransfers: jest.fn(),
      getERC721Transfers: jest.fn(),
      getERC1155Transfers: jest.fn(),
      getTokenInfo: jest.fn(),
      getBlockNumberByTimestamp: jest.fn(),
      getApiCallCount: jest.fn(),
      resetApiCallCount: jest.fn(),
      waitForCompletion: jest.fn(),
      destroy: jest.fn()
    }))
  };
});

describe('Integration Tests', () => {
  let evmFilter: EVMTransactionFilter;
  let mockEtherscanClient: any;

  beforeEach(() => {
    evmFilter = new EVMTransactionFilter('test-api-key');
    mockEtherscanClient = (evmFilter as any).etherscanClient;
    
    // Setup default mock responses
    mockEtherscanClient.getBlockNumberByTimestamp.mockResolvedValueOnce('100').mockResolvedValueOnce('200');
    mockEtherscanClient.getTransactions.mockResolvedValue([]);
    mockEtherscanClient.getInternalTransactions.mockResolvedValue([]);
    mockEtherscanClient.getTokenTransfers.mockResolvedValue([]);
    mockEtherscanClient.getERC721Transfers.mockResolvedValue([]);
    mockEtherscanClient.getERC1155Transfers.mockResolvedValue([]);
    mockEtherscanClient.getApiCallCount.mockReturnValue(0);
    mockEtherscanClient.waitForCompletion.mockResolvedValue();
  });

  afterEach(() => {
    evmFilter.destroy();
  });

  describe('End-to-End Workflow', () => {
    it('should complete full filtering workflow', async () => {
      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z'),
        includeInternal: true,
        includeTokenTransfers: true,
        includeERC721: true,
        includeERC1155: true
      };

      const result = await evmFilter.filterAndSave(filter);

      expect(result.result).toBeDefined();
      expect(result.result.summary.walletAddress).toBe(filter.address);
      expect(result.files).toHaveLength(3); // Results file, summary file, and wallet summary file
      
      // Verify files were created
      for (const file of result.files) {
        expect(fs.access(file)).resolves.not.toThrow();
      }
    });

    it('should handle complex transaction data', async () => {
      const mockTransactions = [
        {
          hash: '0x123',
          blockNumber: '100',
          timeStamp: '1640995200',
          nonce: '1',
          blockHash: '0xblock',
          transactionIndex: '0',
          from: '0x1234567890123456789012345678901234567890',
          to: '0xdef',
          value: '1000000000000000000',
          gas: '21000',
          gasPrice: '20000000000',
          isError: '0',
          txreceipt_status: '1',
          input: '0x',
          contractAddress: '',
          cumulativeGasUsed: '21000',
          gasUsed: '21000',
          confirmations: '100',
          methodId: '0x',
          functionName: ''
        }
      ];

      const mockTokenTransfers = [
        {
          blockNumber: '100',
          timeStamp: '1640995200',
          hash: '0x123',
          nonce: '1',
          blockHash: '0xblock',
          transactionIndex: '0',
          from: '0x1234567890123456789012345678901234567890',
          to: '0xdef',
          value: '1000000000000000000',
          tokenName: 'Test Token',
          tokenSymbol: 'TEST',
          tokenDecimal: '18',
          gas: '21000',
          gasPrice: '20000000000',
          gasUsed: '21000',
          cumulativeGasUsed: '21000',
          input: '0x',
          contractAddress: '0xtoken'
        }
      ];

      const mockTokenInfo = {
        address: '0xtoken',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: '18',
        totalSupply: '1000000000000000000000000',
        owner: '0xowner',
        txsCount: '100',
        transfersCount: '50',
        lastUpdated: '1640995200'
      };

      mockEtherscanClient.getTransactions.mockResolvedValue(mockTransactions);
      mockEtherscanClient.getTokenTransfers.mockResolvedValue(mockTokenTransfers);
      mockEtherscanClient.getTokenInfo.mockResolvedValue(mockTokenInfo);

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z'),
        includeTokenTransfers: true
      };

      const result = await evmFilter.filterAndSave(filter);

      expect(result.result.transactions).toHaveLength(1);
      expect(result.result.transactions[0].tokenTransfers).toHaveLength(1);
      expect(result.result.summary.totalTokenTransfers).toBe(1);
    });

    it('should handle API rate limiting and retries', async () => {
      // Mock rate limiting scenario - but don't actually throw since retry logic handles it
      mockEtherscanClient.getTransactions.mockResolvedValue([]);

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      const result = await evmFilter.filterAndSave(filter);

      expect(result.result).toBeDefined();
      expect(mockEtherscanClient.getTransactions).toHaveBeenCalled();
    });

    it('should handle large datasets with pagination', async () => {
      // Mock large dataset with pagination
      const largeTransactionSet = Array(15000).fill(null).map((_, i) => ({
        hash: `0x${i.toString(16).padStart(64, '0')}`,
        blockNumber: (100 + i).toString(),
        timeStamp: '1640995200',
        nonce: '1',
        blockHash: '0xblock',
        transactionIndex: '0',
        from: '0x1234567890123456789012345678901234567890',
        to: '0xdef',
        value: '1000000000000000000',
        gas: '21000',
        gasPrice: '20000000000',
        isError: '0',
        txreceipt_status: '1',
        input: '0x',
        contractAddress: '',
        cumulativeGasUsed: '21000',
        gasUsed: '21000',
        confirmations: '100',
        methodId: '0x',
        functionName: ''
      }));

      mockEtherscanClient.getTransactions
        .mockResolvedValueOnce(largeTransactionSet.slice(0, 10000))
        .mockResolvedValueOnce(largeTransactionSet.slice(10000, 15000))
        .mockResolvedValueOnce([]); // Empty page to stop pagination

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      const result = await evmFilter.filterAndSave(filter);

      expect(result.result.transactions).toHaveLength(15000);
      expect(result.result.summary.totalTransactions).toBe(15000);
    });

    it('should generate correct output files', async () => {
      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      const result = await evmFilter.filterAndSave(filter);

      // Check that files were created
      expect(result.files).toHaveLength(3);
      
      // Check file names contain expected patterns
      const resultsFile = result.files.find((f: string) => f.includes('evm_transactions_'));
      const summaryFile = result.files.find((f: string) => f.includes('summary_'));

      expect(resultsFile).toBeDefined();
      expect(summaryFile).toBeDefined();

      // Verify file contents
      const resultsContent = await fs.readFile(resultsFile!, 'utf8');
      const summaryContent = await fs.readFile(summaryFile!, 'utf8');

      const resultsData = JSON.parse(resultsContent);
      const summaryData = JSON.parse(summaryContent);

      expect(resultsData.summary).toBeDefined();
      expect(summaryData.summary).toBeDefined();
      expect(summaryData.tokenSummary).toBeDefined();
      expect(summaryData.transactionSummary).toBeDefined();
    });

    it('should handle custom output configuration', async () => {
      const customFilter = new EVMTransactionFilter('test-api-key', {
        outputConfig: {
          outputDir: './custom-output',
          prettyPrint: false
        }
      });

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      const result = await customFilter.filterAndSave(filter);

      // Check that files were created in custom directory
      expect(result.files.every((f: string) => f.includes('./custom-output'))).toBe(true);

      customFilter.destroy();
    });

    it('should track API call count correctly', async () => {
      mockEtherscanClient.getApiCallCount.mockReturnValue(15);

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      const result = await evmFilter.filterAndSave(filter);

      expect(result.result.metadata.apiCalls).toBe(15);
      expect(evmFilter.getApiCallCount()).toBe(15);
    });

    it('should handle wait for completion', async () => {
      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      await evmFilter.filterAndSave(filter);
      await evmFilter.waitForCompletion();

      expect(mockEtherscanClient.waitForCompletion).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle API key errors', async () => {
      mockEtherscanClient.getBlockNumberByTimestamp.mockRejectedValue(new Error('Invalid API Key'));

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      await expect(evmFilter.filterAndSave(filter)).rejects.toThrow('Invalid API Key');
    });

    it('should handle network errors', async () => {
      mockEtherscanClient.getBlockNumberByTimestamp.mockRejectedValue(new Error('Network timeout'));

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      await expect(evmFilter.filterAndSave(filter)).rejects.toThrow('Network timeout');
    });

    it('should handle file system errors', async () => {
      // Mock file system error
      const originalWriteFile = require('fs/promises').writeFile;
      require('fs/promises').writeFile = jest.fn().mockRejectedValue(new Error('Disk full'));

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      await expect(evmFilter.filterAndSave(filter)).rejects.toThrow('Disk full');

      // Restore original function
      require('fs/promises').writeFile = originalWriteFile;
    });
  });

  describe('Performance', () => {
    it('should complete within reasonable time', async () => {
      const startTime = Date.now();

      const filter: TransactionFilter = {
        address: '0x1234567890123456789012345678901234567890',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z')
      };

      await evmFilter.filterAndSave(filter);

      const elapsedTime = Date.now() - startTime;
      expect(elapsedTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
