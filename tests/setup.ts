// Test setup file
import 'dotenv/config';

// Global test configuration
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

// Increase timeout for integration tests
jest.setTimeout(30000);
