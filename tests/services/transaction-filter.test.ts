import { TransactionFilterService } from '../src/services/transaction-filter';
import { EtherscanClient } from '../src/api/etherscan';
import { TransactionFilter, Transaction, InternalTransaction, TokenTransfer, ERC721Transfer, ERC1155Transfer } from '../src/types';

// Mock EtherscanClient
jest.mock('../src/api/etherscan');
const MockedEtherscanClient = EtherscanClient as jest.MockedClass<typeof EtherscanClient>;

describe('TransactionFilterService', () => {
  let filterService: TransactionFilterService;
  let mockEtherscanClient: jest.Mocked<EtherscanClient>;

  beforeEach(() => {
    mockEtherscanClient = new MockedEtherscanClient() as jest.Mocked<EtherscanClient>;
    filterService = new TransactionFilterService(mockEtherscanClient);
  });

  describe('filterTransactions', () => {
    const mockFilter: TransactionFilter = {
      address: '0xabc',
      startDate: new Date('2022-01-01T00:00:00Z'),
      endDate: new Date('2022-01-02T00:00:00Z'),
      includeInternal: true,
      includeTokenTransfers: true,
      includeERC721: true,
      includeERC1155: true
    };

    const mockTransactions: Transaction[] = [
      {
        hash: '0x123',
        blockNumber: '100',
        timeStamp: '1640995200',
        nonce: '1',
        blockHash: '0xblock',
        transactionIndex: '0',
        from: '0xabc',
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

    const mockInternalTransactions: InternalTransaction[] = [
      {
        blockNumber: '100',
        timeStamp: '1640995200',
        hash: '0x123',
        from: '0xabc',
        to: '0xdef',
        value: '500000000000000000',
        contractAddress: '0xcontract',
        input: '0x',
        type: 'call',
        gas: '21000',
        gasUsed: '21000',
        traceId: '0',
        isError: '0',
        errCode: ''
      }
    ];

    const mockTokenTransfers: TokenTransfer[] = [
      {
        blockNumber: '100',
        timeStamp: '1640995200',
        hash: '0x123',
        nonce: '1',
        blockHash: '0xblock',
        transactionIndex: '0',
        from: '0xabc',
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

    const mockERC721Transfers: ERC721Transfer[] = [
      {
        blockNumber: '100',
        timeStamp: '1640995200',
        hash: '0x123',
        nonce: '1',
        blockHash: '0xblock',
        from: '0xabc',
        to: '0xdef',
        tokenID: '1',
        tokenName: 'Test NFT',
        tokenSymbol: 'TNFT',
        tokenDecimal: '0',
        transactionIndex: '0',
        gas: '21000',
        gasPrice: '20000000000',
        gasUsed: '21000',
        cumulativeGasUsed: '21000',
        input: '0x',
        contractAddress: '0xnft'
      }
    ];

    const mockERC1155Transfers: ERC1155Transfer[] = [
      {
        blockNumber: '100',
        timeStamp: '1640995200',
        hash: '0x123',
        nonce: '1',
        blockHash: '0xblock',
        from: '0xabc',
        to: '0xdef',
        tokenID: '1',
        tokenValue: '5',
        tokenName: 'Test Multi Token',
        tokenSymbol: 'TMT',
        transactionIndex: '0',
        gas: '21000',
        gasPrice: '20000000000',
        gasUsed: '21000',
        cumulativeGasUsed: '21000',
        input: '0x',
        contractAddress: '0xmulti'
      }
    ];

    beforeEach(() => {
      // Mock block number by timestamp calls
      mockEtherscanClient.getBlockNumberByTimestamp.mockResolvedValueOnce('100').mockResolvedValueOnce('200');
      
      // Mock all data fetching methods
      mockEtherscanClient.getTransactions.mockResolvedValue(mockTransactions);
      mockEtherscanClient.getInternalTransactions.mockResolvedValue(mockInternalTransactions);
      mockEtherscanClient.getTokenTransfers.mockResolvedValue(mockTokenTransfers);
      mockEtherscanClient.getERC721Transfers.mockResolvedValue(mockERC721Transfers);
      mockEtherscanClient.getERC1155Transfers.mockResolvedValue(mockERC1155Transfers);
      
      // Mock API call count
      mockEtherscanClient.getApiCallCount.mockReturnValue(10);
    });

    it('should filter transactions successfully', async () => {
      const result = await filterService.filterTransactions(mockFilter);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].transaction).toEqual(mockTransactions[0]);
      expect(result.transactions[0].internalTransactions).toEqual(mockInternalTransactions);
      expect(result.transactions[0].tokenTransfers).toHaveLength(3); // ERC20 + ERC721 + ERC1155
      
      expect(result.summary).toEqual({
        totalTransactions: 1,
        totalInternalTransactions: 1,
        totalTokenTransfers: 1,
        totalERC721Transfers: 1,
        totalERC1155Transfers: 1,
        uniqueTokens: 3,
        dateRange: {
          start: mockFilter.startDate.toISOString(),
          end: mockFilter.endDate.toISOString()
        },
        walletAddress: mockFilter.address
      });

      expect(result.metadata).toEqual({
        generatedAt: expect.any(String),
        apiCalls: 10,
        processingTimeMs: expect.any(Number)
      });
    });

    it('should handle optional filters', async () => {
      const minimalFilter: TransactionFilter = {
        address: '0xabc',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z'),
        includeInternal: false,
        includeTokenTransfers: false,
        includeERC721: false,
        includeERC1155: false
      };

      const result = await filterService.filterTransactions(minimalFilter);

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].internalTransactions).toEqual([]);
      expect(result.transactions[0].tokenTransfers).toEqual([]);
      
      expect(result.summary.totalInternalTransactions).toBe(0);
      expect(result.summary.totalTokenTransfers).toBe(0);
      expect(result.summary.totalERC721Transfers).toBe(0);
      expect(result.summary.totalERC1155Transfers).toBe(0);
    });

    it('should call getBlockNumberByTimestamp with correct parameters', async () => {
      await filterService.filterTransactions(mockFilter);

      expect(mockEtherscanClient.getBlockNumberByTimestamp).toHaveBeenCalledWith(
        Math.floor(mockFilter.startDate.getTime() / 1000),
        'after'
      );
      expect(mockEtherscanClient.getBlockNumberByTimestamp).toHaveBeenCalledWith(
        Math.floor(mockFilter.endDate.getTime() / 1000),
        'before'
      );
    });

    it('should call data fetching methods with correct parameters', async () => {
      await filterService.filterTransactions(mockFilter);

      expect(mockEtherscanClient.getTransactions).toHaveBeenCalledWith(
        mockFilter.address,
        100,
        200,
        1,
        10000,
        'desc'
      );
      expect(mockEtherscanClient.getInternalTransactions).toHaveBeenCalledWith(
        mockFilter.address,
        100,
        200,
        1,
        10000,
        'desc'
      );
      expect(mockEtherscanClient.getTokenTransfers).toHaveBeenCalledWith(
        mockFilter.address,
        undefined,
        100,
        200,
        1,
        10000,
        'desc'
      );
      expect(mockEtherscanClient.getERC721Transfers).toHaveBeenCalledWith(
        mockFilter.address,
        undefined,
        100,
        200,
        1,
        10000,
        'desc'
      );
      expect(mockEtherscanClient.getERC1155Transfers).toHaveBeenCalledWith(
        mockFilter.address,
        undefined,
        100,
        200,
        1,
        10000,
        'desc'
      );
    });

    it('should handle pagination for large datasets', async () => {
      // Mock multiple pages of transactions
      const page1Transactions = Array(10000).fill(null).map((_, i) => ({
        ...mockTransactions[0],
        hash: `0x${i.toString(16).padStart(64, '0')}`,
        blockNumber: (100 + i).toString()
      }));
      
      const page2Transactions = Array(5000).fill(null).map((_, i) => ({
        ...mockTransactions[0],
        hash: `0x${(i + 10000).toString(16).padStart(64, '0')}`,
        blockNumber: (10100 + i).toString()
      }));

      mockEtherscanClient.getTransactions
        .mockResolvedValueOnce(page1Transactions)
        .mockResolvedValueOnce(page2Transactions)
        .mockResolvedValueOnce([]); // Empty page to stop pagination

      const result = await filterService.filterTransactions(mockFilter);

      expect(result.transactions).toHaveLength(15000);
      expect(mockEtherscanClient.getTransactions).toHaveBeenCalledTimes(3);
    });

    it('should group transfers by transaction hash', async () => {
      const transfersWithSameHash = [
        { ...mockTokenTransfers[0], hash: '0x123' },
        { ...mockERC721Transfers[0], hash: '0x123' },
        { ...mockERC1155Transfers[0], hash: '0x123' }
      ];

      mockEtherscanClient.getTokenTransfers.mockResolvedValue([transfersWithSameHash[0]]);
      mockEtherscanClient.getERC721Transfers.mockResolvedValue([transfersWithSameHash[1]]);
      mockEtherscanClient.getERC1155Transfers.mockResolvedValue([transfersWithSameHash[2]]);

      const result = await filterService.filterTransactions(mockFilter);

      expect(result.transactions[0].tokenTransfers).toHaveLength(3);
    });

    it('should handle empty results', async () => {
      mockEtherscanClient.getTransactions.mockResolvedValue([]);
      mockEtherscanClient.getInternalTransactions.mockResolvedValue([]);
      mockEtherscanClient.getTokenTransfers.mockResolvedValue([]);
      mockEtherscanClient.getERC721Transfers.mockResolvedValue([]);
      mockEtherscanClient.getERC1155Transfers.mockResolvedValue([]);

      const result = await filterService.filterTransactions(mockFilter);

      expect(result.transactions).toHaveLength(0);
      expect(result.summary.totalTransactions).toBe(0);
      expect(result.summary.totalInternalTransactions).toBe(0);
      expect(result.summary.totalTokenTransfers).toBe(0);
    });
  });

  describe('waitForCompletion', () => {
    it('should wait for all API requests to complete', async () => {
      mockEtherscanClient.waitForCompletion.mockResolvedValue();

      await filterService.waitForCompletion();

      expect(mockEtherscanClient.waitForCompletion).toHaveBeenCalled();
    });
  });

  describe('API call tracking', () => {
    it('should get API call count', () => {
      mockEtherscanClient.getApiCallCount.mockReturnValue(5);

      const count = filterService.getApiCallCount();

      expect(count).toBe(5);
      expect(mockEtherscanClient.getApiCallCount).toHaveBeenCalled();
    });

    it('should reset API call count', () => {
      filterService.resetApiCallCount();

      expect(mockEtherscanClient.resetApiCallCount).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const mockFilter: TransactionFilter = {
        address: '0xabc',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z'),
        includeInternal: true,
        includeTokenTransfers: true,
        includeERC721: true,
        includeERC1155: true
      };

      mockEtherscanClient.getBlockNumberByTimestamp.mockRejectedValue(new Error('API Error'));

      await expect(filterService.filterTransactions(mockFilter)).rejects.toThrow('API Error');
    });

    it('should handle partial failures', async () => {
      const mockFilter: TransactionFilter = {
        address: '0xabc',
        startDate: new Date('2022-01-01T00:00:00Z'),
        endDate: new Date('2022-01-02T00:00:00Z'),
        includeInternal: true,
        includeTokenTransfers: true,
        includeERC721: true,
        includeERC1155: true
      };

      const mockTransactions: Transaction[] = [
        {
          hash: '0x123',
          blockNumber: '100',
          timeStamp: '1640995200',
          nonce: '1',
          blockHash: '0xblock',
          transactionIndex: '0',
          from: '0xabc',
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

      mockEtherscanClient.getBlockNumberByTimestamp.mockResolvedValueOnce('100').mockResolvedValueOnce('200');
      mockEtherscanClient.getTransactions.mockResolvedValue(mockTransactions);
      mockEtherscanClient.getInternalTransactions.mockRejectedValue(new Error('Internal API Error'));
      mockEtherscanClient.getTokenTransfers.mockResolvedValue([]);
      mockEtherscanClient.getERC721Transfers.mockResolvedValue([]);
      mockEtherscanClient.getERC1155Transfers.mockResolvedValue([]);

      await expect(filterService.filterTransactions(mockFilter)).rejects.toThrow('Internal API Error');
    });
  });
});
