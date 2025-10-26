import { RetryConfig } from '../types';

export class RetryError extends Error {
  constructor(
    message: string,
    public readonly originalError: Error,
    public readonly attempt: number,
    public readonly maxRetries: number
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

export class RetryUtil {
  private config: RetryConfig;

  constructor(config: RetryConfig) {
    this.config = config;
  }

  /**
   * Executes a function with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context?: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.config.maxRetries) {
          throw new RetryError(
            `Failed after ${this.config.maxRetries} attempts${context ? ` (${context})` : ''}`,
            lastError,
            attempt,
            this.config.maxRetries
          );
        }

        const delay = this.calculateDelay(attempt);
        console.warn(
          `Attempt ${attempt}/${this.config.maxRetries} failed${context ? ` (${context})` : ''}, retrying in ${delay}ms:`,
          lastError.message
        );
        
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Calculates delay with exponential backoff
   */
  private calculateDelay(attempt: number): number {
    const delay = this.config.baseDelayMs * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(delay, this.config.maxDelayMs);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  static isRetryableError(error: Error): boolean {
    // Network errors, timeouts, and rate limiting errors are retryable
    const retryablePatterns = [
      /timeout/i,
      /network/i,
      /connection/i,
      /rate.?limit/i,
      /too.?many.?requests/i,
      /service.?unavailable/i,
      /bad.?gateway/i,
      /gateway.?timeout/i,
      /internal.?server.?error/i
    ];

    return retryablePatterns.some(pattern => pattern.test(error.message));
  }

  /**
   * Create default retry configuration
   */
  static createDefaultConfig(): RetryConfig {
    return {
      maxRetries: 3,
      baseDelayMs: 1000,
      maxDelayMs: 10000,
      backoffMultiplier: 2
    };
  }
}
