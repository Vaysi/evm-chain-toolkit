import { TokenParser } from '../src/services/token-parser';
import { EtherscanClient } from '../src/api/etherscan';
import { 
  TokenTransfer, 
  ERC721Transfer, 
  ERC1155Transfer, 
  TokenInfo,
  ParsedTokenTransfer 
} from '../src/types';

// Mock EtherscanClient
jest.mock('../src/api/etherscan');
const MockedEtherscanClient = EtherscanClient as jest.MockedClass<typeof EtherscanClient>;

describe('TokenParser', () => {
  let tokenParser: TokenParser;
  let mockEtherscanClient: jest.Mocked<EtherscanClient>;

  beforeEach(() => {
    mockEtherscanClient = new MockedEtherscanClient() as jest.Mocked<EtherscanClient>;
    tokenParser = new TokenParser(mockEtherscanClient);
  });

  describe('parseERC20Transfers', () => {
    it('should parse ERC-20 token transfers correctly', () => {
      const mockTransfers: TokenTransfer[] = [
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

      const result = tokenParser.parseERC20Transfers(mockTransfers);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        standard: 'ERC20',
        contractAddress: '0xtoken',
        from: '0xabc',
        to: '0xdef',
        value: '1000000000000000000',
        transactionHash: '0x123',
        blockNumber: '100',
        timestamp: '1640995200',
        tokenMetadata: {
          address: '0xtoken',
          name: 'Test Token',
          symbol: 'TEST',
          decimals: '18',
          totalSupply: '0',
          owner: '',
          txsCount: '0',
          transfersCount: '0',
          lastUpdated: ''
        }
      });
    });

    it('should handle multiple transfers', () => {
      const mockTransfers: TokenTransfer[] = [
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
          tokenName: 'Token 1',
          tokenSymbol: 'T1',
          tokenDecimal: '18',
          gas: '21000',
          gasPrice: '20000000000',
          gasUsed: '21000',
          cumulativeGasUsed: '21000',
          input: '0x',
          contractAddress: '0xtoken1'
        },
        {
          blockNumber: '101',
          timeStamp: '1640995260',
          hash: '0x456',
          nonce: '2',
          blockHash: '0xblock2',
          transactionIndex: '1',
          from: '0xdef',
          to: '0xghi',
          value: '2000000000000000000',
          tokenName: 'Token 2',
          tokenSymbol: 'T2',
          tokenDecimal: '6',
          gas: '21000',
          gasPrice: '20000000000',
          gasUsed: '21000',
          cumulativeGasUsed: '21000',
          input: '0x',
          contractAddress: '0xtoken2'
        }
      ];

      const result = tokenParser.parseERC20Transfers(mockTransfers);

      expect(result).toHaveLength(2);
      expect(result[0].standard).toBe('ERC20');
      expect(result[1].standard).toBe('ERC20');
      expect(result[0].contractAddress).toBe('0xtoken1');
      expect(result[1].contractAddress).toBe('0xtoken2');
    });
  });

  describe('parseERC721Transfers', () => {
    it('should parse ERC-721 NFT transfers correctly', () => {
      const mockTransfers: ERC721Transfer[] = [
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

      const result = tokenParser.parseERC721Transfers(mockTransfers);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        standard: 'ERC721',
        contractAddress: '0xnft',
        from: '0xabc',
        to: '0xdef',
        tokenId: '1',
        transactionHash: '0x123',
        blockNumber: '100',
        timestamp: '1640995200',
        tokenMetadata: {
          address: '0xnft',
          name: 'Test NFT',
          symbol: 'TNFT',
          decimals: '0',
          totalSupply: '0',
          owner: '',
          txsCount: '0',
          transfersCount: '0',
          lastUpdated: ''
        }
      });
    });
  });

  describe('parseERC1155Transfers', () => {
    it('should parse ERC-1155 multi-token transfers correctly', () => {
      const mockTransfers: ERC1155Transfer[] = [
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

      const result = tokenParser.parseERC1155Transfers(mockTransfers);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        standard: 'ERC1155',
        contractAddress: '0xmulti',
        from: '0xabc',
        to: '0xdef',
        tokenId: '1',
        value: '5',
        transactionHash: '0x123',
        blockNumber: '100',
        timestamp: '1640995200',
        tokenMetadata: {
          address: '0xmulti',
          name: 'Test Multi Token',
          symbol: 'TMT',
          decimals: '0',
          totalSupply: '0',
          owner: '',
          txsCount: '0',
          transfersCount: '0',
          lastUpdated: ''
        }
      });
    });
  });

  describe('getTokenMetadata', () => {
    it('should fetch and cache token metadata', async () => {
      const mockTokenInfo: TokenInfo = {
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

      mockEtherscanClient.getTokenInfo.mockResolvedValue(mockTokenInfo);

      const result = await tokenParser.getTokenMetadata('0xtoken');

      expect(result).toEqual(mockTokenInfo);
      expect(mockEtherscanClient.getTokenInfo).toHaveBeenCalledWith('0xtoken');

      // Second call should use cache
      const cachedResult = await tokenParser.getTokenMetadata('0xtoken');
      expect(cachedResult).toEqual(mockTokenInfo);
      expect(mockEtherscanClient.getTokenInfo).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      mockEtherscanClient.getTokenInfo.mockRejectedValue(new Error('API Error'));

      const result = await tokenParser.getTokenMetadata('0xtoken');

      expect(result).toBeNull();
    });
  });

  describe('enhanceTransfersWithMetadata', () => {
    it('should enhance transfers with additional metadata', async () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200'
        }
      ];

      const mockTokenInfo: TokenInfo = {
        address: '0xtoken',
        name: 'Enhanced Token',
        symbol: 'ENH',
        decimals: '18',
        totalSupply: '1000000000000000000000000',
        owner: '0xowner',
        txsCount: '100',
        transfersCount: '50',
        lastUpdated: '1640995200'
      };

      mockEtherscanClient.getTokenInfo.mockResolvedValue(mockTokenInfo);

      const result = await tokenParser.enhanceTransfersWithMetadata(mockTransfers);

      expect(result).toHaveLength(1);
      expect(result[0].tokenMetadata).toEqual(mockTokenInfo);
    });

    it('should handle transfers without metadata', async () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200'
        }
      ];

      mockEtherscanClient.getTokenInfo.mockResolvedValue(null);

      const result = await tokenParser.enhanceTransfersWithMetadata(mockTransfers);

      expect(result).toHaveLength(1);
      expect(result[0].tokenMetadata).toBeUndefined();
    });
  });

  describe('parseAllTokenTransfers', () => {
    it('should parse all token transfer types', async () => {
      const mockERC20Transfers: TokenTransfer[] = [
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
          blockNumber: '101',
          timeStamp: '1640995260',
          hash: '0x456',
          nonce: '2',
          blockHash: '0xblock2',
          from: '0xdef',
          to: '0xghi',
          tokenID: '1',
          tokenName: 'Test NFT',
          tokenSymbol: 'TNFT',
          tokenDecimal: '0',
          transactionIndex: '1',
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
          blockNumber: '102',
          timeStamp: '1640995320',
          hash: '0x789',
          nonce: '3',
          blockHash: '0xblock3',
          from: '0xghi',
          to: '0xjkl',
          tokenID: '2',
          tokenValue: '5',
          tokenName: 'Test Multi Token',
          tokenSymbol: 'TMT',
          transactionIndex: '2',
          gas: '21000',
          gasPrice: '20000000000',
          gasUsed: '21000',
          cumulativeGasUsed: '21000',
          input: '0x',
          contractAddress: '0xmulti'
        }
      ];

      mockEtherscanClient.getTokenInfo.mockResolvedValue({
        address: '0xtoken',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: '18',
        totalSupply: '1000000000000000000000000',
        owner: '0xowner',
        txsCount: '100',
        transfersCount: '50',
        lastUpdated: '1640995200'
      });

      const result = await tokenParser.parseAllTokenTransfers(
        mockERC20Transfers,
        mockERC721Transfers,
        mockERC1155Transfers,
        true
      );

      expect(result).toHaveLength(3);
      expect(result[0].standard).toBe('ERC20');
      expect(result[1].standard).toBe('ERC721');
      expect(result[2].standard).toBe('ERC1155');
    });
  });

  describe('groupTransfersByContract', () => {
    it('should group transfers by contract address', () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC20',
          contractAddress: '0xtoken1',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200'
        },
        {
          standard: 'ERC20',
          contractAddress: '0xtoken1',
          from: '0xdef',
          to: '0xghi',
          value: '2000000000000000000',
          transactionHash: '0x456',
          blockNumber: '101',
          timestamp: '1640995260'
        },
        {
          standard: 'ERC20',
          contractAddress: '0xtoken2',
          from: '0xghi',
          to: '0xjkl',
          value: '3000000000000000000',
          transactionHash: '0x789',
          blockNumber: '102',
          timestamp: '1640995320'
        }
      ];

      const result = tokenParser.groupTransfersByContract(mockTransfers);

      expect(result.size).toBe(2);
      expect(result.get('0xtoken1')).toHaveLength(2);
      expect(result.get('0xtoken2')).toHaveLength(1);
    });
  });

  describe('getUniqueTokens', () => {
    it('should return unique tokens', () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200'
        },
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xdef',
          to: '0xghi',
          value: '2000000000000000000',
          transactionHash: '0x456',
          blockNumber: '101',
          timestamp: '1640995260'
        },
        {
          standard: 'ERC721',
          contractAddress: '0xnft',
          from: '0xghi',
          to: '0xjkl',
          tokenId: '1',
          transactionHash: '0x789',
          blockNumber: '102',
          timestamp: '1640995320'
        }
      ];

      const result = tokenParser.getUniqueTokens(mockTransfers);

      expect(result).toHaveLength(2);
      expect(result[0].contractAddress).toBe('0xtoken');
      expect(result[1].contractAddress).toBe('0xnft');
    });
  });

  describe('calculateTotalValue', () => {
    it('should calculate total value for ERC-20 tokens', () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xabc',
          to: '0xdef',
          value: '1000000000000000000',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200',
          tokenMetadata: {
            address: '0xtoken',
            name: 'Test Token',
            symbol: 'TEST',
            decimals: '18',
            totalSupply: '1000000000000000000000000',
            owner: '0xowner',
            txsCount: '100',
            transfersCount: '50',
            lastUpdated: '1640995200'
          }
        },
        {
          standard: 'ERC20',
          contractAddress: '0xtoken',
          from: '0xdef',
          to: '0xghi',
          value: '2000000000000000000',
          transactionHash: '0x456',
          blockNumber: '101',
          timestamp: '1640995260',
          tokenMetadata: {
            address: '0xtoken',
            name: 'Test Token',
            symbol: 'TEST',
            decimals: '18',
            totalSupply: '1000000000000000000000000',
            owner: '0xowner',
            txsCount: '100',
            transfersCount: '50',
            lastUpdated: '1640995200'
          }
        }
      ];

      const result = tokenParser.calculateTotalValue(mockTransfers);

      expect(result.size).toBe(1);
      expect(result.get('0xtoken')).toEqual({
        value: '3000000000000000000',
        decimals: 18,
        symbol: 'TEST'
      });
    });

    it('should ignore non-ERC20 transfers', () => {
      const mockTransfers: ParsedTokenTransfer[] = [
        {
          standard: 'ERC721',
          contractAddress: '0xnft',
          from: '0xabc',
          to: '0xdef',
          tokenId: '1',
          transactionHash: '0x123',
          blockNumber: '100',
          timestamp: '1640995200'
        }
      ];

      const result = tokenParser.calculateTotalValue(mockTransfers);

      expect(result.size).toBe(0);
    });
  });

  describe('clearCache', () => {
    it('should clear metadata cache', async () => {
      const mockTokenInfo: TokenInfo = {
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

      mockEtherscanClient.getTokenInfo.mockResolvedValue(mockTokenInfo);

      // Fetch and cache metadata
      await tokenParser.getTokenMetadata('0xtoken');
      expect(mockEtherscanClient.getTokenInfo).toHaveBeenCalledTimes(1);

      // Clear cache
      tokenParser.clearCache();

      // Fetch again should make new API call
      await tokenParser.getTokenMetadata('0xtoken');
      expect(mockEtherscanClient.getTokenInfo).toHaveBeenCalledTimes(2);
    });
  });
});
