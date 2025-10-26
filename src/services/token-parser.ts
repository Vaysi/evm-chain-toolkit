import { 
  TokenTransfer, 
  ERC721Transfer, 
  ERC1155Transfer, 
  TokenInfo, 
  ParsedTokenTransfer,
  TokenStandard 
} from '../types';
import { EtherscanClient } from '../api/etherscan';

export class TokenParser {
  private etherscanClient: EtherscanClient;
  private tokenMetadataCache = new Map<string, TokenInfo>();

  constructor(etherscanClient: EtherscanClient) {
    this.etherscanClient = etherscanClient;
  }

  /**
   * Parse ERC-20 token transfers
   */
  parseERC20Transfers(transfers: TokenTransfer[]): ParsedTokenTransfer[] {
    return transfers.map(transfer => ({
      standard: 'ERC20' as TokenStandard,
      contractAddress: transfer.contractAddress,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      transactionHash: transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timeStamp,
      tokenMetadata: {
        address: transfer.contractAddress,
        name: transfer.tokenName,
        symbol: transfer.tokenSymbol,
        decimals: transfer.tokenDecimal,
        totalSupply: '0',
        owner: '',
        txsCount: '0',
        transfersCount: '0',
        lastUpdated: ''
      }
    }));
  }

  /**
   * Parse ERC-721 NFT transfers
   */
  parseERC721Transfers(transfers: ERC721Transfer[]): ParsedTokenTransfer[] {
    return transfers.map(transfer => ({
      standard: 'ERC721' as TokenStandard,
      contractAddress: transfer.contractAddress,
      from: transfer.from,
      to: transfer.to,
      tokenId: transfer.tokenID,
      transactionHash: transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timeStamp,
      tokenMetadata: {
        address: transfer.contractAddress,
        name: transfer.tokenName,
        symbol: transfer.tokenSymbol,
        decimals: transfer.tokenDecimal,
        totalSupply: '0',
        owner: '',
        txsCount: '0',
        transfersCount: '0',
        lastUpdated: ''
      }
    }));
  }

  /**
   * Parse ERC-1155 multi-token transfers
   */
  parseERC1155Transfers(transfers: ERC1155Transfer[]): ParsedTokenTransfer[] {
    return transfers.map(transfer => ({
      standard: 'ERC1155' as TokenStandard,
      contractAddress: transfer.contractAddress,
      from: transfer.from,
      to: transfer.to,
      tokenId: transfer.tokenID,
      value: transfer.tokenValue,
      transactionHash: transfer.hash,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timeStamp,
      tokenMetadata: {
        address: transfer.contractAddress,
        name: transfer.tokenName,
        symbol: transfer.tokenSymbol,
        decimals: '0',
        totalSupply: '0',
        owner: '',
        txsCount: '0',
        transfersCount: '0',
        lastUpdated: ''
      }
    }));
  }

  /**
   * Get token metadata with caching
   */
  async getTokenMetadata(contractAddress: string): Promise<TokenInfo | null> {
    if (this.tokenMetadataCache.has(contractAddress)) {
      return this.tokenMetadataCache.get(contractAddress)!;
    }

    try {
      const tokenInfo = await this.etherscanClient.getTokenInfo(contractAddress);
      this.tokenMetadataCache.set(contractAddress, tokenInfo);
      return tokenInfo;
    } catch (error) {
      console.warn(`Failed to fetch token metadata for ${contractAddress}:`, error);
      return null;
    }
  }

  /**
   * Enhance parsed transfers with additional token metadata
   */
  async enhanceTransfersWithMetadata(transfers: ParsedTokenTransfer[]): Promise<ParsedTokenTransfer[]> {
    const enhancedTransfers: ParsedTokenTransfer[] = [];
    const uniqueContracts = new Set(transfers.map(t => t.contractAddress));

    // Fetch metadata for all unique contracts
    const metadataPromises = Array.from(uniqueContracts).map(async (contractAddress) => {
      const metadata = await this.getTokenMetadata(contractAddress);
      return { contractAddress, metadata };
    });

    const metadataResults = await Promise.all(metadataPromises);
    const metadataMap = new Map(
      metadataResults.map(result => [result.contractAddress, result.metadata])
    );

    // Enhance transfers with metadata
    for (const transfer of transfers) {
      const metadata = metadataMap.get(transfer.contractAddress);
      if (metadata) {
        enhancedTransfers.push({
          ...transfer,
          tokenMetadata: metadata
        });
      } else {
        enhancedTransfers.push(transfer);
      }
    }

    return enhancedTransfers;
  }

  /**
   * Parse all token transfers from different standards
   */
  async parseAllTokenTransfers(
    erc20Transfers: TokenTransfer[],
    erc721Transfers: ERC721Transfer[],
    erc1155Transfers: ERC1155Transfer[],
    enhanceWithMetadata = true
  ): Promise<ParsedTokenTransfer[]> {
    const allTransfers: ParsedTokenTransfer[] = [
      ...this.parseERC20Transfers(erc20Transfers),
      ...this.parseERC721Transfers(erc721Transfers),
      ...this.parseERC1155Transfers(erc1155Transfers)
    ];

    if (enhanceWithMetadata) {
      return this.enhanceTransfersWithMetadata(allTransfers);
    }

    return allTransfers;
  }

  /**
   * Group transfers by token contract
   */
  groupTransfersByContract(transfers: ParsedTokenTransfer[]): Map<string, ParsedTokenTransfer[]> {
    const grouped = new Map<string, ParsedTokenTransfer[]>();

    for (const transfer of transfers) {
      const contractAddress = transfer.contractAddress;
      if (!grouped.has(contractAddress)) {
        grouped.set(contractAddress, []);
      }
      grouped.get(contractAddress)!.push(transfer);
    }

    return grouped;
  }

  /**
   * Get unique tokens from transfers
   */
  getUniqueTokens(transfers: ParsedTokenTransfer[]): ParsedTokenTransfer[] {
    const uniqueTokens = new Map<string, ParsedTokenTransfer>();

    for (const transfer of transfers) {
      const key = `${transfer.contractAddress}-${transfer.tokenId || 'ERC20'}`;
      if (!uniqueTokens.has(key)) {
        uniqueTokens.set(key, transfer);
      }
    }

    return Array.from(uniqueTokens.values());
  }

  /**
   * Calculate total value for ERC-20 tokens
   */
  calculateTotalValue(transfers: ParsedTokenTransfer[]): Map<string, { value: string; decimals: number; symbol: string }> {
    const totals = new Map<string, { value: string; decimals: number; symbol: string }>();

    for (const transfer of transfers) {
      if (transfer.standard === 'ERC20' && transfer.value && transfer.tokenMetadata) {
        const contractAddress = transfer.contractAddress;
        const decimals = parseInt(transfer.tokenMetadata.decimals) || 0;
        const symbol = transfer.tokenMetadata.symbol || 'UNKNOWN';

        if (!totals.has(contractAddress)) {
          totals.set(contractAddress, { value: '0', decimals, symbol });
        }

        const current = totals.get(contractAddress)!;
        const currentValue = BigInt(current.value);
        const transferValue = BigInt(transfer.value);
        const newValue = currentValue + transferValue;

        totals.set(contractAddress, {
          value: newValue.toString(),
          decimals,
          symbol
        });
      }
    }

    return totals;
  }

  /**
   * Clear metadata cache
   */
  clearCache(): void {
    this.tokenMetadataCache.clear();
  }
}
