// Minimal WebGPU type declarations for browser-gpu-profiler
// These are the essential types needed for the profiler to work

declare const navigator: {
  gpu: {
    requestAdapter(options?: any): Promise<any | null>;
  };
};

declare const window: {
  setInterval(handler: () => void, timeout: number): number;
  clearInterval(id: number): void;
};

declare const performance: {
  now(): number;
};

interface GPUAdapterInfo {
  vendor?: string;
  architecture?: string;
  device?: string;
  description: string;
}

interface GPUAdapter {
  requestAdapterInfo(): Promise<GPUAdapterInfo>;
  requestDevice(options?: any): Promise<any>;
  features: Set<string>;
  limits: GPUSupportedLimits;
}

interface GPUSupportedLimits {
  maxTextureDimension2D?: number;
  maxTextureDimension3D?: number;
  maxTextureArrayLayers?: number;
  maxBindGroups?: number;
  maxBufferSize?: number;
}

interface GPUDevice {
  destroy(): void;
  destroyed?: boolean;
  lost: Promise<{ message: string }>;
  createBuffer(descriptor: any): any;
  createTexture(descriptor: any): any;
  createShaderModule(descriptor: { code: string }): any;
  createComputePipeline(descriptor: any): any;
  createRenderPipeline(descriptor: any): any;
  createBindGroupLayout(descriptor: any): any;
  createPipelineLayout(descriptor: any): any;
  createBindGroup(descriptor: any): any;
  createCommandEncoder(descriptor?: any): any;
  createRenderBundleEncoder(descriptor?: any): any;
  createQuerySet(descriptor?: any): any;
  queue: any;
}

interface GPUBuffer {
  size: number;
  usage: number;
  destroy(): void;
  mapAsync(mode: number, offset?: number, size?: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): ArrayBuffer;
  unmap(): void;
}

interface GPUTexture {
  width: number;
  height: number;
  depthOrArrayLayers: number;
  format: GPUTextureFormat;
  usage: number;
  destroy(): void;
  createView(descriptor?: any): any;
}

type GPUTextureFormat =
  | 'rgba8unorm'
  | 'rgba8unorm-srgb'
  | 'bgra8unorm'
  | 'bgra8unorm-srgb'
  | 'rgb32float'
  | 'rgba32float';

interface GPUQueue {
  submit(commandBuffers: any[]): void;
  onSubmittedWorkDone(): Promise<void>;
  writeBuffer(buffer: any, bufferOffset: number, data: BufferSource, dataOffset?: number, size?: number): void;
  writeTexture(destination: any, data: BufferSource, dataLayout: any, size: any): void;
  copyExternalImageToTexture(source: any, destination: any, copySize: any): void;
}

interface GPUShaderModule {}

interface GPUComputePipeline {}
interface GPURenderPipeline {}
interface GPUBindGroupLayout {}
interface GPUPipelineLayout {}
interface GPUBindGroup {}
interface GPUCommandEncoder {
  beginComputePass(descriptor?: any): any;
  beginRenderPass(descriptor: any): any;
  copyBufferToBuffer(source: any, sourceOffset: number, destination: any, destinationOffset: number, size: number): void;
  copyTextureToTexture(source: any, destination: any, copySize: any): void;
  finish(descriptor?: any): any;
}
interface GPURenderBundleEncoder {}
interface GPUQuerySet {}
interface GPUComputePassEncoder {
  setPipeline(pipeline: any): void;
  setBindGroup(index: number, bindGroup: any, dynamicOffsets?: number[]): void;
  dispatchWorkgroups(x: number, y?: number, z?: number): void;
  dispatchWorkgroupsIndirect(indirectBuffer: any, indirectOffset: number): void;
  end(): void;
}
interface GPURenderPassEncoder {}
interface GPUTextureView {}
interface GPUCommandBuffer {}

declare const GPUBufferUsage: {
  MAP_READ: number;
  MAP_WRITE: number;
  COPY_SRC: number;
  COPY_DST: number;
  INDEX: number;
  VERTEX: number;
  UNIFORM: number;
  STORAGE: number;
  INDIRECT: number;
  QUERY_RESOLVE: number;
};

declare const GPUTextureUsage: {
  COPY_SRC: number;
  COPY_DST: number;
  TEXTURE_BINDING: number;
  STORAGE_BINDING: number;
  RENDER_ATTACHMENT: number;
};
