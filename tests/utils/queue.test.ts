import { RequestQueue } from '../src/utils/queue';

describe('RequestQueue', () => {
  let requestQueue: RequestQueue;

  beforeEach(() => {
    requestQueue = new RequestQueue({
      maxConcurrent: 2,
      rateLimitPerSecond: 10
    });
  });

  afterEach(() => {
    requestQueue.destroy();
  });

  describe('enqueue', () => {
    it('should execute request immediately when under concurrency limit', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      const result = await requestQueue.enqueue(mockFn);
      
      expect(result).toBe('success');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should queue requests when at concurrency limit', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 100))
      );
      const fastFn = jest.fn().mockResolvedValue('fast');
      
      // Start two slow requests to fill concurrency limit
      const slowPromise1 = requestQueue.enqueue(slowFn);
      const slowPromise2 = requestQueue.enqueue(slowFn);
      
      // Queue a fast request
      const fastPromise = requestQueue.enqueue(fastFn);
      
      // Fast request should not execute immediately
      await new Promise(resolve => setTimeout(resolve, 50));
      expect(fastFn).not.toHaveBeenCalled();
      
      // Wait for slow requests to complete
      await Promise.all([slowPromise1, slowPromise2]);
      
      // Fast request should now execute
      const result = await fastPromise;
      expect(result).toBe('fast');
      expect(fastFn).toHaveBeenCalledTimes(1);
    });

    it('should handle request failures', async () => {
      const mockFn = jest.fn().mockRejectedValue(new Error('Request failed'));
      
      await expect(requestQueue.enqueue(mockFn)).rejects.toThrow('Request failed');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should include context in request ID', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      
      await requestQueue.enqueue(mockFn, 'test-context');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStatus', () => {
    it('should return current queue status', () => {
      const status = requestQueue.getStatus();
      
      expect(status).toEqual({
        queueLength: 0,
        activeRequests: 0,
        maxConcurrent: 2,
        rateLimitPerSecond: 10
      });
    });

    it('should reflect active requests and queue length', async () => {
      const slowFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 100))
      );
      
      // Start requests
      const promise1 = requestQueue.enqueue(slowFn);
      const promise2 = requestQueue.enqueue(slowFn);
      const promise3 = requestQueue.enqueue(slowFn);
      
      // Check status while requests are active
      await new Promise(resolve => setTimeout(resolve, 50));
      const status = requestQueue.getStatus();
      
      expect(status.activeRequests).toBe(2);
      expect(status.queueLength).toBe(1);
      
      // Wait for completion
      await Promise.all([promise1, promise2, promise3]);
    });
  });

  describe('clear', () => {
    it('should clear queue and reject pending requests', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      // Queue multiple requests
      const promise1 = requestQueue.enqueue(mockFn);
      const promise2 = requestQueue.enqueue(mockFn);
      
      // Clear queue
      requestQueue.clear();
      
      // Pending requests should be rejected
      await expect(promise1).rejects.toThrow('Queue cleared');
      await expect(promise2).rejects.toThrow('Queue cleared');
    });
  });

  describe('waitForCompletion', () => {
    it('should wait for all requests to complete', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 50))
      );
      
      // Start multiple requests
      const promises = [
        requestQueue.enqueue(mockFn),
        requestQueue.enqueue(mockFn),
        requestQueue.enqueue(mockFn)
      ];
      
      // Wait for completion
      await requestQueue.waitForCompletion();
      
      // All requests should be completed
      const results = await Promise.all(promises);
      expect(results).toEqual(['success', 'success', 'success']);
    });

    it('should resolve immediately when no requests are active', async () => {
      const startTime = Date.now();
      await requestQueue.waitForCompletion();
      const elapsedTime = Date.now() - startTime;
      
      expect(elapsedTime).toBeLessThan(100);
    });
  });

  describe('destroy', () => {
    it('should stop processing and cleanup', async () => {
      const mockFn = jest.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('success'), 100))
      );
      
      // Queue a request
      const promise = requestQueue.enqueue(mockFn);
      
      // Destroy queue
      requestQueue.destroy();
      
      // Request should be rejected
      await expect(promise).rejects.toThrow('Queue cleared');
    });
  });

  describe('createDefaultConfig', () => {
    it('should return default configuration', () => {
      const config = RequestQueue.createDefaultConfig();
      
      expect(config).toEqual({
        maxConcurrent: 3,
        rateLimitPerSecond: 5
      });
    });
  });

  describe('rate limiting', () => {
    it('should respect rate limit', async () => {
      const requestQueue = new RequestQueue({
        maxConcurrent: 10,
        rateLimitPerSecond: 2
      });

      const mockFn = jest.fn().mockResolvedValue('success');
      
      const startTime = Date.now();
      
      // Queue multiple requests
      const promises = Array(4).fill(null).map(() => requestQueue.enqueue(mockFn));
      
      await Promise.all(promises);
      
      const elapsedTime = Date.now() - startTime;
      
      // Should take at least 1.5 seconds (2 requests per second)
      expect(elapsedTime).toBeGreaterThanOrEqual(1500);
      
      requestQueue.destroy();
    });
  });
});
