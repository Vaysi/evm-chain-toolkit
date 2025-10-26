# Contributing to EVM Chain Toolkit

Thank you for your interest in contributing to EVM Chain Toolkit! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/evm-chain-toolkit.git`
3. Install dependencies: `npm install`
4. Create a new branch: `git checkout -b feature/your-feature-name`

## Development Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn
- Git

### Installation
```bash
git clone https://github.com/vaysi/evm-chain-toolkit.git
cd evm-chain-toolkit
npm install
```

### Running Tests
```bash
npm test
npm run test:coverage
npm run test:watch
```

### Building
```bash
npm run build
```

## Code Style

- Use TypeScript for all new code
- Follow existing code patterns and conventions
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused

## Testing

- Write tests for new functionality
- Ensure all tests pass before submitting
- Aim for high test coverage
- Test both success and error cases

## Pull Request Process

1. Ensure your code follows the project's style guidelines
2. Add tests for any new functionality
3. Update documentation if needed
4. Run `npm test` to ensure all tests pass
5. Submit a pull request with a clear description

### Pull Request Template

- **Description**: Brief description of changes
- **Type of Change**: Bug fix, new feature, breaking change, or documentation update
- **Testing**: How you tested the changes
- **Checklist**: Confirm code follows guidelines and tests pass

## Issues

When reporting issues:
- Use the issue templates
- Provide clear steps to reproduce
- Include environment details (OS, Node.js version, etc.)
- Add relevant error messages or logs

## Feature Requests

When requesting features:
- Describe the problem you're trying to solve
- Explain why this feature would be useful
- Provide examples of how it would work
- Consider if it fits the project's scope

## Code of Conduct

Please be respectful and constructive in all interactions. We aim to create a welcoming environment for all contributors.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
