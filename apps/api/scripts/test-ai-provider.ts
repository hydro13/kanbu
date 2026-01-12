/**
 * Quick test script for AI Provider connection
 *
 * Usage: npx tsx scripts/test-ai-provider.ts
 */

import { PrismaClient } from '@prisma/client'
import {
  createSimpleOpenAiProvider,
  createSimpleOllamaProvider,
  createSimpleLmStudioProvider,
} from '../src/lib/ai/providers'

const prisma = new PrismaClient()

async function testProviders() {
  console.log('\n🔍 Testing AI Providers...\n')

  // Get active providers from database
  const providers = await prisma.aiProviderConfig.findMany({
    where: { isActive: true },
    orderBy: { priority: 'desc' },
  })

  console.log(`Found ${providers.length} active provider(s)\n`)

  for (const config of providers) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📦 Provider: ${config.name}`)
    console.log(`   Type: ${config.providerType}`)
    console.log(`   Scope: ${config.isGlobal ? 'Global' : config.workspaceId ? `Workspace #${config.workspaceId}` : `Project #${config.projectId}`}`)
    console.log(`   Capabilities: ${config.capabilities.join(', ')}`)
    console.log(`   URL: ${config.baseUrl || 'default'}`)
    console.log(`   API Key: ${config.apiKey ? '✓ configured' : '✗ not set'}`)

    // Create provider instance based on type
    let provider
    try {
      switch (config.providerType) {
        case 'OPENAI':
          if (!config.apiKey) {
            console.log('\n   ⚠️  Skipping test - no API key configured')
            continue
          }
          provider = createSimpleOpenAiProvider(config.apiKey, config.baseUrl || undefined)
          break
        case 'OLLAMA':
          provider = createSimpleOllamaProvider(config.baseUrl || undefined)
          break
        case 'LM_STUDIO':
          provider = createSimpleLmStudioProvider(config.baseUrl || undefined)
          break
        default:
          console.log(`   ⚠️  Unknown provider type: ${config.providerType}`)
          continue
      }

      console.log('\n   🔄 Testing connection...')
      const startTime = Date.now()
      const result = await provider.testConnection()
      const latency = Date.now() - startTime

      if (result.success) {
        console.log(`   ✅ Connection successful (${latency}ms)`)
        if (result.models && result.models.length > 0) {
          console.log(`   📋 Available models (${result.models.length}):`)
          result.models.slice(0, 10).forEach(model => {
            console.log(`      - ${model}`)
          })
          if (result.models.length > 10) {
            console.log(`      ... and ${result.models.length - 10} more`)
          }
        }

        // Test embedding if capability is available
        if (config.capabilities.includes('EMBEDDING')) {
          console.log('\n   🔤 Testing embedding...')
          try {
            const embedding = await provider.embed('Hello, this is a test.')
            console.log(`   ✅ Embedding successful (${embedding.length} dimensions)`)
          } catch (err) {
            console.log(`   ❌ Embedding failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }

        // Test reasoning if capability is available
        if (config.capabilities.includes('REASONING')) {
          console.log('\n   💭 Testing reasoning (chat completion)...')
          try {
            const response = await provider.chat([
              { role: 'user', content: 'Say "Hello from Kanbu AI test!" in exactly those words.' }
            ])
            console.log(`   ✅ Reasoning successful: "${response.slice(0, 100)}${response.length > 100 ? '...' : ''}"`)
          } catch (err) {
            console.log(`   ❌ Reasoning failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
          }
        }

      } else {
        console.log(`   ❌ Connection failed: ${result.error || 'Unknown error'}`)
      }

    } catch (err) {
      console.log(`   ❌ Test error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('✨ Tests complete!\n')
}

testProviders()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
