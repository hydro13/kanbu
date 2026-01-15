-- Add accent column to users table
ALTER TABLE "users" ADD COLUMN "accent" VARCHAR(20) NOT NULL DEFAULT 'blue';
