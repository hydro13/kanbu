# Kanbu Migration Scripts

This directory contains standalone migration and maintenance scripts for various Kanbu features.

## Available Scripts

### Community Detection

**File:** `migrate-community-detection.ts`
**Phase:** 24.9
**Purpose:** Validate and maintain Community Detection schema in FalkorDB

```bash
# Validate schema (dry-run)
npx tsx scripts/migrate-community-detection.ts --dry-run --verbose

# Cleanup invalid communities
npx tsx scripts/migrate-community-detection.ts --cleanup
```

**Features:**
- Validates Community node properties
- Checks HAS_MEMBER relationships
- Detects orphaned memberships
- Reports communities by groupId
- Optional cleanup of invalid data

**Documentation:** [docs/WIKI-base/FASE-24.9-MIGRATION-SUMMARY.md](../docs/WIKI-base/FASE-24.9-MIGRATION-SUMMARY.md)

---

### Node Embeddings

**File:** `migrate-node-embeddings.ts`
**Phase:** 21.5
**Purpose:** Generate embeddings for existing entity nodes in Qdrant

```bash
# Dry run with verbose output
npx tsx scripts/migrate-node-embeddings.ts --dry-run --verbose --workspace=1

# Live migration with batch processing
npx tsx scripts/migrate-node-embeddings.ts --workspace=1 --batch=50
```

**Features:**
- Reads all entity nodes from FalkorDB
- Generates vector embeddings via WikiNodeEmbeddingService
- Stores in Qdrant collection 'kanbu_node_embeddings'
- Batch processing to avoid rate limits

---

### Edge Embeddings

**File:** `migrate-edge-embeddings.ts`
**Phase:** 21.6
**Purpose:** Generate embeddings for entity relationships

```bash
npx tsx scripts/migrate-edge-embeddings.ts --workspace=1
```

**Features:**
- Processes MENTIONS and LINKS_TO edges
- Stores edge embeddings in Qdrant
- Supports incremental updates

---

### Temporal Edges

**File:** `migrate-temporal-edges.ts`
**Purpose:** Add temporal metadata to existing edges

```bash
npx tsx scripts/migrate-temporal-edges.ts
```

**Features:**
- Adds createdAt/updatedAt timestamps
- Updates existing edges
- Preserves edge weights

---

### GroupId Fix

**File:** `migrate-groupid-fix.ts`
**Purpose:** Repair invalid groupId formats in graph nodes

```bash
npx tsx scripts/migrate-groupid-fix.ts --dry-run
npx tsx scripts/migrate-groupid-fix.ts --fix
```

**Features:**
- Validates groupId format (wiki-ws-{id} or wiki-proj-{id})
- Reports nodes with invalid groupIds
- Optional fix mode

---

### BM25 Indexes

**File:** `migrate-bm25-indexes.sql`
**Purpose:** PostgreSQL full-text search indexes for Wiki pages

```bash
psql -U kanbu -d kanbu -f scripts/migrate-bm25-indexes.sql
```

**Features:**
- Creates GIN indexes for full-text search
- Optimizes Wiki page queries
- PostgreSQL-specific

---

## Common Options

Most TypeScript scripts support these options:

| Option | Description |
|--------|-------------|
| `--dry-run` | Show what would be done without making changes |
| `--verbose` | Show detailed progress and debug info |
| `--workspace=<id>` | Target specific workspace (default: 1) |
| `--batch=<size>` | Batch size for processing (default: 50) |

## Running Scripts

### Prerequisites

All scripts require:
- Node.js 22.x
- pnpm package manager
- Running FalkorDB (Redis) on localhost:6379
- Running Qdrant on localhost:6333 (for embedding scripts)
- Running PostgreSQL on localhost:5432 (for SQL scripts)

### Execution

Scripts use the `tsx` TypeScript executor:

```bash
# From project root
cd /home/robin/genx/v6/dev/kanbu

# Run any script
npx tsx scripts/<script-name>.ts [options]
```

### Environment Variables

Scripts respect these environment variables:

```bash
FALKORDB_HOST=localhost      # FalkorDB Redis host
FALKORDB_PORT=6379           # FalkorDB Redis port
FALKORDB_GRAPH=kanbu_wiki    # Graph name
QDRANT_HOST=localhost        # Qdrant host
QDRANT_PORT=6333             # Qdrant port
DATABASE_URL=postgresql://...  # PostgreSQL connection string
```

## Development

### Adding New Scripts

When creating new migration scripts:

1. **Use the template pattern:**
   - Shebang: `#!/usr/bin/env npx tsx`
   - JSDoc header with purpose, usage, options
   - Command-line argument parsing
   - Connection validation
   - Step-by-step execution with clear logging
   - Error handling and cleanup

2. **Support dry-run mode:**
   - `--dry-run` flag for safe testing
   - Report what would be done without changes

3. **Add verbose logging:**
   - `--verbose` flag for detailed output
   - Help with debugging and validation

4. **Document the script:**
   - Add to this README
   - Create summary doc in `docs/WIKI-base/` if complex
   - Include usage examples

5. **Make it executable:**
   ```bash
   chmod +x scripts/your-script.ts
   ```

### Testing Scripts

Always test in dry-run mode first:

```bash
npx tsx scripts/your-script.ts --dry-run --verbose
```

Verify:
- Connection handling
- Error messages
- Output formatting
- Data validation

## Troubleshooting

### Connection Errors

**FalkorDB connection refused:**
```bash
# Start FalkorDB container
sudo docker compose up -d postgres
```

**Qdrant not available:**
```bash
# Check Qdrant container
sudo docker ps | grep qdrant

# Start if needed
sudo docker compose up -d qdrant
```

### Permission Errors

Scripts need access to:
- FalkorDB/Redis (port 6379)
- Qdrant (port 6333)
- PostgreSQL (port 5432)

Check firewall and Docker network settings.

### Graph Not Found

```
⚠️  Graph "kanbu_wiki" does not exist yet
```

This is normal for fresh installations. Graphs are created automatically when first entities are added.

## Migration Strategy

### Development Environment

Run scripts manually as needed:
```bash
npm run migrate:communities
npm run migrate:embeddings
```

### Production Deployment

Include in deployment pipeline:

1. **Pre-deployment:** Backup database
2. **Run migrations:** Execute required scripts
3. **Validate:** Check script output for errors
4. **Post-deployment:** Verify data integrity

### CI/CD Integration

Example GitHub Actions:

```yaml
- name: Run Community Detection Migration
  run: |
    cd /path/to/kanbu
    npx tsx scripts/migrate-community-detection.ts --verbose
```

## See Also

- [Kanbu Development Environment](../docs/DEV-ENVIRONMENT.md)
- [Wiki Feature Documentation](../docs/WIKI-base/)
- [FalkorDB Schema](../apps/api/src/lib/ai/wiki/types/)

---

**Last Updated:** 2026-01-15
**Maintained By:** Robin Waslander <R.Waslander@gmail.com>
