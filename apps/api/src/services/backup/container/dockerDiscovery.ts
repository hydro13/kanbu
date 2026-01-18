/**
 * Docker Container Discovery
 *
 * Finds the PostgreSQL container for backup operations.
 * Supports multiple discovery methods for different environments.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import { getBackupConfig } from '../storage/types'

const execAsync = promisify(exec)

/**
 * Find the PostgreSQL container name
 *
 * Discovery order:
 * 1. POSTGRES_CONTAINER env var (explicit override)
 * 2. Pattern matching via POSTGRES_CONTAINER_PATTERN
 * 3. Default fallback: 'kanbu-postgres'
 *
 * @returns Container name
 * @throws Error if container cannot be found
 */
export async function findPostgresContainer(): Promise<string> {
  const config = getBackupConfig()

  // 1. Check explicit container name
  if (config.postgresContainer) {
    const exists = await containerExists(config.postgresContainer)
    if (exists) {
      return config.postgresContainer
    }
    console.warn(
      `Configured POSTGRES_CONTAINER '${config.postgresContainer}' not found, ` +
      'falling back to pattern matching'
    )
  }

  // 2. Try pattern matching
  const containerName = await findContainerByPattern(config.postgresContainerPattern)
  if (containerName) {
    return containerName
  }

  // 3. Try default container name
  const defaultContainer = 'kanbu-postgres'
  const defaultExists = await containerExists(defaultContainer)
  if (defaultExists) {
    return defaultContainer
  }

  throw new Error(
    'PostgreSQL container not found. ' +
    `Tried pattern '${config.postgresContainerPattern}' and default 'kanbu-postgres'. ` +
    'Set POSTGRES_CONTAINER environment variable with the correct container name.'
  )
}

/**
 * Check if a container exists and is running
 */
async function containerExists(name: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=^${name}$" --format "{{.Names}}"`,
      { shell: '/bin/bash' }
    )
    return stdout.trim() === name
  } catch {
    return false
  }
}

/**
 * Find container by name pattern
 */
async function findContainerByPattern(pattern: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker ps --format "{{.Names}}" | grep "${pattern}" | head -1`,
      { shell: '/bin/bash' }
    )
    const containerName = stdout.trim()
    return containerName || null
  } catch {
    return null
  }
}

/**
 * Execute pg_dump in the postgres container
 *
 * @param outputPath - Path to write the SQL dump
 * @returns Object with success status and any stderr output
 */
export async function execPgDump(outputPath: string): Promise<{ success: boolean; stderr: string }> {
  const container = await findPostgresContainer()

  try {
    // Note: Using sudo for Docker access on development machines
    // On Coolify/production, the API container typically has Docker socket access
    const command = process.env.NODE_ENV === 'production'
      ? `docker exec ${container} pg_dump -U kanbu -d kanbu > "${outputPath}"`
      : `sudo docker exec ${container} pg_dump -U kanbu -d kanbu > "${outputPath}"`

    const { stderr } = await execAsync(command, {
      shell: '/bin/bash',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large dumps
    })

    // pg_dump may output warnings that aren't fatal
    const hasError = stderr && !stderr.includes('WARNING')
    return {
      success: !hasError,
      stderr: stderr || '',
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      stderr: message,
    }
  }
}

/**
 * Get PostgreSQL container info for diagnostics
 */
export async function getPostgresContainerInfo(): Promise<{
  found: boolean
  containerName: string | null
  method: 'explicit' | 'pattern' | 'default' | 'none'
}> {
  const config = getBackupConfig()

  // Check explicit
  if (config.postgresContainer) {
    const exists = await containerExists(config.postgresContainer)
    if (exists) {
      return { found: true, containerName: config.postgresContainer, method: 'explicit' }
    }
  }

  // Check pattern
  const patternMatch = await findContainerByPattern(config.postgresContainerPattern)
  if (patternMatch) {
    return { found: true, containerName: patternMatch, method: 'pattern' }
  }

  // Check default
  const defaultExists = await containerExists('kanbu-postgres')
  if (defaultExists) {
    return { found: true, containerName: 'kanbu-postgres', method: 'default' }
  }

  return { found: false, containerName: null, method: 'none' }
}
