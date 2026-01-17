#!/bin/sh
# Kanbu API Entrypoint
# Runs database migrations before starting the server

set -e

echo "========================================"
echo "  Kanbu API Starting..."
echo "========================================"

# Wait for database to be ready (simple retry loop)
echo "[Startup] Waiting for database connection..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    if node -e "
        const { PrismaClient } = require('@prisma/client');
        const prisma = new PrismaClient();
        prisma.\$connect().then(() => {
            console.log('[Startup] Database connected!');
            prisma.\$disconnect();
            process.exit(0);
        }).catch(() => process.exit(1));
    " 2>/dev/null; then
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    echo "[Startup] Database not ready, retrying in 2s... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo "[Startup] ERROR: Could not connect to database after $MAX_RETRIES attempts"
    exit 1
fi

# Run database migrations
echo "[Startup] Running database migrations..."
cd /app/packages/shared

# Use db push for schema sync (works without migration files)
# For production with proper migrations, use: npx prisma migrate deploy
npx prisma db push --accept-data-loss 2>&1 || {
    echo "[Startup] WARNING: prisma db push failed, trying migrate deploy..."
    npx prisma migrate deploy 2>&1 || {
        echo "[Startup] ERROR: Database migration failed!"
        exit 1
    }
}

echo "[Startup] Database migrations complete!"

# Return to API directory and start the server
cd /app/apps/api
echo "[Startup] Starting Kanbu API server..."
exec node dist/index.js
