/**
 * AI Provider Registry
 *
 * Singleton registry for managing active provider instances.
 * Handles provider resolution based on scope (Global > Workspace > Project)
 * and capability requirements.
 *
 * Fase 14.3 - Provider Abstraction Layer
 */

import type { PrismaClient } from '@prisma/client';
import {
  createProvider,
  createEmbeddingProvider,
  createReasoningProvider,
  createVisionProvider,
  type AiProviderConfigRecord,
} from './factory';
import {
  type AiProvider,
  type AiCapability,
  type EmbeddingProvider,
  type ReasoningProvider,
  type VisionProvider,
} from './types';

// =============================================================================
// Registry Types
// =============================================================================

interface ProviderCache {
  provider: AiProvider;
  configId: number;
  expiresAt: number;
}

interface ResolveOptions {
  workspaceId?: number;
  projectId?: number;
  capability?: AiCapability;
  skipCache?: boolean;
}

// =============================================================================
// Provider Registry Class
// =============================================================================

export class ProviderRegistry {
  private cache = new Map<string, ProviderCache>();
  private readonly cacheTtlMs = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly prisma: PrismaClient) {}

  // ===========================================================================
  // Provider Resolution
  // ===========================================================================

  /**
   * Get the effective provider for a given context and capability
   * Resolution order: Project > Workspace > Global
   */
  async getProvider(options: ResolveOptions = {}): Promise<AiProvider | null> {
    const cacheKey = this.getCacheKey(options);

    // Check cache first
    if (!options.skipCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.provider;
      }
    }

    // Find effective provider from database
    const config = await this.findEffectiveConfig(options);
    if (!config) {
      return null;
    }

    // Create and cache provider
    const provider = createProvider(config as AiProviderConfigRecord);
    this.cache.set(cacheKey, {
      provider,
      configId: config.id,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    return provider;
  }

  /**
   * Get an embedding provider for the given context
   */
  async getEmbeddingProvider(
    options: Omit<ResolveOptions, 'capability'> = {}
  ): Promise<EmbeddingProvider | null> {
    const config = await this.findEffectiveConfig({
      ...options,
      capability: 'EMBEDDING',
    });

    if (!config) return null;

    return createEmbeddingProvider(config as AiProviderConfigRecord);
  }

  /**
   * Get a reasoning provider for the given context
   */
  async getReasoningProvider(
    options: Omit<ResolveOptions, 'capability'> = {}
  ): Promise<ReasoningProvider | null> {
    const config = await this.findEffectiveConfig({
      ...options,
      capability: 'REASONING',
    });

    if (!config) return null;

    return createReasoningProvider(config as AiProviderConfigRecord);
  }

  /**
   * Get a vision provider for the given context
   */
  async getVisionProvider(
    options: Omit<ResolveOptions, 'capability'> = {}
  ): Promise<VisionProvider | null> {
    const config = await this.findEffectiveConfig({
      ...options,
      capability: 'VISION',
    });

    if (!config) return null;

    return createVisionProvider(config as AiProviderConfigRecord);
  }

  // ===========================================================================
  // Fallback Chain
  // ===========================================================================

  /**
   * Get a provider with automatic fallback if primary fails
   * Order: Primary (from context) > Fallback providers by priority
   */
  async getProviderWithFallback(options: ResolveOptions = {}): Promise<AiProvider | null> {
    const configs = await this.findAllAvailableConfigs(options);

    for (const config of configs) {
      try {
        const provider = createProvider(config as AiProviderConfigRecord);
        const testResult = await provider.testConnection();

        if (testResult.success) {
          return provider;
        }
      } catch {
        // Continue to next provider
      }
    }

    return null;
  }

  // ===========================================================================
  // Cache Management
  // ===========================================================================

  /**
   * Clear all cached providers
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for a specific config ID
   */
  invalidateConfig(configId: number): void {
    for (const [key, value] of this.cache.entries()) {
      if (value.configId === configId) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear expired cache entries
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private getCacheKey(options: ResolveOptions): string {
    return `${options.projectId || 'none'}-${options.workspaceId || 'none'}-${options.capability || 'any'}`;
  }

  /**
   * Find the effective config based on scope hierarchy
   * Project > Workspace > Global
   */
  private async findEffectiveConfig(
    options: ResolveOptions
  ): Promise<AiProviderConfigRecord | null> {
    const { workspaceId, projectId, capability } = options;

    const baseWhere = {
      isActive: true,
      ...(capability && { capabilities: { has: capability } }),
    };

    // 1. Check project-level config
    if (projectId) {
      const projectConfig = await this.prisma.aiProviderConfig.findFirst({
        where: { ...baseWhere, projectId },
        orderBy: { priority: 'desc' },
      });
      if (projectConfig) return projectConfig as unknown as AiProviderConfigRecord;
    }

    // 2. Check workspace-level config
    if (workspaceId) {
      const workspaceConfig = await this.prisma.aiProviderConfig.findFirst({
        where: { ...baseWhere, workspaceId, projectId: null },
        orderBy: { priority: 'desc' },
      });
      if (workspaceConfig) return workspaceConfig as unknown as AiProviderConfigRecord;
    }

    // 3. Check global config
    const globalConfig = await this.prisma.aiProviderConfig.findFirst({
      where: { ...baseWhere, isGlobal: true },
      orderBy: { priority: 'desc' },
    });

    return globalConfig as unknown as AiProviderConfigRecord | null;
  }

  /**
   * Find all available configs for fallback chain
   */
  private async findAllAvailableConfigs(
    options: ResolveOptions
  ): Promise<AiProviderConfigRecord[]> {
    const { workspaceId, projectId, capability } = options;

    const baseWhere = {
      isActive: true,
      ...(capability && { capabilities: { has: capability } }),
    };

    const configs: AiProviderConfigRecord[] = [];

    // 1. Project-level configs
    if (projectId) {
      const projectConfigs = await this.prisma.aiProviderConfig.findMany({
        where: { ...baseWhere, projectId },
        orderBy: { priority: 'desc' },
      });
      configs.push(...(projectConfigs as unknown as AiProviderConfigRecord[]));
    }

    // 2. Workspace-level configs
    if (workspaceId) {
      const workspaceConfigs = await this.prisma.aiProviderConfig.findMany({
        where: { ...baseWhere, workspaceId, projectId: null },
        orderBy: { priority: 'desc' },
      });
      configs.push(...(workspaceConfigs as unknown as AiProviderConfigRecord[]));
    }

    // 3. Global configs
    const globalConfigs = await this.prisma.aiProviderConfig.findMany({
      where: { ...baseWhere, isGlobal: true },
      orderBy: { priority: 'desc' },
    });
    configs.push(...(globalConfigs as unknown as AiProviderConfigRecord[]));

    return configs;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let registryInstance: ProviderRegistry | null = null;

/**
 * Get or create the singleton provider registry
 */
export function getProviderRegistry(prisma: PrismaClient): ProviderRegistry {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry(prisma);
  }
  return registryInstance;
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetProviderRegistry(): void {
  registryInstance?.clearCache();
  registryInstance = null;
}
