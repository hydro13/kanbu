/*
 * Wiki Search Dialog Component
 * Version: 2.3.0
 *
 * Search dialog for wiki pages with:
 * - Local title/slug search
 * - Graphiti graph search (entities/relationships)
 * - Semantic vector search (Qdrant embeddings) - Fase 15.2
 * - Edge semantic search (relationship facts) - Fase 19.4
 * - BM25 keyword search (PostgreSQL full-text) - Fase 20.5
 * - RRF Hybrid mode combining BM25 + Vector + Edge - Fase 20.5
 * - Keyboard navigation
 * - "Show in graph" action on results (Fase 15.5)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Fase 15.2 - Added semantic search mode toggle with Qdrant
 *
 * Modified: 2026-01-12
 * Change: Fase 15.5 - Added "Show in graph" button for cross-feature linking
 *
 * Modified: 2026-01-13
 * Change: Fase 19.4 - Added edge semantic search with hybrid page+edge results
 *
 * Modified: 2026-01-13
 * Change: Fase 20.5 - Added BM25 keyword search and RRF hybrid fusion
 * ===================================================================
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Search,
  FileText,
  Sparkles,
  ArrowRight,
  Loader2,
  Network,
  Zap,
  Link2,
  Type,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { trpc } from '@/lib/trpc';
import { EdgeSearchResult, type EdgeSearchResultData } from './EdgeSearchResult';

// =============================================================================
// Types
// =============================================================================

export type SearchMode = 'local' | 'graph' | 'semantic' | 'keyword' | 'hybrid';

export interface WikiPageForSearch {
  id: number;
  title: string;
  slug: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  updatedAt: string;
  parentId: number | null;
}

interface SearchResult {
  id: number;
  title: string;
  slug: string;
  type: 'local' | 'graph' | 'semantic' | 'keyword' | 'edge';
  score?: number;
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  snippet?: string;
  /** BM25 headline with highlights (Fase 20.5) */
  headline?: string;
  /** Sources that matched in RRF hybrid mode (Fase 20.5) */
  sources?: Array<'bm25' | 'vector' | 'edge'>;
  // Edge-specific fields (Fase 19.4)
  edgeData?: EdgeSearchResultData;
}

interface WikiSearchDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onClose: () => void;
  /** Workspace ID for search */
  workspaceId: number;
  /** Project ID for project-scoped search (optional) */
  projectId?: number;
  /** Local wiki pages for quick search */
  pages: WikiPageForSearch[];
  /** Base path for navigation (e.g., /workspace/slug/wiki) */
  basePath: string;
  /** Initial search mode (default: hybrid) */
  defaultMode?: SearchMode;
  /** Callback to show a page in the graph view */
  onShowInGraph?: (pageId: number) => void;
}

// =============================================================================
// Search Logic
// =============================================================================

function searchLocalPages(pages: WikiPageForSearch[], query: string): SearchResult[] {
  if (!query.trim()) return [];

  const lowerQuery = query.toLowerCase();

  return pages
    .filter((page) => {
      const titleMatch = page.title.toLowerCase().includes(lowerQuery);
      const slugMatch = page.slug.toLowerCase().includes(lowerQuery);
      return titleMatch || slugMatch;
    })
    .map((page) => ({
      id: page.id,
      title: page.title,
      slug: page.slug,
      type: 'local' as const,
      status: page.status,
    }))
    .slice(0, 10);
}

// =============================================================================
// Result Item Component
// =============================================================================

interface ResultItemProps {
  result: SearchResult;
  isSelected: boolean;
  onClick: () => void;
  onShowInGraph?: () => void;
}

function ResultItem({ result, isSelected, onClick, onShowInGraph }: ResultItemProps) {
  // For edge results, delegate to EdgeSearchResult component
  if (result.type === 'edge' && result.edgeData) {
    return (
      <EdgeSearchResult
        result={result.edgeData}
        isSelected={isSelected}
        onClick={onClick}
        onShowInGraph={onShowInGraph}
      />
    );
  }

  const getIcon = () => {
    switch (result.type) {
      case 'semantic':
        return <Sparkles className="h-4 w-4 text-purple-500 flex-shrink-0" />;
      case 'graph':
        return <Network className="h-4 w-4 text-blue-500 flex-shrink-0" />;
      case 'keyword':
        return <Type className="h-4 w-4 text-green-600 flex-shrink-0" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />;
    }
  };

  return (
    <div
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-colors group',
        isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
      )}
    >
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0">
        {getIcon()}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{result.title}</span>
            {result.status === 'DRAFT' && (
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200"
              >
                Draft
              </Badge>
            )}
            {result.score !== undefined && result.score < 1 && (
              <span className="text-[10px] text-muted-foreground">
                {Math.round(result.score * 100)}%
              </span>
            )}
          </div>
          {result.snippet && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{result.snippet}</p>
          )}
          {/* BM25 Headline with highlights (Fase 20.5) */}
          {result.headline && (
            <p
              className="text-xs text-muted-foreground mt-0.5 line-clamp-2"
              dangerouslySetInnerHTML={{ __html: result.headline }}
            />
          )}
          {/* Source badges for RRF hybrid results (Fase 20.5) */}
          {result.sources && result.sources.length > 1 && (
            <div className="flex gap-1 mt-1">
              {result.sources.map((src) => (
                <Badge
                  key={src}
                  variant="outline"
                  className={cn(
                    'text-[9px] px-1 py-0 h-4',
                    src === 'bm25' && 'bg-green-50 text-green-700 border-green-200',
                    src === 'vector' && 'bg-purple-50 text-purple-700 border-purple-200',
                    src === 'edge' && 'bg-blue-50 text-blue-700 border-blue-200'
                  )}
                >
                  {src === 'bm25' ? 'Keyword' : src === 'vector' ? 'Semantic' : 'Relations'}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </button>

      {/* Show in graph button */}
      {onShowInGraph && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShowInGraph();
          }}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-opacity"
          title="Show in graph"
        >
          <Network className="h-3.5 w-3.5 text-blue-500" />
        </button>
      )}

      <button onClick={onClick} className="flex-shrink-0">
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
    </div>
  );
}

// =============================================================================
// Search Mode Toggle Component
// =============================================================================

interface SearchModeToggleProps {
  mode: SearchMode;
  onChange: (mode: SearchMode) => void;
}

function SearchModeToggle({ mode, onChange }: SearchModeToggleProps) {
  const modes: { value: SearchMode; label: string; icon: React.ReactNode; description: string }[] =
    [
      {
        value: 'hybrid',
        label: 'Hybrid',
        icon: <Zap className="h-3 w-3" />,
        description: 'Best of all (RRF)',
      },
      {
        value: 'local',
        label: 'Local',
        icon: <FileText className="h-3 w-3" />,
        description: 'Title match',
      },
      {
        value: 'keyword',
        label: 'Keyword',
        icon: <Type className="h-3 w-3" />,
        description: 'Full-text (BM25)',
      },
      {
        value: 'semantic',
        label: 'AI',
        icon: <Sparkles className="h-3 w-3" />,
        description: 'Meaning',
      },
      {
        value: 'graph',
        label: 'Graph',
        icon: <Network className="h-3 w-3" />,
        description: 'Entities',
      },
    ];

  return (
    <div className="flex gap-1 p-1 bg-muted/50 rounded-md">
      {modes.map((m) => (
        <Button
          key={m.value}
          variant={mode === m.value ? 'secondary' : 'ghost'}
          size="sm"
          className={cn('h-6 px-2 text-xs gap-1', mode === m.value && 'bg-background shadow-sm')}
          onClick={() => onChange(m.value)}
          title={m.description}
        >
          {m.icon}
          <span className="hidden sm:inline">{m.label}</span>
        </Button>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiSearchDialog({
  open,
  onClose,
  workspaceId,
  projectId,
  pages,
  basePath,
  defaultMode = 'hybrid',
  onShowInGraph,
}: WikiSearchDialogProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultMode);
  const [graphResults, setGraphResults] = useState<SearchResult[]>([]);
  const [semanticResults, setSemanticResults] = useState<SearchResult[]>([]);
  const [edgeResults, setEdgeResults] = useState<SearchResult[]>([]);
  const [keywordResults, setKeywordResults] = useState<SearchResult[]>([]);
  const [rrfHybridResults, setRrfHybridResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const utils = trpc.useUtils();

  // Semantic search mutation (Fase 15.2)
  const semanticSearchMutation = trpc.wikiAi.semanticSearch.useMutation();

  // Hybrid search mutation (Fase 19.4) - combines pages + edges
  const hybridSearchMutation = trpc.wikiAi.hybridSemanticSearch.useMutation();

  // BM25 keyword search mutation (Fase 20.5)
  const keywordSearchMutation = trpc.wikiAi.keywordSearch.useMutation();

  // RRF hybrid search mutation (Fase 20.5) - combines BM25 + Vector + Edge
  const rrfHybridSearchMutation = trpc.wikiAi.rrfHybridSearch.useMutation();

  // Local search results
  const localResults = searchLocalPages(pages, query);

  // Combine results based on search mode
  const allResults = (() => {
    const seen = new Set<number>();
    const results: SearchResult[] = [];

    const addUnique = (items: SearchResult[]) => {
      for (const item of items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          results.push(item);
        }
      }
    };

    switch (searchMode) {
      case 'local':
        addUnique(localResults);
        break;
      case 'graph':
        addUnique(graphResults);
        break;
      case 'semantic':
        addUnique(semanticResults);
        // Also add edge results in semantic mode (Fase 19.4)
        addUnique(edgeResults);
        break;
      case 'keyword':
        // BM25 keyword search only (Fase 20.5)
        addUnique(keywordResults);
        break;
      case 'hybrid':
      default:
        // RRF Hybrid: use unified RRF results if available (Fase 20.5)
        // Falls back to classic mode if RRF not available
        if (rrfHybridResults.length > 0) {
          addUnique(rrfHybridResults);
        } else {
          // Classic mode: local first, then semantic + edges, then graph
          addUnique(localResults);
          addUnique(semanticResults);
          addUnique(edgeResults);
          addUnique(graphResults);
        }
        break;
    }

    return results;
  })();

  // Graph search (entity-based via Graphiti)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setGraphResults([]);
      return;
    }

    if (searchMode !== 'graph' && searchMode !== 'hybrid') {
      setGraphResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use groupId format for workspace wikis: 'wiki-ws-{id}'
        const groupId = `wiki-ws-${workspaceId}`;

        const results = await utils.client.graphiti.search.query({
          query,
          groupId,
          limit: 5,
        });

        // Convert to SearchResult format
        const graph: SearchResult[] = results
          .filter((r) => r.pageId !== undefined)
          .map((r) => {
            const localPage = pages.find((p) => p.id === r.pageId);
            return {
              id: r.pageId!,
              title: localPage?.title ?? r.name,
              slug: localPage?.slug ?? '',
              type: 'graph' as const,
              score: r.score,
              status: localPage?.status,
            };
          })
          .filter((r) => r.slug);

        setGraphResults(graph);
      } catch (error) {
        console.error('Graph search failed:', error);
        setGraphResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, workspaceId, pages, utils.client, searchMode]);

  // Semantic search (vector-based via Qdrant) - Fase 15.2
  // In hybrid mode, uses hybridSemanticSearch to get both pages + edges (Fase 19.4)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setSemanticResults([]);
      setEdgeResults([]);
      return;
    }

    if (searchMode !== 'semantic' && searchMode !== 'hybrid') {
      setSemanticResults([]);
      setEdgeResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Use hybrid search for both semantic and hybrid modes (Fase 19.4)
        const result = await hybridSearchMutation.mutateAsync({
          workspaceId,
          projectId,
          query,
          includePages: true,
          includeEdges: true,
          limitPerType: 5,
          limit: 10,
          scoreThreshold: 0.5,
        });

        // Separate page and edge results
        const pageResults = result.results.filter((r) => r.type === 'page');
        const edgeResultsRaw = result.results.filter((r) => r.type === 'edge');

        // Convert page results to SearchResult format
        const semantic: SearchResult[] = pageResults
          .map((r) => {
            const localPage = pages.find((p) => p.id === r.pageId);
            return {
              id: r.pageId!,
              title: localPage?.title ?? r.title ?? 'Unknown',
              slug: localPage?.slug ?? '',
              type: 'semantic' as const,
              score: r.score,
              status: localPage?.status,
            };
          })
          .filter((r) => r.slug);

        // Convert edge results to SearchResult format (Fase 19.4)
        const edges: SearchResult[] = edgeResultsRaw
          .map((r) => {
            const localPage = pages.find((p) => p.id === r.pageId);
            return {
              id: r.pageId!, // Use pageId for navigation
              title: r.fact ?? 'Unknown fact',
              slug: localPage?.slug ?? '',
              type: 'edge' as const,
              score: r.score,
              status: localPage?.status,
              edgeData: {
                edgeId: r.edgeId ?? '',
                score: r.score,
                fact: r.fact ?? '',
                edgeType: r.edgeType ?? '',
                sourceNodeId: r.sourceNodeId ?? '',
                targetNodeId: r.targetNodeId ?? '',
                pageId: r.pageId!,
              },
            };
          })
          .filter((r) => r.slug);

        setSemanticResults(semantic);
        setEdgeResults(edges);
      } catch (error) {
        console.error('Hybrid semantic search failed:', error);
        setSemanticResults([]);
        setEdgeResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
    // Note: hybridSearchMutation excluded - mutateAsync is stable, we only want input changes to trigger
  }, [query, workspaceId, projectId, pages, searchMode]);

  // BM25 Keyword search (Fase 20.5)
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setKeywordResults([]);
      return;
    }

    if (searchMode !== 'keyword') {
      setKeywordResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await keywordSearchMutation.mutateAsync({
          workspaceId,
          projectId,
          query,
          limit: 10,
        });

        const keywords: SearchResult[] = result.results.map((r) => {
          const localPage = pages.find((p) => p.id === r.pageId);
          return {
            id: r.pageId,
            title: r.title,
            slug: r.slug,
            type: 'keyword' as const,
            score: r.rank,
            status: localPage?.status,
            headline: r.headline,
          };
        });

        setKeywordResults(keywords);
      } catch (error) {
        console.error('Keyword search failed:', error);
        setKeywordResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, workspaceId, projectId, pages, searchMode]);

  // RRF Hybrid search (Fase 20.5) - combines BM25 + Vector + Edge
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setRrfHybridResults([]);
      return;
    }

    if (searchMode !== 'hybrid') {
      setRrfHybridResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsSearching(true);
      try {
        const result = await rrfHybridSearchMutation.mutateAsync({
          workspaceId,
          projectId,
          query,
          limit: 15,
          useBm25: true,
          useVector: true,
          useEdge: true,
        });

        const hybrid: SearchResult[] = result.results.map((r) => {
          const localPage = pages.find((p) => p.id === r.pageId);
          // Determine primary type based on sources
          let type: SearchResult['type'] = 'semantic';
          if (r.sources.includes('bm25') && !r.sources.includes('vector')) {
            type = 'keyword';
          } else if (r.sources.length > 1) {
            type = 'semantic'; // Multi-source gets semantic icon
          }

          return {
            id: r.pageId,
            title: r.title,
            slug: r.slug ?? localPage?.slug ?? '',
            type,
            score: r.score,
            status: localPage?.status,
            headline: r.headline,
            sources: r.sources,
          };
        });

        setRrfHybridResults(hybrid);
      } catch (error) {
        console.error('RRF hybrid search failed:', error);
        setRrfHybridResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query, workspaceId, projectId, pages, searchMode]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setGraphResults([]);
      setSemanticResults([]);
      setEdgeResults([]);
      setKeywordResults([]);
      setRrfHybridResults([]);
      setSearchMode(defaultMode);
      // Focus input after dialog animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, defaultMode]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [allResults.length]);

  // Navigate to selected result
  const navigateToResult = useCallback(
    (result: SearchResult) => {
      navigate(`${basePath}/${result.slug}`);
      onClose();
    },
    [navigate, basePath, onClose]
  );

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev < allResults.length - 1 ? prev + 1 : prev));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case 'Enter':
          e.preventDefault();
          if (allResults[selectedIndex]) {
            navigateToResult(allResults[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [allResults, selectedIndex, navigateToResult, onClose]
  );

  // Get the label for result sections
  const getResultSectionLabel = (type: SearchResult['type']) => {
    switch (type) {
      case 'local':
        return { label: 'Title Matches', icon: <FileText className="h-3 w-3" /> };
      case 'graph':
        return { label: 'Entity Matches', icon: <Network className="h-3 w-3" /> };
      case 'semantic':
        return { label: 'AI Matches', icon: <Sparkles className="h-3 w-3" /> };
      case 'keyword':
        return { label: 'Keyword Matches', icon: <Type className="h-3 w-3" /> };
      case 'edge':
        return { label: 'Related Facts', icon: <Link2 className="h-3 w-3" /> };
    }
  };

  // Group results by type for display
  const groupedResults = allResults.reduce(
    (acc, result) => {
      if (!acc[result.type]) acc[result.type] = [];
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<SearchResult['type'], SearchResult[]>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0" aria-describedby={undefined}>
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="sr-only">Search Wiki</DialogTitle>
        </DialogHeader>

        {/* Search Mode Toggle */}
        <div className="px-4 pb-2">
          <SearchModeToggle mode={searchMode} onChange={setSearchMode} />
        </div>

        {/* Search Input */}
        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                searchMode === 'semantic'
                  ? 'Search by meaning...'
                  : searchMode === 'graph'
                    ? 'Search entities...'
                    : searchMode === 'keyword'
                      ? 'Search by keyword (BM25)...'
                      : searchMode === 'hybrid'
                        ? 'Search all sources (RRF)...'
                        : 'Search wiki pages...'
              }
              className="pl-9 pr-8"
            />
            {(isSearching ||
              semanticSearchMutation.isPending ||
              hybridSearchMutation.isPending ||
              keywordSearchMutation.isPending ||
              rrfHybridSearchMutation.isPending) && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Results */}
        <ScrollArea className="max-h-[300px]">
          <div className="px-2 pb-2">
            {query.trim() === '' ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search wiki pages</p>
                <p className="text-xs mt-1">
                  Use <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Enter</kbd> to select,{' '}
                  <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Esc</kbd> to close
                </p>
                {searchMode === 'semantic' && (
                  <p className="text-xs mt-2 text-purple-600">
                    AI search finds pages by meaning, not just keywords
                  </p>
                )}
                {searchMode === 'keyword' && (
                  <p className="text-xs mt-2 text-green-600">
                    Full-text search with highlighted matches
                  </p>
                )}
                {searchMode === 'hybrid' && (
                  <p className="text-xs mt-2 text-amber-600">
                    Combines keyword, AI, and graph search (RRF fusion)
                  </p>
                )}
              </div>
            ) : allResults.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {isSearching ||
                semanticSearchMutation.isPending ||
                hybridSearchMutation.isPending ||
                keywordSearchMutation.isPending ||
                rrfHybridSearchMutation.isPending ? (
                  <>
                    <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                    <p>{searchMode === 'semantic' ? 'Searching by meaning...' : 'Searching...'}</p>
                  </>
                ) : (
                  <>
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No pages found for "{query}"</p>
                    {searchMode !== 'hybrid' && (
                      <p className="text-xs mt-1">
                        Try{' '}
                        <button
                          className="text-primary underline"
                          onClick={() => setSearchMode('hybrid')}
                        >
                          hybrid mode
                        </button>{' '}
                        for more results
                      </p>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {/* Render results grouped by type (Fase 19.4: added 'edge', Fase 20.5: added 'keyword') */}
                {(['local', 'keyword', 'semantic', 'edge', 'graph'] as const).map((type) => {
                  const results = groupedResults[type];
                  if (!results?.length) return null;

                  const section = getResultSectionLabel(type);
                  const firstResult = results[0];
                  const startIndex = firstResult
                    ? allResults.findIndex((r) => r.type === type && r.id === firstResult.id)
                    : 0;

                  return (
                    <div key={type}>
                      <div className="px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1 mt-2 first:mt-0">
                        {section.icon}
                        {section.label}
                      </div>
                      {results.map((result, index) => (
                        <ResultItem
                          key={`${type}-${result.id}`}
                          result={result}
                          isSelected={startIndex + index === selectedIndex}
                          onClick={() => navigateToResult(result)}
                          onShowInGraph={
                            onShowInGraph
                              ? () => {
                                  onShowInGraph(result.id);
                                  onClose();
                                }
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="px-4 py-2 border-t text-xs text-muted-foreground flex items-center justify-between">
          <span>
            {allResults.length} result{allResults.length !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-2">
            <kbd className="px-1 py-0.5 bg-muted rounded">↑↓</kbd>
            <span>Navigate</span>
            <kbd className="px-1 py-0.5 bg-muted rounded">↵</kbd>
            <span>Open</span>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default WikiSearchDialog;
