/*
 * Seed Script: AI Provider Configurations (Fase 14.1)
 * Version: 1.0.0
 *
 * Creates default AI provider configurations for the Kanbu Wiki & Graphiti system.
 * Supports: OpenAI, Ollama, LM Studio
 *
 * CAPABILITIES:
 * - EMBEDDING : Vector embeddings for Wiki search (text-embedding-3-small)
 * - REASONING : Entity extraction, summarization for Graphiti (gpt-4o-mini)
 * - VISION    : Image understanding (gpt-4o, optional)
 *
 * DEFAULT MODELS:
 * - OpenAI:
 *   - Embedding: text-embedding-3-small (1536 dimensions)
 *   - Reasoning: gpt-4o-mini (cost-effective)
 *   - Vision: gpt-4o (when needed)
 *
 * - Ollama:
 *   - Embedding: nomic-embed-text (768 dimensions)
 *   - Reasoning: llama3.2 (3B, fast)
 *   - Vision: llava (optional)
 *
 * - LM Studio:
 *   - Same as Ollama (OpenAI-compatible API)
 *
 * Usage:
 *   npx ts-node prisma/seed-ai-providers.ts
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-12
 * Fase: 14.1 - AI Provider Database Model
 * =============================================================================
 */

import { PrismaClient, AiProviderType, AiCapability } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// Types
// =============================================================================

interface AiProviderSeed {
  isGlobal: boolean;
  providerType: AiProviderType;
  name: string;
  isActive: boolean;
  priority: number;
  capabilities: AiCapability[];
  baseUrl?: string;
  apiKey?: string;
  organizationId?: string;
  embeddingModel?: string;
  reasoningModel?: string;
  visionModel?: string;
  maxRequestsPerMinute?: number;
  maxTokensPerMinute?: number;
}

// =============================================================================
// Default AI Provider Configurations
// =============================================================================

const defaultProviders: AiProviderSeed[] = [
  // Global OpenAI Provider (primary - needs API key)
  {
    isGlobal: true,
    providerType: 'OPENAI',
    name: 'OpenAI (Global)',
    isActive: false, // Inactive until API key is configured
    priority: 100, // Highest priority when active
    capabilities: ['EMBEDDING', 'REASONING', 'VISION'],
    baseUrl: 'https://api.openai.com/v1',
    embeddingModel: 'text-embedding-3-small',
    reasoningModel: 'gpt-4o-mini',
    visionModel: 'gpt-4o',
    maxRequestsPerMinute: 60,
    maxTokensPerMinute: 90000,
  },

  // Global Ollama Provider (local - no API key needed)
  {
    isGlobal: true,
    providerType: 'OLLAMA',
    name: 'Ollama (Local)',
    isActive: false, // User must verify Ollama is running
    priority: 50,
    capabilities: ['EMBEDDING', 'REASONING', 'VISION'],
    baseUrl: 'http://localhost:11434/v1',
    embeddingModel: 'nomic-embed-text',
    reasoningModel: 'llama3.2',
    visionModel: 'llava',
    // No rate limits for local - hardware is the limit
  },

  // Global LM Studio Provider (local desktop - no API key needed)
  {
    isGlobal: true,
    providerType: 'LM_STUDIO',
    name: 'LM Studio (Desktop)',
    isActive: false, // User must verify LM Studio is running
    priority: 25,
    capabilities: ['EMBEDDING', 'REASONING'],
    baseUrl: 'http://localhost:1234/v1',
    embeddingModel: 'nomic-embed-text',
    reasoningModel: 'llama-3.2-3b-instruct',
    // No vision by default (depends on loaded model)
    // No rate limits for local
  },
];

// =============================================================================
// Seed Function
// =============================================================================

async function seedAiProviders() {
  console.log('🤖 Starting AI Provider seed...\n');

  let created = 0;
  let skipped = 0;

  for (const provider of defaultProviders) {
    // Check if provider already exists
    const existing = await prisma.aiProviderConfig.findFirst({
      where: {
        isGlobal: provider.isGlobal,
        providerType: provider.providerType,
        name: provider.name,
      },
    });

    if (existing) {
      console.log(`  ⏭️  Skipping existing: ${provider.name}`);
      skipped++;
      continue;
    }

    // Create new provider
    await prisma.aiProviderConfig.create({
      data: provider,
    });

    console.log(`  ✅ Created: ${provider.name}`);
    console.log(`     Type: ${provider.providerType}`);
    console.log(`     Capabilities: ${provider.capabilities.join(', ')}`);
    console.log(`     Base URL: ${provider.baseUrl}`);
    console.log(`     Active: ${provider.isActive}`);
    console.log('');

    created++;
  }

  console.log('\n📊 Summary:');
  console.log(`   Created: ${created}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Total:   ${defaultProviders.length}`);
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main() {
  try {
    await seedAiProviders();
    console.log('\n✨ AI Provider seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding AI providers:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
