-- =============================================================================
-- Migration: Add Full-Text Search (BM25) Support
-- Fase 20.2 - BM25 Index Schema & Setup
-- Date: 2026-01-13
-- =============================================================================

-- 1. Add tsvector columns for full-text search
-- -----------------------------------------------------------------------------

ALTER TABLE workspace_wiki_pages
ADD COLUMN IF NOT EXISTS search_vector tsvector;

ALTER TABLE wiki_pages
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Create GIN indexes for fast full-text search
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS workspace_wiki_pages_search_vector_idx
ON workspace_wiki_pages USING GIN (search_vector);

CREATE INDEX IF NOT EXISTS wiki_pages_search_vector_idx
ON wiki_pages USING GIN (search_vector);

-- 3. Create function to update search vector
-- -----------------------------------------------------------------------------
-- Weights: A = highest (title), B = medium (content), C = lowest (slug)

CREATE OR REPLACE FUNCTION update_workspace_wiki_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.slug, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_wiki_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.slug, '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Create triggers to auto-update search vector on INSERT/UPDATE
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS workspace_wiki_search_vector_update ON workspace_wiki_pages;
CREATE TRIGGER workspace_wiki_search_vector_update
  BEFORE INSERT OR UPDATE OF title, content, slug ON workspace_wiki_pages
  FOR EACH ROW EXECUTE FUNCTION update_workspace_wiki_search_vector();

DROP TRIGGER IF EXISTS wiki_search_vector_update ON wiki_pages;
CREATE TRIGGER wiki_search_vector_update
  BEFORE INSERT OR UPDATE OF title, content, slug ON wiki_pages
  FOR EACH ROW EXECUTE FUNCTION update_wiki_search_vector();

-- 5. Populate search_vector for existing rows
-- -----------------------------------------------------------------------------

UPDATE workspace_wiki_pages SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(slug, '')), 'C')
WHERE search_vector IS NULL;

UPDATE wiki_pages SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(slug, '')), 'C')
WHERE search_vector IS NULL;

-- 6. Verify setup
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  ws_count INT;
  wp_count INT;
BEGIN
  SELECT COUNT(*) INTO ws_count FROM workspace_wiki_pages WHERE search_vector IS NOT NULL;
  SELECT COUNT(*) INTO wp_count FROM wiki_pages WHERE search_vector IS NOT NULL;

  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - workspace_wiki_pages with search_vector: %', ws_count;
  RAISE NOTICE '  - wiki_pages with search_vector: %', wp_count;
END $$;
