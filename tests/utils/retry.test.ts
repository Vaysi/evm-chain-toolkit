import { RetryUtil, RetryError } from '../src/utils/retry';

describe('RetryUtil', () => {
  let retryUtil: RetryUtil;

  beforeEach(() => {
    retryUtil = new RetryUtil({
      maxRetries: 3,
      baseDelayMs: 100,
      maxDelayMs: 1000,
      backoffMultiplier: 2
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await retryUtil.executeWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and eventually succeed', async () => {
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('success');
      
      const result = await retryUtil.executeWithRetry(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should throw RetryError after max retries', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Persistent error'));
      
      await expect(retryUtil.executeWithRetry(mockFn)).rejects.toThrow(RetryError);
      expect(mockFn).toHaveBeenCalledTimes(3);
    });

    it('should include context in error message', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Test error'));
      
      try {
        await retryUtil.executeWithRetry(mockFn, 'test-context');
      } catch (error) {
        expect(error).toBeInstanceOf(RetryError);
        expect((error as RetryError).message).toContain('test-context');
      }
    });

    it('should respect delay configuration', async () => {
      const startTime = Date.now();
      const mockFn = jest.fn()
        .mockRejectedValueOnce(new Error('Error 1'))
        .mockRejectedValueOnce(new Error('Error 2'))
        .mockResolvedValue('success');
      
      await retryUtil.executeWithRetry(mockFn);
      
      const elapsedTime = Date.now() - startTime;
      // Should have at least 100ms + 200ms delay = 300ms
      expect(elapsedTime).toBeGreaterThanOrEqual(300);
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable errors', () => {
      const retryableErrors = [
        'Network timeout',
        'Connection refused',
        'Rate limit exceeded',
        'Too many requests',
        'Service unavailable',
        'Bad gateway',
        'Gateway timeout',
        'Internal server error'
      ];

      retryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        expect(RetryUtil.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable errors', () => {
      const nonRetryableErrors = [
        'Invalid API key',
        'Unauthorized',
        'Not found',
        'Bad request',
        'Validation error'
      ];

      nonRetryableErrors.forEach(errorMessage => {
        const error = new Error(errorMessage);
        expect(RetryUtil.isRetryableError(error)).toBe(false);
      });
    });
  });

  describe('createDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = RetryUtil.createDefaultConfig();
      
      expect(config).toEqual({
        maxRetries: 3,
        baseDelayMs: 1000,
        maxDelayMs: 10000,
        backoffMultiplier: 2
      });
    });
  });

  describe('RetryError', () => {
    it('should contain original error and attempt information', () => {
      const originalError = new Error('Original error');
      const retryError = new RetryError('Retry failed', originalError, 2, 3);
      
      expect(retryError.originalError).toBe(originalError);
      expect(retryError.attempt).toBe(2);
      expect(retryError.maxRetries).toBe(3);
      expect(retryError.name).toBe('RetryError');
    });
  });
});
