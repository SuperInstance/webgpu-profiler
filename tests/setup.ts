import { vi } from 'vitest';

// Mock WebGPU API
global.GPUBufferUsage = {
  MAP_READ: 0x0001,
  MAP_WRITE: 0x0002,
  COPY_SRC: 0x0004,
  COPY_DST: 0x0008,
  INDEX: 0x0010,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
  INDIRECT: 0x0100,
  QUERY_RESOLVE: 0x0200,
} as const;

global.GPUTextureUsage = {
  COPY_SRC: 0x01,
  COPY_DST: 0x02,
  TEXTURE_BINDING: 0x04,
  STORAGE_BINDING: 0x08,
  RENDER_ATTACHMENT: 0x10,
} as const;

// Mock navigator.gpu
const mockAdapter = {
  requestAdapterInfo: vi.fn().mockResolvedValue({
    vendor: 'Test Vendor',
    architecture: 'Test Architecture',
    description: 'Test GPU Device',
    device: 'Test GPU',
  }),
  requestDevice: vi.fn().mockResolvedValue({
    destroy: vi.fn(),
    lost: Promise.resolve({ message: 'Device destroyed' }),
    createBuffer: vi.fn(),
    createTexture: vi.fn(),
    createShaderModule: vi.fn(),
    createComputePipeline: vi.fn(),
    createRenderPipeline: vi.fn(),
    createBindGroupLayout: vi.fn(),
    createPipelineLayout: vi.fn(),
    createBindGroup: vi.fn(),
    createCommandEncoder: vi.fn(),
    createRenderBundleEncoder: vi.fn(),
    createQuerySet: vi.fn(),
    queue: {
      submit: vi.fn(),
      onSubmittedWorkDone: vi.fn().mockResolvedValue(undefined),
      writeBuffer: vi.fn(),
      writeTexture: vi.fn(),
      copyExternalImageToTexture: vi.fn(),
    },
  }),
  features: new Set(['texture-compression-bc', 'timestamp-query']),
  limits: {
    maxTextureDimension2D: 8192,
    maxTextureDimension3D: 2048,
    maxTextureArrayLayers: 256,
    maxBindGroups: 4,
    maxDynamicUniformBuffersPerPipelineLayout: 8,
    maxDynamicStorageBuffersPerPipelineLayout: 4,
    maxSampledTexturesPerShaderStage: 16,
    maxSamplersPerShaderStage: 16,
    maxStorageBuffersPerShaderStage: 8,
    maxStorageTexturesPerShaderStage: 4,
    maxUniformBuffersPerShaderStage: 12,
  },
};

Object.defineProperty(global.navigator, 'gpu', {
  value: {
    requestAdapter: vi.fn().mockResolvedValue(mockAdapter),
  },
  writable: true,
  configurable: true,
});

// Mock performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => Date.now()),
};

// Mock window.setInterval and clearInterval
global.setInterval = vi.fn((fn, delay) => {
  const id = Math.random();
  (global as any).intervals = (global as any).intervals || {};
  (global as any).intervals[id] = fn;
  return id as unknown as number;
});

global.clearInterval = vi.fn((id) => {
  (global as any).intervals = (global as any).intervals || {};
  delete (global as any).intervals[id];
});
