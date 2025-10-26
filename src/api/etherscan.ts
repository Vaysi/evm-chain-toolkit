import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiConfig, 
  EtherscanResponse, 
  Transaction, 
  InternalTransaction, 
  TokenTransfer, 
  TokenInfo,
  ERC721Transfer,
  ERC1155Transfer
} from '../types';
import { RetryUtil } from '../utils/retry';
import { RequestQueue } from '../utils/queue';

export class EtherscanClient {
  private httpClient: AxiosInstance;
  private retryUtil: RetryUtil;
  private requestQueue: RequestQueue;
  private config: ApiConfig;
  private apiCallCount = 0;

  constructor(config: ApiConfig) {
    this.config = config;
    this.retryUtil = new RetryUtil(config.retryConfig);
    this.requestQueue = new RequestQueue(config.queueConfig);
    
    this.httpClient = axios.create({
      baseURL: 'https://api.etherscan.io/v2/api',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor for API key
    this.httpClient.interceptors.request.use((config) => {
      config.params = {
        ...config.params,
        apikey: this.config.apiKey,
      };
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 403) {
          throw new Error('Invalid API key or rate limit exceeded');
        }
        throw error;
      }
    );
  }

  /**
   * Get normal transactions for an address
   */
  async getTransactions(
    address: string,
    startBlock?: number,
    endBlock?: number,
    page = 1,
    offset = 10000,
    sort = 'desc'
  ): Promise<Transaction[]> {
    return this.makeRequest<Transaction[]>(
      'account',
      'txlist',
      {
        address,
        startblock: startBlock || 0,
        endblock: endBlock || 99999999,
        page,
        offset,
        sort,
        chainid: 137, // Polygon chain ID
      },
      'getTransactions'
    );
  }

  /**
   * Get internal transactions for an address
   */
  async getInternalTransactions(
    address: string,
    startBlock?: number,
    endBlock?: number,
    page = 1,
    offset = 10000,
    sort = 'desc'
  ): Promise<InternalTransaction[]> {
    return this.makeRequest<InternalTransaction[]>(
      'account',
      'txlistinternal',
      {
        address,
        startblock: startBlock || 0,
        endblock: endBlock || 99999999,
        page,
        offset,
        sort,
        chainid: 137, // Polygon chain ID
      },
      'getInternalTransactions'
    );
  }

  /**
   * Get ERC-20 token transfers for an address
   */
  async getTokenTransfers(
    address: string,
    contractAddress?: string,
    startBlock?: number,
    endBlock?: number,
    page = 1,
    offset = 10000,
    sort = 'desc'
  ): Promise<TokenTransfer[]> {
    const params: any = {
      address,
      startblock: startBlock || 0,
      endblock: endBlock || 99999999,
      page,
      offset,
      sort,
      chainid: 137, // Polygon chain ID
    };

    if (contractAddress) {
      params.contractaddress = contractAddress;
    }

    return this.makeRequest<TokenTransfer[]>(
      'account',
      'tokentx',
      params,
      'getTokenTransfers'
    );
  }

  /**
   * Get ERC-721 NFT transfers for an address
   */
  async getERC721Transfers(
    address: string,
    contractAddress?: string,
    startBlock?: number,
    endBlock?: number,
    page = 1,
    offset = 10000,
    sort = 'desc'
  ): Promise<ERC721Transfer[]> {
    const params: any = {
      address,
      startblock: startBlock || 0,
      endblock: endBlock || 99999999,
      page,
      offset,
      sort,
      chainid: 137, // Polygon chain ID
    };

    if (contractAddress) {
      params.contractaddress = contractAddress;
    }

    return this.makeRequest<ERC721Transfer[]>(
      'account',
      'tokennfttx',
      params,
      'getERC721Transfers'
    );
  }

  /**
   * Get ERC-1155 multi-token transfers for an address
   */
  async getERC1155Transfers(
    address: string,
    contractAddress?: string,
    startBlock?: number,
    endBlock?: number,
    page = 1,
    offset = 10000,
    sort = 'desc'
  ): Promise<ERC1155Transfer[]> {
    const params: any = {
      address,
      startblock: startBlock || 0,
      endblock: endBlock || 99999999,
      page,
      offset,
      sort,
      chainid: 137, // Polygon chain ID
    };

    if (contractAddress) {
      params.contractaddress = contractAddress;
    }

    return this.makeRequest<ERC1155Transfer[]>(
      'account',
      'token1155tx',
      params,
      'getERC1155Transfers'
    );
  }

  /**
   * Get token information
   */
  async getTokenInfo(contractAddress: string): Promise<TokenInfo> {
    return this.makeRequest<TokenInfo>(
      'token',
      'tokeninfo',
      { 
        contractaddress: contractAddress,
        chainid: 137, // Polygon chain ID
      },
      'getTokenInfo'
    );
  }

  /**
   * Get block number by timestamp
   */
  async getBlockNumberByTimestamp(timestamp: number, closest: 'before' | 'after' = 'before'): Promise<string> {
    return this.makeRequest<string>(
      'block',
      'getblocknobytime',
      { 
        timestamp, 
        closest,
        chainid: 137, // Polygon chain ID
      },
      'getBlockNumberByTimestamp'
    );
  }

  /**
   * Make a request with retry logic and queue management
   */
  private async makeRequest<T>(
    module: string,
    action: string,
    params: Record<string, any>,
    context: string
  ): Promise<T> {
    return this.requestQueue.enqueue(async () => {
      return this.retryUtil.executeWithRetry(async () => {
        const response: AxiosResponse<EtherscanResponse<T>> = await this.httpClient.get('', {
          params: {
            module,
            action,
            ...params,
          },
        });

        this.apiCallCount++;

        if (response.data.status === '0') {
          // Check if it's just "No transactions found" - this is a valid response
          if (response.data.message === 'No transactions found' || 
              response.data.message === 'OK' ||
              (Array.isArray(response.data.result) && response.data.result.length === 0)) {
            return response.data.result;
          }
          
          console.error('API Error Details:', {
            status: response.data.status,
            message: response.data.message,
            result: response.data.result,
            module,
            action,
            params
          });
          throw new Error(`API Error: ${response.data.message}`);
        }

        return response.data.result;
      }, context);
    }, context);
  }

  /**
   * Get API call count
   */
  getApiCallCount(): number {
    return this.apiCallCount;
  }

  /**
   * Reset API call count
   */
  resetApiCallCount(): void {
    this.apiCallCount = 0;
  }

  /**
   * Get queue status
   */
  getQueueStatus() {
    return this.requestQueue.getStatus();
  }

  /**
   * Wait for all queued requests to complete
   */
  async waitForCompletion(): Promise<void> {
    return this.requestQueue.waitForCompletion();
  }

  /**
   * Destroy the client and cleanup resources
   */
  destroy(): void {
    this.requestQueue.destroy();
  }
}
