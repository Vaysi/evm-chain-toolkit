import axios from 'axios';
import { EtherscanClient } from '../src/api/etherscan';
import { ApiConfig } from '../src/types';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('EtherscanClient', () => {
  let client: EtherscanClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);

    const config: ApiConfig = {
      apiKey: 'test-api-key',
      baseUrl: 'https://api.polygonscan.com/api',
      retryConfig: {
        maxRetries: 1,
        baseDelayMs: 100,
        maxDelayMs: 1000,
        backoffMultiplier: 2
      },
      queueConfig: {
        maxConcurrent: 2,
        rateLimitPerSecond: 10
      }
    };

    client = new EtherscanClient(config);
  });

  afterEach(() => {
    client.destroy();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.polygonscan.com/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });

    it('should set up request interceptor', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
    });

    it('should set up response interceptor', () => {
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getTransactions', () => {
    it('should fetch transactions successfully', async () => {
      const mockTransactions = [
        {
          hash: '0x123',
          blockNumber: '100',
          timeStamp: '1640995200',
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockTransactions
        }
      });

      const result = await client.getTransactions('0xabc');

      expect(result).toEqual(mockTransactions);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'account',
          action: 'txlist',
          address: '0xabc',
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10000,
          sort: 'desc',
          apikey: 'test-api-key'
        }
      });
    });

    it('should handle API errors', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '0',
          message: 'Invalid API Key',
          result: []
        }
      });

      await expect(client.getTransactions('0xabc')).rejects.toThrow('API Error: Invalid API Key');
    });
  });

  describe('getInternalTransactions', () => {
    it('should fetch internal transactions successfully', async () => {
      const mockInternalTransactions = [
        {
          blockNumber: '100',
          timeStamp: '1640995200',
          hash: '0x123',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockInternalTransactions
        }
      });

      const result = await client.getInternalTransactions('0xabc');

      expect(result).toEqual(mockInternalTransactions);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'account',
          action: 'txlistinternal',
          address: '0xabc',
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10000,
          sort: 'desc',
          apikey: 'test-api-key'
        }
      });
    });
  });

  describe('getTokenTransfers', () => {
    it('should fetch token transfers successfully', async () => {
      const mockTokenTransfers = [
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockTokenTransfers
        }
      });

      const result = await client.getTokenTransfers('0xabc');

      expect(result).toEqual(mockTokenTransfers);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'account',
          action: 'tokentx',
          address: '0xabc',
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10000,
          sort: 'desc',
          apikey: 'test-api-key'
        }
      });
    });

    it('should include contract address when provided', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: []
        }
      });

      await client.getTokenTransfers('0xabc', '0xtoken');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: expect.objectContaining({
          contractaddress: '0xtoken'
        })
      });
    });
  });

  describe('getERC721Transfers', () => {
    it('should fetch ERC721 transfers successfully', async () => {
      const mockERC721Transfers = [
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockERC721Transfers
        }
      });

      const result = await client.getERC721Transfers('0xabc');

      expect(result).toEqual(mockERC721Transfers);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'account',
          action: 'tokennfttx',
          address: '0xabc',
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10000,
          sort: 'desc',
          apikey: 'test-api-key'
        }
      });
    });
  });

  describe('getERC1155Transfers', () => {
    it('should fetch ERC1155 transfers successfully', async () => {
      const mockERC1155Transfers = [
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockERC1155Transfers
        }
      });

      const result = await client.getERC1155Transfers('0xabc');

      expect(result).toEqual(mockERC1155Transfers);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'account',
          action: 'token1155tx',
          address: '0xabc',
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 10000,
          sort: 'desc',
          apikey: 'test-api-key'
        }
      });
    });
  });

  describe('getTokenInfo', () => {
    it('should fetch token information successfully', async () => {
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

      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: mockTokenInfo
        }
      });

      const result = await client.getTokenInfo('0xtoken');

      expect(result).toEqual(mockTokenInfo);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'token',
          action: 'tokeninfo',
          contractaddress: '0xtoken',
          apikey: 'test-api-key'
        }
      });
    });
  });

  describe('getBlockNumberByTimestamp', () => {
    it('should fetch block number by timestamp successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: '1000'
        }
      });

      const result = await client.getBlockNumberByTimestamp(1640995200);

      expect(result).toBe('1000');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: {
          module: 'block',
          action: 'getblocknobytime',
          timestamp: 1640995200,
          closest: 'before',
          apikey: 'test-api-key'
        }
      });
    });

    it('should use after closest when specified', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: '1001'
        }
      });

      await client.getBlockNumberByTimestamp(1640995200, 'after');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('', {
        params: expect.objectContaining({
          closest: 'after'
        })
      });
    });
  });

  describe('API call tracking', () => {
    it('should track API call count', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: []
        }
      });

      expect(client.getApiCallCount()).toBe(0);

      await client.getTransactions('0xabc');
      expect(client.getApiCallCount()).toBe(1);

      await client.getTokenTransfers('0xabc');
      expect(client.getApiCallCount()).toBe(2);
    });

    it('should reset API call count', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: []
        }
      });

      await client.getTransactions('0xabc');
      expect(client.getApiCallCount()).toBe(1);

      client.resetApiCallCount();
      expect(client.getApiCallCount()).toBe(0);
    });
  });

  describe('queue management', () => {
    it('should return queue status', () => {
      const status = client.getQueueStatus();
      
      expect(status).toHaveProperty('queueLength');
      expect(status).toHaveProperty('activeRequests');
      expect(status).toHaveProperty('maxConcurrent');
      expect(status).toHaveProperty('rateLimitPerSecond');
    });

    it('should wait for completion', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          status: '1',
          message: 'OK',
          result: []
        }
      });

      const promise = client.getTransactions('0xabc');
      await client.waitForCompletion();
      await promise;

      expect(mockAxiosInstance.get).toHaveBeenCalled();
    });
  });
});
