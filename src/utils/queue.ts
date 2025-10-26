import { QueueConfig } from '../types';

export interface QueuedRequest<T> {
  id: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

export class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private activeRequests = 0;
  private config: QueueConfig;
  private intervalId?: NodeJS.Timeout;

  constructor(config: QueueConfig) {
    this.config = config;
    this.startProcessing();
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: QueuedRequest<T> = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}${context ? `-${context}` : ''}`,
        fn,
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.queue.push(request);
    });
  }

  /**
   * Start processing the queue
   */
  private startProcessing(): void {
    this.intervalId = setInterval(() => {
      this.processQueue();
    }, 1000 / this.config.rateLimitPerSecond);
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.activeRequests >= this.config.maxConcurrent || this.queue.length === 0) {
      return;
    }

    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests++;
    
    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error as Error);
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      maxConcurrent: this.config.maxConcurrent,
      rateLimitPerSecond: this.config.rateLimitPerSecond
    };
  }

  /**
   * Clear the queue and reject all pending requests
   */
  clear(): void {
    this.queue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.queue = [];
  }

  /**
   * Stop processing and cleanup
   */
  destroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    this.clear();
  }

  /**
   * Wait for all requests to complete
   */
  async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkCompletion = () => {
        if (this.queue.length === 0 && this.activeRequests === 0) {
          resolve();
        } else {
          setTimeout(checkCompletion, 100);
        }
      };
      checkCompletion();
    });
  }

  /**
   * Create default queue configuration
   */
  static createDefaultConfig(): QueueConfig {
    return {
      maxConcurrent: 3,
      rateLimitPerSecond: 5
    };
  }
}
