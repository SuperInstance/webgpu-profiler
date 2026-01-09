# Security Policy

## Supported Versions

Currently, only the latest version of Browser GPU Profiler is supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: Yes |

## Reporting a Vulnerability

If you discover a security vulnerability in Browser GPU Profiler, please report it to us responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please send an email to [security@superinstance.github.io](mailto:security@superinstance.github.io) with:

* A description of the vulnerability
* Steps to reproduce the issue
* Any potential impact you've identified
* If possible, a suggested fix or mitigation

### What to Expect

Once you've submitted a vulnerability report:

1. **Acknowledgment**: We will respond within 48 hours to acknowledge receipt
2. **Investigation**: We will investigate the issue and determine severity
3. **Resolution**: We will work on a fix and aim to release a patch within 7 days for critical issues
4. **Disclosure**: We will coordinate public disclosure with you

## Security Best Practices for Users

### WebGPU Context Security

- **Validate all WebGPU inputs**: Ensure all data passed to WebGPU operations is validated
- **Secure shader compilation**: Only compile shaders from trusted sources
- **Resource limits**: Implement appropriate limits on GPU resource allocation
- **Memory safety**: Properly clean up GPU buffers and textures after use

### Browser Security

- **Use HTTPS**: Always load the profiler over HTTPS in production
- **Content Security Policy**: Implement strict CSP headers to prevent XSS attacks
- **Origin validation**: Validate the origin when profiling cross-origin content
- **Permissions**: Respect browser permission requirements for WebGPU access

### Data Privacy

- **No sensitive data logging**: The profiler does not log or transmit sensitive data
- **Local processing**: All profiling data is processed locally in the browser
- **No telemetry**: Browser GPU Profiler does not collect telemetry or usage data
- **GPU information**: GPU information is read-only and used solely for profiling

### Environment Variables

Browser GPU Profiler is designed to work with zero configuration. For advanced usage:

```bash
# Optional: Enable debug mode (development only)
BROWSER_GPU_PROFILER_DEBUG=true

# Optional: Custom profiling thresholds
BROWSER_GPU_PROFILER_THRESHOLD_MS=16.67
```

### Dependency Management

- Regularly update dependencies: `npm update`
- Audit dependencies for vulnerabilities: `npm audit`
- Review security advisories for dependencies
- Keep Node.js updated to the latest stable version
- Review WebGPU polyfill dependencies for security issues

### Input Validation

- Validate all GPU metric inputs before processing
- Sanitize configuration data from external sources
- Implement rate limiting for profiling operations
- Protect against GPU memory exhaustion attacks
- Validate shader code before compilation

## Security Features

### Current Security Measures

- **Input Validation**: All profiling inputs are validated using TypeScript types
- **Memory Safety**: Proper GPU resource cleanup and memory management
- **Dependency Auditing**: Regular security audits of dependencies
- **Type Safety**: TypeScript strict mode catches many potential issues at compile time
- **Browser Security**: Leverages browser security model for WebGPU access
- **No External Requests**: All profiling happens locally, no external API calls

### WebGPU Security

- **Context Isolation**: Each profiler instance works in isolated WebGPU context
- **Resource Limits**: Respects browser-imposed GPU resource limits
- **No Shader Injection**: Does not inject or modify application shaders
- **Read-Only Metrics**: GPU metrics are read-only and non-destructive
- **Secure Compilation**: Shaders compiled using secure WebGPU compilation

### Known Limitations

- **WebGPU Access**: Requires browser support for WebGPU API
- **GPU Information**: Profiler relies on browser-reported GPU information
- **Performance Impact**: Minimal overhead, but profiling does have some performance cost
- **Browser Compatibility**: Security varies by browser and WebGPU implementation
- **Memory Constraints**: Limited by browser GPU memory allocation

## Security Audits

This project has not yet undergone a formal security audit. We welcome contributions from security researchers and encourage responsible disclosure of any vulnerabilities found.

### Security Research

We encourage security research into Browser GPU Profiler:

- **Responsible Disclosure**: Please report vulnerabilities privately
- **Testing Guidelines**: Test against your own applications and GPUs
- **Documentation**: Document any security findings with clear reproduction steps
- **Collaboration**: Work with us on security improvements

## Dependency Security

We actively monitor our dependencies for security vulnerabilities:

- Minimal dependency footprint to reduce attack surface
- No runtime dependencies (zero dependencies in production)
- Regular `npm audit` checks
- Immediate action on high-severity vulnerabilities
- Automated Dependabot security updates

## GPU Memory Security

### Memory Management

- **Automatic Cleanup**: Profiler automatically cleans up GPU resources
- **Buffer Limits**: Respects browser-imposed buffer size limits
- **Texture Limits**: Enforces texture dimension and format limits
- **Memory Monitoring**: Tracks GPU memory usage to detect leaks
- **Resource Pooling**: Reuses GPU resources to reduce allocation overhead

### Memory Leak Prevention

- **Proper Disposal**: All GPU resources properly disposed on cleanup
- **Weak References**: Uses weak references where appropriate
- **Garbage Collection**: Compatible with JavaScript garbage collection
- **Resource Tracking**: Tracks allocated resources for proper cleanup

## WebGPU Specification Compliance

Browser GPU Profiler follows the WebGPU security model:

- **Same-Origin Policy**: Respects browser same-origin policy
- **Permission Requirements**: Follows WebGPU permission requirements
- **Context Limits**: Enforces WebGPU context limits
- **Adapter Selection**: Safe GPU adapter selection process
- **Queue Management**: Proper WebGPU queue management and synchronization

## Contact Information

For security-related inquiries:

* **Security Vulnerabilities**: [security@superinstance.github.io](mailto:security@superinstance.github.io)
* **General Inquiries**: [support@superinstance.github.io](mailto:support@superinstance.github.io)

## Response Time Commitments

* **Critical Vulnerabilities**: 48 hours initial response, 7 days for fix
* **High Severity**: 72 hours initial response, 14 days for fix
* **Medium Severity**: 1 week initial response, 30 days for fix
* **Low Severity**: 2 weeks initial response, next release for fix

## Security-Related Features

### GPU Capability Detection

- **Safe Detection**: Non-destructive GPU capability queries
- **Fallback Handling**: Graceful fallback for unsupported features
- **Feature Detection**: Comprehensive feature detection before use
- **Browser Compatibility**: Respects browser security restrictions

### Profiling Isolation

- **Separate Context**: Profiler uses separate WebGPU context when possible
- **Non-Invasive**: Minimal impact on application performance and security
- **Read-Only**: GPU metrics are collected in read-only manner
- **No Code Execution**: Does not execute arbitrary code on GPU

Thank you for helping keep Browser GPU Profiler and its users safe!
