/**
 * PostgreSQL Backup Executor
 *
 * Supports two modes for database backups:
 * 1. Docker mode: Uses `docker exec` to run pg_dump in the postgres container
 * 2. Direct mode: Uses pg_dump directly with network connection (for containerized API)
 *
 * Mode selection:
 * - BACKUP_PG_MODE=docker  → Force Docker mode
 * - BACKUP_PG_MODE=direct  → Force Direct mode
 * - BACKUP_PG_MODE=auto    → Auto-detect (default): try direct first, fall back to docker
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { getBackupConfig } from '../storage/types';

const execAsync = promisify(exec);

type BackupMode = 'docker' | 'direct' | 'auto';

interface PostgresConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

/**
 * Parse DATABASE_URL into connection parameters
 * Format: postgresql://user:password@host:port/database
 */
function parseDatabaseUrl(): PostgresConnectionConfig | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;

  try {
    // Handle both postgresql:// and postgres:// schemes
    const parsed = new URL(url.replace(/^postgres:\/\//, 'postgresql://'));
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 5432,
      user: parsed.username || 'kanbu',
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname.slice(1) || 'kanbu', // Remove leading /
    };
  } catch {
    console.error('Failed to parse DATABASE_URL');
    return null;
  }
}

/**
 * Get the backup mode from environment or auto-detect
 */
function getBackupMode(): BackupMode {
  const mode = process.env.BACKUP_PG_MODE?.toLowerCase();
  if (mode === 'docker' || mode === 'direct') {
    return mode;
  }
  return 'auto';
}

/**
 * Check if pg_dump is available locally (for direct mode)
 */
async function isPgDumpAvailable(): Promise<boolean> {
  try {
    await execAsync('which pg_dump', { shell: '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if Docker is available
 */
async function isDockerAvailable(): Promise<boolean> {
  try {
    await execAsync('docker --version', { shell: '/bin/sh' });
    return true;
  } catch {
    return false;
  }
}

/**
 * Find the PostgreSQL container name (for Docker mode)
 *
 * Discovery order:
 * 1. POSTGRES_CONTAINER env var (explicit override)
 * 2. Pattern matching via POSTGRES_CONTAINER_PATTERN
 * 3. Default fallback: 'kanbu-postgres'
 */
export async function findPostgresContainer(): Promise<string> {
  const config = getBackupConfig();

  // 1. Check explicit container name
  if (config.postgresContainer) {
    const exists = await containerExists(config.postgresContainer);
    if (exists) {
      return config.postgresContainer;
    }
    console.warn(
      `Configured POSTGRES_CONTAINER '${config.postgresContainer}' not found, ` +
        'falling back to pattern matching'
    );
  }

  // 2. Try pattern matching
  const containerName = await findContainerByPattern(config.postgresContainerPattern);
  if (containerName) {
    return containerName;
  }

  // 3. Try default container name
  const defaultContainer = 'kanbu-postgres';
  const defaultExists = await containerExists(defaultContainer);
  if (defaultExists) {
    return defaultContainer;
  }

  throw new Error(
    'PostgreSQL container not found. ' +
      `Tried pattern '${config.postgresContainerPattern}' and default 'kanbu-postgres'. ` +
      'Set POSTGRES_CONTAINER environment variable with the correct container name.'
  );
}

/**
 * Check if a container exists and is running
 */
async function containerExists(name: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(
      `docker ps --filter "name=^${name}$" --format "{{.Names}}"`,
      {
        shell: '/bin/sh',
      }
    );
    return stdout.trim() === name;
  } catch {
    return false;
  }
}

/**
 * Find container by name pattern
 */
async function findContainerByPattern(pattern: string): Promise<string | null> {
  try {
    const { stdout } = await execAsync(
      `docker ps --format "{{.Names}}" | grep "${pattern}" | head -1`,
      {
        shell: '/bin/sh',
      }
    );
    const containerName = stdout.trim();
    return containerName || null;
  } catch {
    return null;
  }
}

/**
 * Execute pg_dump using direct network connection
 * Uses DATABASE_URL from environment (same as Prisma)
 */
async function execPgDumpDirect(outputPath: string): Promise<{ success: boolean; stderr: string }> {
  const config = parseDatabaseUrl();
  if (!config) {
    return {
      success: false,
      stderr: 'DATABASE_URL not set or invalid. Cannot use direct backup mode.',
    };
  }

  try {
    // Use PGPASSWORD environment variable for password
    // pg_dump with network connection
    const command = `PGPASSWORD='${config.password}' pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.database} > "${outputPath}"`;

    const { stderr } = await execAsync(command, {
      shell: '/bin/sh',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large dumps
    });

    // pg_dump may output warnings that aren't fatal
    const hasError = stderr && !stderr.includes('WARNING');
    return {
      success: !hasError,
      stderr: stderr || '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stderr: message,
    };
  }
}

/**
 * Execute pg_dump using Docker exec
 */
async function execPgDumpDocker(outputPath: string): Promise<{ success: boolean; stderr: string }> {
  try {
    const container = await findPostgresContainer();

    // Note: Using sudo for Docker access on development machines
    // On production with Docker socket mounted, no sudo needed
    const command =
      process.env.NODE_ENV === 'production'
        ? `docker exec ${container} pg_dump -U kanbu -d kanbu > "${outputPath}"`
        : `sudo docker exec ${container} pg_dump -U kanbu -d kanbu > "${outputPath}"`;

    const { stderr } = await execAsync(command, {
      shell: '/bin/sh',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer for large dumps
    });

    // pg_dump may output warnings that aren't fatal
    const hasError = stderr && !stderr.includes('WARNING');
    return {
      success: !hasError,
      stderr: stderr || '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      stderr: message,
    };
  }
}

/**
 * Execute pg_dump using the appropriate mode
 *
 * @param outputPath - Path to write the SQL dump
 * @returns Object with success status and any stderr output
 */
export async function execPgDump(
  outputPath: string
): Promise<{ success: boolean; stderr: string; mode: string }> {
  const requestedMode = getBackupMode();

  // Forced Docker mode
  if (requestedMode === 'docker') {
    const result = await execPgDumpDocker(outputPath);
    return { ...result, mode: 'docker' };
  }

  // Forced Direct mode
  if (requestedMode === 'direct') {
    const result = await execPgDumpDirect(outputPath);
    return { ...result, mode: 'direct' };
  }

  // Auto mode: try direct first (works in containers), then fall back to docker
  const hasPgDump = await isPgDumpAvailable();
  const hasDbUrl = !!parseDatabaseUrl();

  if (hasPgDump && hasDbUrl) {
    const result = await execPgDumpDirect(outputPath);
    if (result.success) {
      return { ...result, mode: 'direct' };
    }
    console.warn('Direct pg_dump failed, falling back to Docker mode:', result.stderr);
  }

  // Fall back to Docker mode
  const hasDocker = await isDockerAvailable();
  if (hasDocker) {
    const result = await execPgDumpDocker(outputPath);
    return { ...result, mode: 'docker' };
  }

  return {
    success: false,
    stderr:
      'No backup method available. ' +
      'Direct mode requires pg_dump and DATABASE_URL. ' +
      'Docker mode requires Docker access and the postgres container.',
    mode: 'none',
  };
}

/**
 * Get PostgreSQL backup info for diagnostics
 */
export async function getPostgresBackupInfo(): Promise<{
  available: boolean;
  mode: 'direct' | 'docker' | 'none';
  details: {
    pgDumpAvailable: boolean;
    databaseUrlSet: boolean;
    dockerAvailable: boolean;
    containerFound: boolean;
    containerName: string | null;
  };
}> {
  const hasPgDump = await isPgDumpAvailable();
  const hasDbUrl = !!parseDatabaseUrl();
  const hasDocker = await isDockerAvailable();

  let containerFound = false;
  let containerName: string | null = null;

  if (hasDocker) {
    try {
      containerName = await findPostgresContainer();
      containerFound = true;
    } catch {
      containerFound = false;
    }
  }

  // Determine available mode
  let mode: 'direct' | 'docker' | 'none' = 'none';
  if (hasPgDump && hasDbUrl) {
    mode = 'direct';
  } else if (hasDocker && containerFound) {
    mode = 'docker';
  }

  return {
    available: mode !== 'none',
    mode,
    details: {
      pgDumpAvailable: hasPgDump,
      databaseUrlSet: hasDbUrl,
      dockerAvailable: hasDocker,
      containerFound,
      containerName,
    },
  };
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use getPostgresBackupInfo() instead
 */
export async function getPostgresContainerInfo(): Promise<{
  found: boolean;
  containerName: string | null;
  method: 'explicit' | 'pattern' | 'default' | 'none';
}> {
  const config = getBackupConfig();

  // Check explicit
  if (config.postgresContainer) {
    const exists = await containerExists(config.postgresContainer);
    if (exists) {
      return { found: true, containerName: config.postgresContainer, method: 'explicit' };
    }
  }

  // Check pattern
  const patternMatch = await findContainerByPattern(config.postgresContainerPattern);
  if (patternMatch) {
    return { found: true, containerName: patternMatch, method: 'pattern' };
  }

  // Check default
  const defaultExists = await containerExists('kanbu-postgres');
  if (defaultExists) {
    return { found: true, containerName: 'kanbu-postgres', method: 'default' };
  }

  return { found: false, containerName: null, method: 'none' };
}
