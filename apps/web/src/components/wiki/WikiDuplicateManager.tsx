/**
 * Wiki Duplicate Manager Component
 *
 * Fase 22 - Entity Deduplication UI
 * Fase 22.8 - Added loading of existing confirmed duplicates
 * Fase 22.9 - Added graph visualization toggle with bidirectional selection
 *
 * A dialog for managing duplicate entities in the knowledge graph.
 * Features:
 * - Load existing confirmed duplicates on open
 * - Scan for potential new duplicates
 * - Review and approve duplicate pairs
 * - Merge or unlink duplicates
 * - Batch operations
 * - Toggle graph visualization panel (Fase 22.9)
 * - Highlight duplicate pairs in graph (Fase 22.9)
 * - Bidirectional selection between list and graph (Fase 22.9)
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Copy,
  GitMerge,
  Search,
  Check,
  X,
  Loader2,
  RefreshCw,
  Link2Off,
  ChevronRight,
  ChevronDown,
  LinkIcon,
  Network,
  PanelRightOpen,
  PanelRightClose,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trpc } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { WikiGraphView } from './WikiGraphView';

// =============================================================================
// Types
// =============================================================================

export interface WikiDuplicateManagerProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onOpenChange: (open: boolean) => void;
  /** Workspace ID to scan for duplicates */
  workspaceId: number;
  /** Optional project ID to limit scope */
  projectId?: number;
  /** Optional group ID (for wiki context) */
  groupId?: string;
}

interface DuplicateCandidate {
  sourceUuid: string;
  sourceName: string;
  sourceType?: string;
  targetUuid: string;
  targetName: string;
  targetType?: string;
  confidence: number;
  matchType: string;
  alreadyLinked?: boolean;
}

interface ConfirmedDuplicate extends DuplicateCandidate {
  sourceType: string;
  targetType: string;
  detectedAt: string | null;
  detectedBy: string | null;
}

type NodeType = 'Concept' | 'Person' | 'Task' | 'Project';

// =============================================================================
// Helper Functions
// =============================================================================

function getMatchTypeBadgeClass(matchType: string): string {
  switch (matchType) {
    case 'exact':
      return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400';
    case 'fuzzy':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400';
    case 'embedding':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400';
    case 'llm':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400';
    case 'manual':
      return 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400';
  }
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.9) return 'text-green-600 dark:text-green-400';
  if (confidence >= 0.7) return 'text-blue-600 dark:text-blue-400';
  if (confidence >= 0.5) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

// =============================================================================
// Component
// =============================================================================

export function WikiDuplicateManager({
  open,
  onOpenChange,
  workspaceId,
  projectId,
  groupId,
}: WikiDuplicateManagerProps) {
  // State
  const [threshold, setThreshold] = useState(0.85);
  const [dryRun, setDryRun] = useState(true);
  const [selectedTypes, setSelectedTypes] = useState<NodeType[]>(['Concept', 'Person']);
  const [expandedPairs, setExpandedPairs] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<'confirmed' | 'scan'>('confirmed');
  const [showLinked, setShowLinked] = useState(false);

  // Fase 22.9: Graph visualization state
  const [showGraph, setShowGraph] = useState(false);
  const [selectedPair, setSelectedPair] = useState<{
    sourceUuid: string;
    targetUuid: string;
  } | null>(null);

  // tRPC utils
  const utils = trpc.useUtils();

  // Fase 22.8: Load existing confirmed duplicates
  const existingDuplicatesQuery = trpc.graphiti.getWorkspaceDuplicates.useQuery(
    {
      workspaceId,
      projectId,
      groupId,
      nodeTypes: selectedTypes,
    },
    {
      enabled: open, // Only fetch when dialog is open
      refetchOnWindowFocus: false,
    }
  );

  const confirmedDuplicates: ConfirmedDuplicate[] = existingDuplicatesQuery.data?.duplicates || [];

  // Mutations
  const scanMutation = trpc.graphiti.runBatchDedup.useMutation({
    onSuccess: (data) => {
      toast.success(`Scan complete: Found ${data.duplicatesFound} potential duplicates`, {
        description: `Scanned ${data.totalNodes} nodes`,
      });
      setIsScanning(false);
      setActiveTab('scan');
    },
    onError: (error) => {
      toast.error('Scan failed', { description: error.message });
      setIsScanning(false);
    },
  });

  const markDuplicateMutation = trpc.graphiti.markAsDuplicate.useMutation({
    onSuccess: () => {
      toast.success('Marked as duplicate');
      utils.graphiti.getWorkspaceDuplicates.invalidate();
      utils.graphiti.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to mark duplicate', { description: error.message });
    },
  });

  const unmarkDuplicateMutation = trpc.graphiti.unmarkDuplicate.useMutation({
    onSuccess: () => {
      toast.success('Duplicate link removed');
      utils.graphiti.getWorkspaceDuplicates.invalidate();
      utils.graphiti.invalidate();
    },
    onError: (error) => {
      toast.error('Failed to remove duplicate link', { description: error.message });
    },
  });

  const mergeMutation = trpc.graphiti.mergeDuplicates.useMutation({
    onSuccess: () => {
      toast.success('Entities merged successfully');
      utils.graphiti.getWorkspaceDuplicates.invalidate();
      utils.graphiti.invalidate();
    },
    onError: (error) => {
      toast.error('Merge failed', { description: error.message });
    },
  });

  // Handlers
  const handleScan = useCallback(() => {
    setIsScanning(true);
    scanMutation.mutate({
      workspaceId,
      projectId,
      groupId,
      nodeTypes: selectedTypes,
      threshold,
      dryRun,
      limit: 50,
    });
  }, [workspaceId, projectId, groupId, selectedTypes, threshold, dryRun, scanMutation]);

  const handleMarkDuplicate = useCallback(
    (sourceUuid: string, targetUuid: string, confidence: number) => {
      markDuplicateMutation.mutate({ sourceUuid, targetUuid, confidence });
    },
    [markDuplicateMutation]
  );

  const handleUnmarkDuplicate = useCallback(
    (sourceUuid: string, targetUuid: string) => {
      unmarkDuplicateMutation.mutate({ sourceUuid, targetUuid });
    },
    [unmarkDuplicateMutation]
  );

  const handleMerge = useCallback(
    (sourceUuid: string, targetUuid: string) => {
      mergeMutation.mutate({ sourceUuid, targetUuid, keepTarget: true });
    },
    [mergeMutation]
  );

  const toggleExpanded = useCallback((key: string) => {
    setExpandedPairs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // Fase 22.9: Handle selecting a duplicate pair for graph highlighting
  const handleSelectPair = useCallback((sourceUuid: string, targetUuid: string) => {
    setSelectedPair((prev) => {
      // Toggle off if same pair is clicked
      if (prev?.sourceUuid === sourceUuid && prev?.targetUuid === targetUuid) {
        return null;
      }
      return { sourceUuid, targetUuid };
    });
  }, []);

  // Fase 22.9: Calculate highlighted node IDs for graph
  const highlightedNodeIds = useMemo(() => {
    if (!selectedPair) return [];
    return [selectedPair.sourceUuid, selectedPair.targetUuid];
  }, [selectedPair]);

  // Results from scan
  const scanData = scanMutation.data;
  const allScanCandidates: DuplicateCandidate[] =
    scanData && 'candidates' in scanData
      ? [...scanData.candidates].sort((a, b) => a.sourceName.localeCompare(b.sourceName))
      : [];

  // Count new vs already linked
  const newCandidatesCount = allScanCandidates.filter((c) => !c.alreadyLinked).length;
  const linkedCandidatesCount = allScanCandidates.filter((c) => c.alreadyLinked).length;

  // Filter based on showLinked toggle
  const scanCandidates = showLinked
    ? allScanCandidates
    : allScanCandidates.filter((c) => !c.alreadyLinked);

  // Fase 22.9: Handle click on highlighted node in graph
  const handleHighlightedNodeClick = useCallback(
    (nodeId: string) => {
      // Find the duplicate pair containing this node and expand it
      const allDuplicates = [...confirmedDuplicates, ...allScanCandidates];
      const pair = allDuplicates.find(
        (dup) => dup.sourceUuid === nodeId || dup.targetUuid === nodeId
      );
      if (pair) {
        const key = `${pair.sourceUuid}-${pair.targetUuid}`;
        if (!expandedPairs.has(key)) {
          toggleExpanded(key);
        }
      }
    },
    [confirmedDuplicates, allScanCandidates, expandedPairs, toggleExpanded]
  );

  // Render a duplicate pair row
  const renderDuplicateRow = (
    dup: DuplicateCandidate | ConfirmedDuplicate,
    isConfirmed: boolean
  ) => {
    const key = `${dup.sourceUuid}-${dup.targetUuid}`;
    const isExpanded = expandedPairs.has(key);
    const isLinked = isConfirmed || dup.alreadyLinked;
    // Fase 22.9: Check if this pair is selected for graph highlighting
    const isSelected =
      selectedPair?.sourceUuid === dup.sourceUuid && selectedPair?.targetUuid === dup.targetUuid;

    return (
      <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleExpanded(key)}>
        <div
          className={cn(
            'py-2',
            isSelected && showGraph && 'bg-amber-50 dark:bg-amber-900/20 rounded-lg'
          )}
        >
          <div className="flex items-center gap-2">
            {/* Fase 22.9: Graph highlight button */}
            {showGraph && (
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6 shrink-0',
                  isSelected && 'text-amber-600 dark:text-amber-400'
                )}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectPair(dup.sourceUuid, dup.targetUuid);
                }}
                title={isSelected ? 'Hide in graph' : 'Show in graph'}
              >
                <Network className="h-4 w-4" />
              </Button>
            )}
            <CollapsibleTrigger asChild>
              <div className="flex-1 flex items-center justify-between cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-medium">{dup.sourceName}</span>
                  <span className="text-muted-foreground">≈</span>
                  <span className="font-medium">{dup.targetName}</span>
                </div>
                <div className="flex items-center gap-2">
                  {isLinked && (
                    <Badge variant="secondary" className="text-xs">
                      <LinkIcon className="h-3 w-3 mr-1" />
                      Linked
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn('text-xs', getMatchTypeBadgeClass(dup.matchType))}
                  >
                    {dup.matchType}
                  </Badge>
                  <span className={cn('text-sm font-medium', getConfidenceColor(dup.confidence))}>
                    {Math.round(dup.confidence * 100)}%
                  </span>
                </div>
              </div>
            </CollapsibleTrigger>
          </div>

          <CollapsibleContent>
            <div className="flex items-center justify-between mt-2 ml-6 text-sm text-muted-foreground">
              <div className="flex gap-4">
                <span>
                  Source: <code>{dup.sourceUuid.slice(0, 8)}</code>
                </span>
                <span>
                  Target: <code>{dup.targetUuid.slice(0, 8)}</code>
                </span>
              </div>
              <div className="flex gap-2">
                {isLinked ? (
                  // Actions for linked duplicates (confirmed tab or already linked in scan)
                  <>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleMerge(dup.sourceUuid, dup.targetUuid)}
                      disabled={mergeMutation.isPending}
                    >
                      <GitMerge className="h-3 w-3 mr-1" />
                      Merge
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUnmarkDuplicate(dup.sourceUuid, dup.targetUuid)}
                      disabled={unmarkDuplicateMutation.isPending}
                    >
                      <Link2Off className="h-3 w-3 mr-1" />
                      Unlink
                    </Button>
                  </>
                ) : (
                  // Actions for new scan candidates
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        handleMarkDuplicate(dup.sourceUuid, dup.targetUuid, dup.confidence)
                      }
                      disabled={markDuplicateMutation.isPending}
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Confirm
                    </Button>
                    <Button size="sm" variant="ghost" className="text-muted-foreground">
                      <X className="h-3 w-3 mr-1" />
                      Skip
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'max-h-[90vh] flex flex-col transition-all duration-300 ease-in-out',
          showGraph ? 'max-w-[95vw] w-[1600px]' : 'max-w-3xl'
        )}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate Entity Manager
            </DialogTitle>
            {/* Fase 22.9: Graph toggle button */}
            <Button
              variant={showGraph ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowGraph(!showGraph)}
              className={cn('transition-colors', showGraph && 'bg-amber-600 hover:bg-amber-700')}
            >
              {showGraph ? (
                <>
                  <PanelRightClose className="h-4 w-4 mr-2" />
                  Hide Graph
                </>
              ) : (
                <>
                  <PanelRightOpen className="h-4 w-4 mr-2" />
                  Show Graph
                </>
              )}
            </Button>
          </div>
          <DialogDescription>Manage duplicate entities in your knowledge graph.</DialogDescription>
        </DialogHeader>

        {/* Fase 22.9: Main content area with optional graph panel */}
        <div
          className={cn('flex flex-1 gap-4 overflow-hidden', showGraph ? 'flex-row' : 'flex-col')}
        >
          {/* Left side: Duplicate management */}
          <div className={cn('flex flex-col flex-1 overflow-hidden', showGraph && 'max-w-[600px]')}>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as typeof activeTab)}
              className="flex flex-col flex-1 overflow-hidden"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="confirmed" className="flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Confirmed ({confirmedDuplicates.length})
                </TabsTrigger>
                <TabsTrigger value="scan" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Scan {scanCandidates.length > 0 && `(${scanCandidates.length})`}
                </TabsTrigger>
              </TabsList>

              {/* Confirmed Duplicates Tab */}
              <TabsContent value="confirmed" className="flex-1 overflow-hidden mt-4">
                <Card className="flex flex-col h-full">
                  <CardHeader className="py-3 flex-shrink-0">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Confirmed Duplicates</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => existingDuplicatesQuery.refetch()}
                        disabled={existingDuplicatesQuery.isRefetching}
                      >
                        <RefreshCw
                          className={cn(
                            'h-4 w-4',
                            existingDuplicatesQuery.isRefetching && 'animate-spin'
                          )}
                        />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {confirmedDuplicates.length} duplicate pairs marked in this workspace
                    </p>
                  </CardHeader>
                  <CardContent className="flex-1 min-h-0 pt-0">
                    {existingDuplicatesQuery.isLoading ? (
                      <div className="flex items-center justify-center h-[200px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <ScrollArea className="h-[350px]">
                        <div className="divide-y pr-4">
                          {confirmedDuplicates.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <p>No confirmed duplicates yet.</p>
                              <p className="text-xs mt-1">
                                Use the Scan tab to find potential duplicates.
                              </p>
                            </div>
                          ) : (
                            confirmedDuplicates.map((dup) => renderDuplicateRow(dup, true))
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Scan Tab */}
              <TabsContent value="scan" className="flex-1 overflow-hidden mt-4 space-y-4">
                {/* Scan Settings Card */}
                <Card>
                  <CardContent className="space-y-4 pt-4">
                    {/* Similarity Threshold */}
                    <div className="space-y-2">
                      <Label>Similarity Threshold</Label>
                      <div className="flex items-center gap-4">
                        <Slider
                          value={[threshold]}
                          onValueChange={(values: number[]) => setThreshold(values[0] ?? 0.85)}
                          min={0.5}
                          max={1.0}
                          step={0.05}
                          className="flex-1"
                        />
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {Math.round(threshold * 100)}%
                        </span>
                      </div>
                    </div>

                    {/* Entity Types */}
                    <div className="flex flex-wrap gap-2">
                      {(['Concept', 'Person', 'Task', 'Project'] as NodeType[]).map((type) => (
                        <Badge
                          key={type}
                          variant={selectedTypes.includes(type) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedTypes((prev) =>
                              prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
                            );
                          }}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>

                    {/* Dry Run */}
                    <div className="flex items-center gap-3">
                      <Switch checked={dryRun} onCheckedChange={setDryRun} />
                      <Label className="text-sm text-muted-foreground">
                        Dry run (preview only)
                      </Label>
                    </div>

                    {/* Scan Button */}
                    <Button
                      onClick={handleScan}
                      disabled={isScanning || selectedTypes.length === 0}
                      className="w-full"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <Search className="h-4 w-4 mr-2" />
                          Scan for New Duplicates
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Scan Results */}
                {scanData && (
                  <Card className="flex flex-col flex-1 min-h-0">
                    <CardHeader className="py-3 flex-shrink-0">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Scan Results</CardTitle>
                        <Button variant="ghost" size="sm" onClick={handleScan}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Found {scanData.duplicatesFound} potential duplicates in{' '}
                        {scanData.totalNodes} nodes
                      </p>
                    </CardHeader>
                    <CardContent className="flex-1 min-h-0 pt-0">
                      {/* Stats Row */}
                      <div className="grid grid-cols-4 gap-4 mb-4 text-center">
                        <div>
                          <div className="text-2xl font-bold">{scanData.totalNodes}</div>
                          <div className="text-xs text-muted-foreground">Nodes Scanned</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-blue-600">
                            {newCandidatesCount}
                          </div>
                          <div className="text-xs text-muted-foreground">New Candidates</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-amber-600">
                            {linkedCandidatesCount}
                          </div>
                          <div className="text-xs text-muted-foreground">Already Linked</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {scanData.edgesCreated}
                          </div>
                          <div className="text-xs text-muted-foreground">Edges Created</div>
                        </div>
                      </div>

                      {/* Show linked toggle */}
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                        <Checkbox
                          id="showLinked"
                          checked={showLinked}
                          onCheckedChange={(checked) => setShowLinked(checked === true)}
                        />
                        <Label
                          htmlFor="showLinked"
                          className="text-sm text-muted-foreground cursor-pointer"
                        >
                          Toon ook bevestigde duplicates ({linkedCandidatesCount})
                        </Label>
                      </div>

                      {/* Duplicate List */}
                      <ScrollArea className="h-[200px]">
                        <div className="divide-y pr-4">
                          {scanCandidates.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Check className="h-8 w-8 mx-auto mb-2 text-green-500" />
                              <p>
                                {showLinked
                                  ? 'No duplicates found at current threshold.'
                                  : 'No new duplicates found. All matches are already linked.'}
                              </p>
                            </div>
                          ) : (
                            scanCandidates.map((dup) => renderDuplicateRow(dup, false))
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Fase 22.9: Right side: Graph visualization */}
          {showGraph && (
            <div className="flex-1 min-w-[500px] min-h-[400px] border rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 flex flex-col">
              <WikiGraphView
                workspaceId={workspaceId}
                basePath={`/wiki/${workspaceId}`}
                className="flex-1"
                highlightedNodeIds={highlightedNodeIds}
                onHighlightedNodeClick={handleHighlightedNodeClick}
              />
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
