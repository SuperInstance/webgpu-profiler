# Contributing to Browser GPU Profiler

First off, thank you for considering contributing to Browser GPU Profiler! It's people like you that make Browser GPU Profiler such a great tool for GPU profiling and WebGPU optimization.

## Code of Conduct

This project and everyone participating in it is governed by the Browser GPU Profiler Code of Conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to [support@superinstance.github.io](mailto:support@superinstance.github.io).

## How Can I Contribute?

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that the problem has already been reported. When you create a bug report, include as many details as possible:

**Provide a descriptive title**

**Describe the exact steps to reproduce the problem**
1. Go to '...'
2. Run '....'
3. Scroll down to '....'
4. See error

**Provide specific examples to demonstrate the steps**
- Include screenshots or code samples
- Share your profiler configuration
- Include error logs and stack traces
- Browser and GPU information

**Describe the behavior you observed and what you expected**

**Describe your environment**
- OS: [e.g. macOS 13.0, Windows 11, Ubuntu 22.04]
- Browser: [e.g. Chrome 120, Firefox 121, Safari 17]
- GPU: [e.g. NVIDIA RTX 3080, AMD Radeon RX 6800, Apple M1]
- Browser GPU Profiler version: [e.g. 1.0.0]
- WebGPU enabled: [Yes/No]

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful for GPU profiling**
- **List some examples of how this feature would be used**
- **Include mock-ups or examples if applicable**

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Install dependencies**: `npm install`
3. **Make your changes** with clear, descriptive commit messages.
4. **Write or update tests** for your changes.
5. **Ensure all tests pass**: `npm test`
6. **Run linting**: `npm run lint`
7. **Build the project**: `npm run build`
8. **Update documentation** if you've changed functionality.
9. **Submit a pull request** with a clear description of the changes.

#### Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/browser-gpu-profiler.git
cd browser-gpu-profiler

# Install dependencies
npm install

# Watch mode for development
npm run dev

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Build for production
npm run build

# Run linter
npm run lint

# Type check
npm run type-check
```

#### Code Style

- Use TypeScript strict mode
- Follow existing code structure and patterns
- Write meaningful comments for complex GPU operations
- Use descriptive variable and function names
- Keep functions small and focused
- Write tests for new features
- Optimize GPU performance for all profiling operations

#### Commit Messages

Follow the Conventional Commits specification:

```
feat: add WebGPU pipeline profiling
fix: resolve memory tracking issue
docs: update GPU metrics documentation
test: add tests for shader performance
refactor: optimize GPU benchmark logic
perf: improve frame capture performance
```

### Adding Features

When adding new features:

1. **Discuss in an issue first** to get feedback
2. **Break the feature into small, manageable PRs**
3. **Write tests first** (Test-Driven Development)
4. **Update documentation** (README, API docs, examples)
5. **Add examples** demonstrating the new feature
6. **Consider GPU performance implications**

### GPU Metrics Integration

When adding new GPU metrics or profiling capabilities:

1. **Implement the metric interface**
   ```typescript
   interface GPUMetric {
     name: string;
     description: string;
     unit: string;
     capture(): Promise<number>;
     isSupported(): boolean;
   }
   ```

2. **Add WebGPU fallback** for unsupported features
3. **Write comprehensive tests** including:
   - Unit tests for metric capture
   - Integration tests with real WebGPU contexts
   - Mock tests for offline development

4. **Update documentation**:
   - Add metric to README
   - Create usage example
   - Document browser/GPU compatibility
   - Note any performance overhead

5. **Add benchmark example** using the new metric

## Project Structure

```
browser-gpu-profiler/
├── src/
│   ├── profiler/         # Core profiling logic
│   ├── benchmarks/       # GPU benchmark operations
│   ├── metrics/          # GPU metric collectors
│   └── types.ts          # TypeScript type definitions
├── tests/                # Test files
├── examples/             # Example profiling scenarios
├── docs/                 # Documentation
└── dist/                 # Compiled JavaScript (generated)
```

## Testing

We use Vitest for testing. Run tests with:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm test -- profiler.test.ts
```

### Writing Tests

- Write descriptive test names
- Test both success and failure cases
- Use mocks for WebGPU contexts when appropriate
- Keep tests independent and focused
- Aim for high code coverage (>80%)
- Test GPU fallback behavior

### WebGPU Testing

- Test with real WebGPU contexts when available
- Provide mocks for development environments without WebGPU
- Test browser compatibility (Chrome, Firefox, Safari)
- Test GPU fallback behavior
- Verify performance characteristics

## Documentation

Documentation is crucial for the project's success. When contributing:

- **README.md**: Update for new features or breaking changes
- **API.md**: Document new profiling APIs
- **Examples**: Add examples for new profiling features
- **Comments**: Comment complex GPU operations
- **CHANGELOG.md**: Document changes in each version

### GPU Profiling Best Practices

When documenting profiling features:
- Explain what GPU metric is being measured
- Note any performance overhead
- List browser/GPU compatibility
- Provide usage examples
- Explain interpretation of results

## Release Process

Releases are managed by the maintainers:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag: `git tag v1.0.0`
4. Push tag: `git push origin v1.0.0`
5. GitHub Actions will publish to npm

## Performance Guidelines

Browser GPU Profiler is designed to have minimal impact on application performance:

- **Zero overhead when disabled**: Profiler should not affect performance when not in use
- **Efficient capture**: Minimize GPU stall points during metric capture
- **Batch operations**: Group GPU reads/writes to reduce overhead
- **Async operations**: Use async/await to avoid blocking main thread
- **Memory efficient**: Clean up GPU resources properly

## Community Guidelines

- Be respectful and inclusive
- Provide constructive feedback
- Help others when you can
- Follow the Code of Conduct
- Focus on what is best for the community
- Consider GPU performance implications in all discussions

## Getting Help

- **Documentation**: Start with the README and docs/
- **Issues**: Search existing issues or create a new one
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [support@superinstance.github.io](mailto:support@superinstance.github.io)

## GPU Profiling Resources

Contributors should be familiar with:

- **WebGPU Specification**: https://www.w3.org/TR/webgpu/
- **GPU Profiling Concepts**: Frame timing, pipeline statistics, memory usage
- **Browser DevTools**: Performance profiling, GPU memory inspection
- **Shader Performance**: Instruction counting, register pressure, occupancy

## Recognition

Contributors will be recognized in:
- The CONTRIBUTORS.md file
- Release notes for significant contributions
- The project's README

Thank you for contributing to Browser GPU Profiler and making GPU profiling more accessible!
