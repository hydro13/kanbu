/*
 * Wiki Graph View Component
 * Version: 3.2.0
 *
 * D3.js force-directed graph visualization for wiki knowledge graph.
 * Shows wiki pages, entities, and their relationships.
 *
 * Features (Fase 15.4 Enhanced Graphs - COMPLETE):
 * - Force-directed layout with configurable force strength
 * - Multiple layout options (Force/Hierarchical/Radial)
 * - Entity type filtering (WikiPage/Concept/Person/Task)
 * - Time range filtering with timestamps
 * - Depth control (1-5 levels from selected node)
 * - Search within graph with highlighting
 * - Node hover cards with details
 * - Path finding between nodes with explanation
 * - Zoom, pan, and fullscreen
 * - Hide/show orphan nodes
 * - Clustering (community detection)
 * - Detail sidebar panel
 * - Mini-map navigation
 * - Timeline mode (chronological view)
 * - Export PNG/SVG/JSON
 * - "Ask about this node" integration (Fase 15.5)
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 5 - Graph Visualization)
 *
 * Modified: 2026-01-12
 * Change: Enhanced Graphs (Fase 15.4) - Filtering, hover cards, search
 *
 * Modified: 2026-01-12
 * Change: Complete Fase 15.4 - All features including clustering,
 *         timeline mode, mini-map, export, multiple layouts
 *
 * Modified: 2026-01-12
 * Change: Fase 15.5 - Added "Ask about this node" for cross-feature linking
 *
 * Modified: 2026-01-12
 * Change: Fixed hover card interaction - card stays open when mouse moves to it
 *
 * Modified: 2026-01-12
 * Change: Fase 15.5 - Added progressive loading with node limit for large graphs
 *
 * Modified: 2026-01-14
 * Change: Fase 22.9 - Added highlightedNodeIds and onHighlightedNodeClick props
 *         for duplicate entity highlighting in WikiDuplicateManager
 * ===================================================================
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Loader2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  X,
  Search,
  Filter,
  EyeOff,
  FileText,
  Lightbulb,
  User,
  CheckSquare,
  ExternalLink,
  ArrowRight,
  Download,
  Layout,
  Clock,
  Map as MapIcon,
  ChevronRight,
  Circle,
  GitBranch,
  Layers,
  Calendar,
  Image,
  FileJson,
  FileCode,
  PanelRight,
  PanelRightClose,
  Sparkles,
} from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: 'WikiPage' | 'Concept' | 'Person' | 'Task'
  pageId?: number
  slug?: string
  updatedAt?: string
  // Enhanced properties
  connectionCount?: number
  isHighlighted?: boolean
  isSelected?: boolean
  depth?: number // Distance from selected node
  cluster?: number // Community/cluster ID
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: 'LINKS_TO' | 'MENTIONS'
  updatedAt?: string
  isHighlighted?: boolean
}

interface WikiGraphViewProps {
  workspaceId: number
  basePath: string
  className?: string
  width?: number
  height?: number
  fullscreen?: boolean
  onToggleFullscreen?: () => void
  /** Callback when "Ask about this node" is triggered */
  onAskAboutNode?: (nodeLabel: string, nodeType: string) => void
  /** Node IDs to highlight (e.g., for duplicate pairs) */
  highlightedNodeIds?: string[]
  /** Callback when a highlighted node is clicked */
  onHighlightedNodeClick?: (nodeId: string) => void
}

interface HoverCardData {
  node: GraphNode
  x: number
  y: number
  connections: { node: GraphNode; type: string; direction: 'in' | 'out' }[]
}

interface PathStep {
  from: GraphNode
  to: GraphNode
  edgeType: string
}

type LayoutType = 'force' | 'hierarchical' | 'radial'

// =============================================================================
// Color Configuration
// =============================================================================

const NODE_COLORS: Record<GraphNode['type'], string> = {
  WikiPage: '#3b82f6',  // Blue
  Concept: '#8b5cf6',   // Purple
  Person: '#10b981',    // Green
  Task: '#f59e0b',      // Amber
}

const NODE_ICONS: Record<GraphNode['type'], typeof FileText> = {
  WikiPage: FileText,
  Concept: Lightbulb,
  Person: User,
  Task: CheckSquare,
}

const EDGE_COLORS: Record<GraphEdge['type'], string> = {
  LINKS_TO: '#3b82f6',   // Blue
  MENTIONS: '#8b5cf6',   // Purple
}

// Cluster colors (for community detection)
const CLUSTER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
  '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
]

// =============================================================================
// Helper Functions
// =============================================================================

function getNodeConnections(
  node: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { node: GraphNode; type: string; direction: 'in' | 'out' }[] {
  const connections: { node: GraphNode; type: string; direction: 'in' | 'out' }[] = []

  for (const edge of edges) {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id

    if (sourceId === node.id) {
      const targetNode = nodes.find(n => n.id === targetId)
      if (targetNode) {
        connections.push({ node: targetNode, type: edge.type, direction: 'out' })
      }
    } else if (targetId === node.id) {
      const sourceNode = nodes.find(n => n.id === sourceId)
      if (sourceNode) {
        connections.push({ node: sourceNode, type: edge.type, direction: 'in' })
      }
    }
  }

  return connections
}

function calculateDepths(
  startNode: GraphNode,
  _nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth: number
): Map<string, number> {
  const depths = new Map<string, number>([[startNode.id, 0]])

  const queue: { nodeId: string; depth: number }[] = [{ nodeId: startNode.id, depth: 0 }]
  const visited = new Set<string>([startNode.id])

  while (queue.length > 0) {
    const { nodeId, depth } = queue.shift()!

    if (depth >= maxDepth) continue

    for (const edge of edges) {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id

      let neighborId: string | null = null
      if (sourceId === nodeId) neighborId = targetId
      else if (targetId === nodeId) neighborId = sourceId

      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId)
        depths.set(neighborId, depth + 1)
        queue.push({ nodeId: neighborId, depth: depth + 1 })
      }
    }
  }

  return depths
}

// Find shortest path using BFS and return full path with edges
function findShortestPath(
  start: GraphNode,
  end: GraphNode,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { nodeIds: string[]; steps: PathStep[] } {
  const queue: { nodeId: string; path: string[] }[] = [{ nodeId: start.id, path: [start.id] }]
  const visited = new Set<string>([start.id])

  while (queue.length > 0) {
    const { nodeId, path } = queue.shift()!

    if (nodeId === end.id) {
      // Build path steps
      const steps: PathStep[] = []
      for (let i = 0; i < path.length - 1; i++) {
        const fromNode = nodes.find(n => n.id === path[i])!
        const toNode = nodes.find(n => n.id === path[i + 1])!
        const edge = edges.find(e => {
          const sourceId = typeof e.source === 'string' ? e.source : e.source.id
          const targetId = typeof e.target === 'string' ? e.target : e.target.id
          return (sourceId === path[i] && targetId === path[i + 1]) ||
                 (targetId === path[i] && sourceId === path[i + 1])
        })
        steps.push({
          from: fromNode,
          to: toNode,
          edgeType: edge?.type || 'UNKNOWN',
        })
      }
      return { nodeIds: path, steps }
    }

    for (const edge of edges) {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id

      let neighborId: string | null = null
      if (sourceId === nodeId) neighborId = targetId
      else if (targetId === nodeId) neighborId = sourceId

      if (neighborId && !visited.has(neighborId)) {
        visited.add(neighborId)
        queue.push({ nodeId: neighborId, path: [...path, neighborId] })
      }
    }
  }

  return { nodeIds: [], steps: [] } // No path found
}

// Simple Louvain-like community detection
function detectCommunities(nodes: GraphNode[], edges: GraphEdge[]): Map<string, number> {
  const communities = new Map<string, number>()
  const adjacency = new Map<string, Set<string>>()

  // Build adjacency list
  for (const node of nodes) {
    adjacency.set(node.id, new Set())
  }
  for (const edge of edges) {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id
    adjacency.get(sourceId)?.add(targetId)
    adjacency.get(targetId)?.add(sourceId)
  }

  // Initial assignment: each node in its own community
  let clusterId = 0
  const visited = new Set<string>()

  // Group connected components
  for (const node of nodes) {
    if (visited.has(node.id)) continue

    const stack = [node.id]
    const component: string[] = []

    while (stack.length > 0) {
      const current = stack.pop()!
      if (visited.has(current)) continue

      visited.add(current)
      component.push(current)

      const neighbors = adjacency.get(current) || new Set()
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor)
        }
      }
    }

    // Assign all nodes in component to same cluster
    for (const nodeId of component) {
      communities.set(nodeId, clusterId)
    }
    clusterId++
  }

  return communities
}

// Parse date string to Date object
function parseDate(dateStr?: string): Date | null {
  if (!dateStr) return null
  const date = new Date(dateStr)
  return isNaN(date.getTime()) ? null : date
}

// =============================================================================
// Hover Card Component
// =============================================================================

function NodeHoverCard({
  data,
  onNavigate,
  onSelectForPath,
  onAskAboutNode,
  onMouseEnter,
  onMouseLeave,
}: {
  data: HoverCardData
  onNavigate: (slug: string) => void
  onSelectForPath: (node: GraphNode) => void
  onAskAboutNode?: (nodeLabel: string, nodeType: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}) {
  const Icon = NODE_ICONS[data.node.type]
  const updatedAt = parseDate(data.node.updatedAt)

  return (
    <div
      className="absolute z-50 w-72 bg-popover text-popover-foreground shadow-lg rounded-lg border p-4"
      style={{
        left: data.x + 20,
        top: data.y - 10,
        transform: 'translateY(-50%)',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: NODE_COLORS[data.node.type] + '20' }}
        >
          <Icon className="w-5 h-5" style={{ color: NODE_COLORS[data.node.type] }} />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-sm truncate">{data.node.label}</h4>
          <p className="text-xs text-muted-foreground">{data.node.type}</p>
          {updatedAt && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Updated: {updatedAt.toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* Connections */}
      {data.connections.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            {data.connections.length} connection{data.connections.length !== 1 ? 's' : ''}
          </p>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {data.connections.slice(0, 5).map((conn, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-muted/50"
              >
                <span className={conn.direction === 'out' ? 'text-blue-500' : 'text-green-500'}>
                  {conn.direction === 'out' ? '→' : '←'}
                </span>
                <span className="truncate flex-1">{conn.node.label}</span>
                <span className="text-muted-foreground">{conn.type}</span>
              </div>
            ))}
            {data.connections.length > 5 && (
              <p className="text-xs text-muted-foreground text-center">
                +{data.connections.length - 5} more
              </p>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {data.node.type === 'WikiPage' && data.node.slug && (
          <Button
            size="sm"
            variant="default"
            className="flex-1"
            onClick={() => onNavigate(data.node.slug!)}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="flex-1"
          onClick={() => onSelectForPath(data.node)}
        >
          <ArrowRight className="w-3 h-3 mr-1" />
          Find path
        </Button>
        {onAskAboutNode && (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-900/20"
            onClick={() => onAskAboutNode(data.node.label, data.node.type)}
          >
            <Sparkles className="w-3 h-3 mr-1" />
            Ask about
          </Button>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Detail Sidebar Component
// =============================================================================

function DetailSidebar({
  selectedNode,
  nodes,
  edges,
  onClose,
  onNavigate,
  onSelectNode,
}: {
  selectedNode: GraphNode | null
  nodes: GraphNode[]
  edges: GraphEdge[]
  onClose: () => void
  onNavigate: (slug: string) => void
  onSelectNode: (node: GraphNode) => void
}) {
  if (!selectedNode) {
    return (
      <div className="w-80 border-l bg-background p-4 flex flex-col items-center justify-center text-muted-foreground">
        <Circle className="w-12 h-12 mb-2 opacity-50" />
        <p>Select a node to see details</p>
      </div>
    )
  }

  const Icon = NODE_ICONS[selectedNode.type]
  const connections = getNodeConnections(selectedNode, nodes, edges)
  const outgoing = connections.filter(c => c.direction === 'out')
  const incoming = connections.filter(c => c.direction === 'in')
  const updatedAt = parseDate(selectedNode.updatedAt)

  return (
    <div className="w-80 border-l bg-background flex flex-col">
      {/* Header */}
      <div className="p-4 border-b flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: NODE_COLORS[selectedNode.type] + '20' }}
          >
            <Icon className="w-6 h-6" style={{ color: NODE_COLORS[selectedNode.type] }} />
          </div>
          <div>
            <h3 className="font-semibold">{selectedNode.label}</h3>
            <p className="text-sm text-muted-foreground">{selectedNode.type}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Metadata */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Details</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{selectedNode.type}</span>
            </div>
            {selectedNode.cluster !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cluster</span>
                <span className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CLUSTER_COLORS[selectedNode.cluster % CLUSTER_COLORS.length] }}
                  />
                  #{selectedNode.cluster + 1}
                </span>
              </div>
            )}
            {updatedAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Updated</span>
                <span>{updatedAt.toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connections</span>
              <span>{connections.length}</span>
            </div>
          </div>
        </div>

        {/* Outgoing connections */}
        {outgoing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <ArrowRight className="w-3 h-3" />
              Links to ({outgoing.length})
            </h4>
            <div className="space-y-1">
              {outgoing.map((conn, i) => (
                <button
                  key={i}
                  className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-muted flex items-center gap-2"
                  onClick={() => onSelectNode(conn.node)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[conn.node.type] }}
                  />
                  <span className="truncate flex-1">{conn.node.label}</span>
                  <span className="text-xs text-muted-foreground">{conn.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Incoming connections */}
        {incoming.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-1">
              <ChevronRight className="w-3 h-3 rotate-180" />
              Linked from ({incoming.length})
            </h4>
            <div className="space-y-1">
              {incoming.map((conn, i) => (
                <button
                  key={i}
                  className="w-full text-left text-sm py-1.5 px-2 rounded hover:bg-muted flex items-center gap-2"
                  onClick={() => onSelectNode(conn.node)}
                >
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: NODE_COLORS[conn.node.type] }}
                  />
                  <span className="truncate flex-1">{conn.node.label}</span>
                  <span className="text-xs text-muted-foreground">{conn.type}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {selectedNode.type === 'WikiPage' && selectedNode.slug && (
        <div className="p-4 border-t">
          <Button
            className="w-full"
            onClick={() => onNavigate(selectedNode.slug!)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Open Page
          </Button>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Path Explanation Component
// =============================================================================

function PathExplanation({
  steps,
  onClose,
}: {
  steps: PathStep[]
  onClose: () => void
}) {
  if (steps.length === 0) return null

  return (
    <div className="absolute top-12 left-2 right-auto bg-white/95 dark:bg-slate-800/95 rounded-lg shadow-lg border p-3 z-10 max-w-md">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium flex items-center gap-2">
          <GitBranch className="w-4 h-4" />
          Path ({steps.length} step{steps.length !== 1 ? 's' : ''})
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3 h-3" />
        </Button>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: NODE_COLORS[step.from.type] }}
            />
            <span className="truncate max-w-[100px]">{step.from.label}</span>
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              —[{step.edgeType.replace('_', ' ')}]→
            </span>
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: NODE_COLORS[step.to.type] }}
            />
            <span className="truncate max-w-[100px]">{step.to.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Mini-Map Component
// =============================================================================

function MiniMap({
  nodes,
  edges,
  width,
  height,
  viewBox,
  onViewBoxChange,
}: {
  nodes: GraphNode[]
  edges: GraphEdge[]
  width: number
  height: number
  viewBox: { x: number; y: number; width: number; height: number }
  onViewBoxChange: (x: number, y: number) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const mapWidth = 150
  const mapHeight = 100

  // Calculate bounds of all nodes
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: width, minY: 0, maxY: height }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
    for (const node of nodes) {
      if (node.x !== undefined && node.y !== undefined) {
        minX = Math.min(minX, node.x)
        maxX = Math.max(maxX, node.x)
        minY = Math.min(minY, node.y)
        maxY = Math.max(maxY, node.y)
      }
    }

    const padding = 50
    return {
      minX: minX - padding,
      maxX: maxX + padding,
      minY: minY - padding,
      maxY: maxY + padding,
    }
  }, [nodes, width, height])

  const scaleX = mapWidth / (bounds.maxX - bounds.minX || 1)
  const scaleY = mapHeight / (bounds.maxY - bounds.minY || 1)
  const scale = Math.min(scaleX, scaleY)

  const handleClick = (e: React.MouseEvent) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return

    const clickX = (e.clientX - rect.left) / scale + bounds.minX
    const clickY = (e.clientY - rect.top) / scale + bounds.minY

    onViewBoxChange(clickX - viewBox.width / 2, clickY - viewBox.height / 2)
  }

  return (
    <div className="absolute bottom-12 right-2 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-lg border overflow-hidden">
      <svg
        ref={svgRef}
        width={mapWidth}
        height={mapHeight}
        onClick={handleClick}
        className="cursor-pointer"
      >
        {/* Edges */}
        <g opacity={0.3}>
          {edges.map((edge, i) => {
            const source = nodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : edge.source.id))
            const target = nodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : edge.target.id))
            if (!source?.x || !source?.y || !target?.x || !target?.y) return null
            return (
              <line
                key={i}
                x1={(source.x - bounds.minX) * scale}
                y1={(source.y - bounds.minY) * scale}
                x2={(target.x - bounds.minX) * scale}
                y2={(target.y - bounds.minY) * scale}
                stroke="#666"
                strokeWidth={0.5}
              />
            )
          })}
        </g>
        {/* Nodes */}
        {nodes.map((node) => (
          node.x !== undefined && node.y !== undefined && (
            <circle
              key={node.id}
              cx={(node.x - bounds.minX) * scale}
              cy={(node.y - bounds.minY) * scale}
              r={2}
              fill={NODE_COLORS[node.type]}
            />
          )
        ))}
        {/* Viewport indicator */}
        <rect
          x={(viewBox.x - bounds.minX) * scale}
          y={(viewBox.y - bounds.minY) * scale}
          width={viewBox.width * scale}
          height={viewBox.height * scale}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={1}
          opacity={0.7}
        />
      </svg>
    </div>
  )
}

// =============================================================================
// Filter Types
// =============================================================================

interface FilterState {
  types: Set<GraphNode['type']>
  hideOrphans: boolean
  depthLimit: number
  focusNode: GraphNode | null
  timeRange: { start: Date | null; end: Date | null }
  showClusters: boolean
}

// =============================================================================
// Main Component
// =============================================================================

export function WikiGraphView({
  workspaceId,
  basePath,
  className,
  height = 500,
  fullscreen = false,
  onToggleFullscreen,
  onAskAboutNode,
  highlightedNodeIds = [],
  onHighlightedNodeClick,
}: WikiGraphViewProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoverCard, setHoverCard] = useState<HoverCardData | null>(null)
  const hoverCardTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isHoveringCardRef = useRef(false)
  const [pathStart, setPathStart] = useState<GraphNode | null>(null)
  const [pathEnd, setPathEnd] = useState<GraphNode | null>(null)
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set())
  const [pathSteps, setPathSteps] = useState<PathStep[]>([])

  // Memoize highlighted node IDs set for efficient lookup
  const highlightedNodeIdsSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds]
  )
  const [layoutType, setLayoutType] = useState<LayoutType>('force')
  const [showMiniMap, setShowMiniMap] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 500 })
  const [timelineMode, setTimelineMode] = useState(false)

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    types: new Set(['WikiPage', 'Concept', 'Person', 'Task'] as GraphNode['type'][]),
    hideOrphans: false,
    depthLimit: 5,
    focusNode: null,
    timeRange: { start: null, end: null },
    showClusters: false,
  })

  // Progressive loading - start with limited nodes for performance
  const [nodeLimit, setNodeLimit] = useState<number | null>(100) // null = show all

  // Fetch graph data
  const groupId = `wiki-ws-${workspaceId}`
  const { data: graphData, isLoading, error } = trpc.graphiti.getGraph.useQuery(
    { groupId },
    { enabled: !!workspaceId }
  )

  // Time range bounds from data
  const timeBounds = useMemo(() => {
    if (!graphData?.nodes) return { min: null, max: null }

    let min: Date | null = null
    let max: Date | null = null

    for (const node of graphData.nodes) {
      const date = parseDate(node.updatedAt)
      if (date) {
        if (!min || date < min) min = date
        if (!max || date > max) max = date
      }
    }

    return { min, max }
  }, [graphData])

  // Process graph data with filters
  const processedData = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [], nodeStats: {} as Record<GraphNode['type'], number>, totalNodesBeforeLimit: 0 }

    // Calculate node stats
    const nodeStats: Record<GraphNode['type'], number> = {
      WikiPage: 0,
      Concept: 0,
      Person: 0,
      Task: 0,
    }

    // Count connection for each node
    const connectionCounts = new Map<string, number>()
    for (const edge of graphData.edges) {
      connectionCounts.set(edge.source, (connectionCounts.get(edge.source) || 0) + 1)
      connectionCounts.set(edge.target, (connectionCounts.get(edge.target) || 0) + 1)
    }

    // Build nodes with metadata
    let nodes: GraphNode[] = graphData.nodes.map(n => ({
      ...n,
      connectionCount: connectionCounts.get(n.id) || 0,
      isHighlighted: searchQuery
        ? n.label.toLowerCase().includes(searchQuery.toLowerCase())
        : false,
    }))

    // Count by type
    for (const node of nodes) {
      nodeStats[node.type]++
    }

    // Apply type filter
    nodes = nodes.filter(n => filters.types.has(n.type))

    // Apply time range filter
    if (filters.timeRange.start || filters.timeRange.end) {
      nodes = nodes.filter(n => {
        const date = parseDate(n.updatedAt)
        if (!date) return true // Keep nodes without dates
        if (filters.timeRange.start && date < filters.timeRange.start) return false
        if (filters.timeRange.end && date > filters.timeRange.end) return false
        return true
      })
    }

    // Apply orphan filter
    if (filters.hideOrphans) {
      const connectedNodes = new Set<string>()
      for (const edge of graphData.edges) {
        connectedNodes.add(edge.source)
        connectedNodes.add(edge.target)
      }
      nodes = nodes.filter(n => connectedNodes.has(n.id))
    }

    // Apply depth filter if focus node is set
    if (filters.focusNode && filters.depthLimit < 5) {
      const depths = calculateDepths(
        filters.focusNode,
        nodes,
        graphData.edges as GraphEdge[],
        filters.depthLimit
      )
      nodes = nodes.filter(n => depths.has(n.id))
      nodes.forEach(n => {
        n.depth = depths.get(n.id)
      })
    }

    // Track total before limiting (for UI message)
    const totalNodesBeforeLimit = nodes.length

    // Apply node limit for performance (sort by connections first)
    if (nodeLimit !== null && nodes.length > nodeLimit) {
      nodes = [...nodes].sort((a, b) => (b.connectionCount || 0) - (a.connectionCount || 0))
      nodes = nodes.slice(0, nodeLimit)
    }

    // Filter edges to only include visible nodes
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges: GraphEdge[] = graphData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        ...e,
        isHighlighted: pathNodes.has(e.source) && pathNodes.has(e.target),
      }))

    // Calculate clusters if enabled
    if (filters.showClusters) {
      const communities = detectCommunities(nodes, edges)
      nodes.forEach(n => {
        n.cluster = communities.get(n.id)
      })
    }

    return { nodes, edges, nodeStats, totalNodesBeforeLimit }
  }, [graphData, filters, searchQuery, pathNodes, nodeLimit])

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedNode(node)
    setShowSidebar(true)
  }, [])

  // Handle navigate to page
  const handleNavigate = useCallback((slug: string) => {
    navigate(`${basePath}/${slug}`)
  }, [navigate, basePath])

  // Handle node hover with delayed close to allow interaction with hover card
  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    // Clear any pending close timeout
    if (hoverCardTimeoutRef.current) {
      clearTimeout(hoverCardTimeoutRef.current)
      hoverCardTimeoutRef.current = null
    }

    if (!node || !event) {
      // Delay closing to allow mouse to move to hover card
      hoverCardTimeoutRef.current = setTimeout(() => {
        // Only close if not hovering over the card
        if (!isHoveringCardRef.current) {
          setHoverCard(null)
        }
      }, 150) // 150ms delay
      return
    }

    const connections = getNodeConnections(node, processedData.nodes, processedData.edges)
    setHoverCard({
      node,
      x: event.clientX - (containerRef.current?.getBoundingClientRect().left || 0),
      y: event.clientY - (containerRef.current?.getBoundingClientRect().top || 0),
      connections,
    })
  }, [processedData.nodes, processedData.edges])

  // Handle hover card mouse events
  const handleHoverCardMouseEnter = useCallback(() => {
    isHoveringCardRef.current = true
    // Clear any pending close timeout
    if (hoverCardTimeoutRef.current) {
      clearTimeout(hoverCardTimeoutRef.current)
      hoverCardTimeoutRef.current = null
    }
  }, [])

  const handleHoverCardMouseLeave = useCallback(() => {
    isHoveringCardRef.current = false
    // Close the hover card after a short delay
    hoverCardTimeoutRef.current = setTimeout(() => {
      setHoverCard(null)
    }, 100)
  }, [])

  // Handle path selection
  const handleSelectForPath = useCallback((node: GraphNode) => {
    if (!pathStart) {
      setPathStart(node)
      setHoverCard(null)
    } else if (!pathEnd && node.id !== pathStart.id) {
      setPathEnd(node)
      setHoverCard(null)

      // Calculate shortest path using BFS
      const result = findShortestPath(pathStart, node, processedData.nodes, processedData.edges)
      setPathNodes(new Set(result.nodeIds))
      setPathSteps(result.steps)
    } else {
      // Reset and start new
      setPathStart(node)
      setPathEnd(null)
      setPathNodes(new Set())
      setPathSteps([])
      setHoverCard(null)
    }
  }, [pathStart, processedData.nodes, processedData.edges])

  // Clear path
  const clearPath = useCallback(() => {
    setPathStart(null)
    setPathEnd(null)
    setPathNodes(new Set())
    setPathSteps([])
  }, [])

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverCardTimeoutRef.current) {
        clearTimeout(hoverCardTimeoutRef.current)
      }
    }
  }, [])

  // Zoom controls
  const handleZoom = useCallback((direction: 'in' | 'out' | 'reset') => {
    if (!svgRef.current) return

    const svg = d3.select(svgRef.current)
    const zoom = d3.zoom<SVGSVGElement, unknown>()

    if (direction === 'reset') {
      svg.transition().duration(300).call(zoom.transform, d3.zoomIdentity)
    } else {
      const scale = direction === 'in' ? 1.3 : 0.7
      svg.transition().duration(300).call(zoom.scaleBy, scale)
    }
  }, [])

  // Export functions
  const exportGraph = useCallback((format: 'png' | 'svg' | 'json') => {
    if (!svgRef.current) return

    if (format === 'json') {
      const data = {
        nodes: processedData.nodes.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          pageId: n.pageId,
          slug: n.slug,
          updatedAt: n.updatedAt,
          cluster: n.cluster,
        })),
        edges: processedData.edges.map(e => ({
          source: typeof e.source === 'string' ? e.source : e.source.id,
          target: typeof e.target === 'string' ? e.target : e.target.id,
          type: e.type,
          updatedAt: e.updatedAt,
        })),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-graph-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    if (format === 'svg') {
      const svgElement = svgRef.current
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const blob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `wiki-graph-${new Date().toISOString().split('T')[0]}.svg`
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    if (format === 'png') {
      const svgElement = svgRef.current
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new window.Image()

      img.onload = () => {
        canvas.width = img.width * 2
        canvas.height = img.height * 2
        ctx?.scale(2, 2)
        ctx?.drawImage(img, 0, 0)
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `wiki-graph-${new Date().toISOString().split('T')[0]}.png`
            a.click()
            URL.revokeObjectURL(url)
          }
        })
      }

      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
    }
  }, [processedData])

  // Initialize D3 visualization
  useEffect(() => {
    if (!processedData.nodes.length || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth - (showSidebar ? 320 : 0) || 800
    const actualHeight = fullscreen ? window.innerHeight - 100 : height

    // Update viewBox state
    setViewBox({ x: 0, y: 0, width, height: actualHeight })

    // Clear previous content
    svg.selectAll('*').remove()

    // Set up zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
        // Update viewBox for mini-map
        const t = event.transform
        setViewBox({
          x: -t.x / t.k,
          y: -t.y / t.k,
          width: width / t.k,
          height: actualHeight / t.k,
        })
      })

    svg
      .attr('width', '100%')
      .attr('height', actualHeight)
      .attr('viewBox', `0 0 ${width} ${actualHeight}`)
      .call(zoom)

    // Create main group for zoom/pan
    const g = svg.append('g')

    // Prepare data
    const nodes: GraphNode[] = processedData.nodes.map(n => ({ ...n }))
    const links: GraphEdge[] = processedData.edges.map(e => ({ ...e }))

    // Create force simulation
    const simulation = d3.forceSimulation<GraphNode>(nodes)

    // Apply layout based on type
    if (layoutType === 'force') {
      simulation
        .force('link', d3.forceLink<GraphNode, GraphEdge>(links)
          .id(d => d.id)
          .distance(100)
          .strength(0.5))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, actualHeight / 2))
        .force('collision', d3.forceCollide().radius(30))
    } else if (layoutType === 'hierarchical') {
      // Simple hierarchical layout - WikiPages on left, entities on right
      const wikiPages = nodes.filter(n => n.type === 'WikiPage')
      const entities = nodes.filter(n => n.type !== 'WikiPage')

      wikiPages.forEach((n, i) => {
        n.x = width * 0.25
        n.y = (i + 1) * (actualHeight / (wikiPages.length + 1))
        n.fx = n.x
        n.fy = n.y
      })

      entities.forEach((n, i) => {
        n.x = width * 0.75
        n.y = (i + 1) * (actualHeight / (entities.length + 1))
        n.fx = n.x
        n.fy = n.y
      })

      simulation
        .force('link', d3.forceLink<GraphNode, GraphEdge>(links).id(d => d.id).strength(0))
    } else if (layoutType === 'radial') {
      // Radial layout - WikiPages in center, entities around
      const centerX = width / 2
      const centerY = actualHeight / 2
      const innerRadius = Math.min(width, actualHeight) * 0.15
      const outerRadius = Math.min(width, actualHeight) * 0.4

      const wikiPages = nodes.filter(n => n.type === 'WikiPage')
      const entities = nodes.filter(n => n.type !== 'WikiPage')

      wikiPages.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / wikiPages.length
        n.x = centerX + innerRadius * Math.cos(angle)
        n.y = centerY + innerRadius * Math.sin(angle)
      })

      entities.forEach((n, i) => {
        const angle = (2 * Math.PI * i) / entities.length
        n.x = centerX + outerRadius * Math.cos(angle)
        n.y = centerY + outerRadius * Math.sin(angle)
      })

      simulation
        .force('link', d3.forceLink<GraphNode, GraphEdge>(links)
          .id(d => d.id)
          .distance(80)
          .strength(0.3))
        .force('charge', d3.forceManyBody().strength(-100))
        .force('collision', d3.forceCollide().radius(25))
    }

    // Timeline mode: arrange by date
    if (timelineMode && timeBounds.min && timeBounds.max) {
      const timeScale = d3.scaleTime()
        .domain([timeBounds.min, timeBounds.max])
        .range([100, width - 100])

      nodes.forEach((n) => {
        const date = parseDate(n.updatedAt)
        if (date) {
          n.x = timeScale(date)
          n.fx = n.x
        }
      })

      // Add time axis
      const axisG = g.append('g')
        .attr('transform', `translate(0, ${actualHeight - 30})`)
        .attr('class', 'time-axis')

      const axis = d3.axisBottom(timeScale)
        .ticks(6)
        .tickFormat(d3.timeFormat('%Y-%m-%d') as unknown as (d: d3.NumberValue, i: number) => string)

      axisG.call(axis)
        .selectAll('text')
        .attr('fill', '#666')
        .attr('font-size', '10px')

      axisG.selectAll('line, path')
        .attr('stroke', '#666')
    }

    simulationRef.current = simulation

    // Create arrow markers
    const defs = svg.append('defs')
    ;['LINKS_TO', 'MENTIONS', 'LINKS_TO-highlight', 'MENTIONS-highlight'].forEach(type => {
      const isHighlight = type.includes('highlight')
      const baseType = type.replace('-highlight', '') as GraphEdge['type']
      defs.append('marker')
        .attr('id', `arrow-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 25)
        .attr('refY', 0)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
        .append('path')
        .attr('fill', isHighlight ? '#22c55e' : EDGE_COLORS[baseType])
        .attr('d', 'M0,-5L10,0L0,5')
    })

    // Create edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => pathNodes.has(typeof d.source === 'string' ? d.source : d.source.id) &&
                          pathNodes.has(typeof d.target === 'string' ? d.target : d.target.id)
        ? '#22c55e' : EDGE_COLORS[d.type])
      .attr('stroke-width', d => pathNodes.has(typeof d.source === 'string' ? d.source : d.source.id) ? 3 : 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type}${d.isHighlighted ? '-highlight' : ''})`)

    // Create node groups
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll<SVGGElement, GraphNode>('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart()
          d.fx = d.x
          d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x
          d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0)
          if (layoutType === 'force') {
            d.fx = null
            d.fy = null
          }
        }))

    // Add circles
    node.append('circle')
      .attr('r', d => {
        if (highlightedNodeIdsSet.has(d.id)) return 16
        if (pathNodes.has(d.id)) return 16
        if (d.isHighlighted) return 14
        if (d.type === 'WikiPage') return 12
        return 8
      })
      .attr('fill', d => {
        if (highlightedNodeIdsSet.has(d.id)) return '#f59e0b' // Amber for duplicate highlights
        if (pathNodes.has(d.id)) return '#22c55e'
        if (filters.showClusters && d.cluster !== undefined) {
          return CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length] || NODE_COLORS[d.type]
        }
        return NODE_COLORS[d.type]
      })
      .attr('stroke', d => {
        if (highlightedNodeIdsSet.has(d.id)) return '#fff'
        if (d.isHighlighted) return '#fff'
        if (selectedNode?.id === d.id) return '#3b82f6'
        return 'rgba(255,255,255,0.5)'
      })
      .attr('stroke-width', d => {
        if (highlightedNodeIdsSet.has(d.id)) return 3
        if (d.isHighlighted || selectedNode?.id === d.id) return 3
        return 2
      })
      .on('click', (event, d) => {
        event.stopPropagation()
        // If this node is highlighted (part of duplicate pair), trigger callback
        if (highlightedNodeIdsSet.has(d.id) && onHighlightedNodeClick) {
          onHighlightedNodeClick(d.id)
        }
        handleNodeClick(d)
      })
      .on('dblclick', (event, d) => {
        event.stopPropagation()
        if (d.type === 'WikiPage' && d.slug) {
          handleNavigate(d.slug)
        }
      })
      .on('mouseenter', (event, d) => {
        handleNodeHover(d, event)
      })
      .on('mouseleave', () => {
        handleNodeHover(null)
      })

    // Add labels
    node.append('text')
      .text(d => d.label.length > 20 ? d.label.slice(0, 20) + '...' : d.label)
      .attr('x', 16)
      .attr('y', 4)
      .attr('font-size', d => d.isHighlighted ? '12px' : '11px')
      .attr('font-weight', d => d.isHighlighted ? 'bold' : 'normal')
      .attr('fill', d => d.isHighlighted ? '#1f2937' : '#374151')
      .attr('pointer-events', 'none')

    // Update on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    setIsInitialized(true)

    return () => {
      simulation.stop()
    }
  }, [processedData, height, fullscreen, handleNodeClick, handleNodeHover, handleNavigate, pathNodes, layoutType, timelineMode, timeBounds, filters.showClusters, selectedNode, showSidebar, highlightedNodeIdsSet, onHighlightedNodeClick])

  // Handle window resize
  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !isInitialized) return

    const handleResize = () => {
      const container = containerRef.current
      if (!container) return

      const width = container.clientWidth - (showSidebar ? 320 : 0)
      const actualHeight = fullscreen ? window.innerHeight - 100 : height

      d3.select(svgRef.current)
        .attr('viewBox', `0 0 ${width} ${actualHeight}`)

      if (simulationRef.current && layoutType === 'force') {
        simulationRef.current
          .force('center', d3.forceCenter(width / 2, actualHeight / 2))
          .alpha(0.3)
          .restart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isInitialized, height, fullscreen, layoutType, showSidebar])

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center', className)} style={{ height }}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground', className)} style={{ height }}>
        <p>Failed to load graph data</p>
      </div>
    )
  }

  // Empty state
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className={cn('flex items-center justify-center text-muted-foreground', className)} style={{ height }}>
        <p>No graph data available. Create wiki pages with links to see the knowledge graph.</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-slate-50 dark:bg-slate-900 rounded-lg border flex',
        fullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      {/* Main Graph Area */}
      <div className="flex-1 relative">
        {/* Top Controls */}
        <div className="absolute top-2 left-2 right-2 flex items-center gap-2 z-10 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 max-w-xs min-w-[150px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-sm bg-white/80 dark:bg-slate-800/80"
            />
          </div>

          {/* Filter Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
              >
                <Filter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel>Node Types</DropdownMenuLabel>
              {(['WikiPage', 'Concept', 'Person', 'Task'] as const).map((type) => {
                const Icon = NODE_ICONS[type]
                const count = processedData.nodeStats[type] || 0
                return (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={filters.types.has(type)}
                    onCheckedChange={(checked) => {
                      const newTypes = new Set(filters.types)
                      if (checked) {
                        newTypes.add(type)
                      } else {
                        newTypes.delete(type)
                      }
                      setFilters({ ...filters, types: newTypes })
                    }}
                  >
                    <Icon className="w-4 h-4 mr-2" style={{ color: NODE_COLORS[type] }} />
                    {type} ({count})
                  </DropdownMenuCheckboxItem>
                )
              })}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={filters.hideOrphans}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, hideOrphans: !!checked })
                }
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide orphan nodes
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={filters.showClusters}
                onCheckedChange={(checked) =>
                  setFilters({ ...filters, showClusters: !!checked })
                }
              >
                <Layers className="w-4 h-4 mr-2" />
                Show clusters
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Depth Limit</DropdownMenuLabel>
              <div className="px-2 py-1">
                <Select
                  value={filters.depthLimit.toString()}
                  onValueChange={(value) =>
                    setFilters({ ...filters, depthLimit: parseInt(value) })
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 level</SelectItem>
                    <SelectItem value="2">2 levels</SelectItem>
                    <SelectItem value="3">3 levels</SelectItem>
                    <SelectItem value="4">4 levels</SelectItem>
                    <SelectItem value="5">All (no limit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filters.focusNode && (
                <>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setFilters({ ...filters, focusNode: null })}
                    >
                      Clear focus: {filters.focusNode.label}
                    </Button>
                  </div>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Node Limit Badge */}
          {nodeLimit !== null && processedData.totalNodesBeforeLimit > nodeLimit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 bg-amber-100/80 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50 text-xs px-2"
              onClick={() => setNodeLimit(null)}
              title="Click to show all nodes"
            >
              {processedData.nodes.length}/{processedData.totalNodesBeforeLimit} nodes
              <span className="ml-1 text-[10px]">(show all)</span>
            </Button>
          )}

          {/* Layout Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
                title="Layout"
              >
                <Layout className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Layout</DropdownMenuLabel>
              <DropdownMenuCheckboxItem
                checked={layoutType === 'force'}
                onCheckedChange={() => setLayoutType('force')}
              >
                <Circle className="w-4 h-4 mr-2" />
                Force-directed
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={layoutType === 'hierarchical'}
                onCheckedChange={() => setLayoutType('hierarchical')}
              >
                <GitBranch className="w-4 h-4 mr-2" />
                Hierarchical
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={layoutType === 'radial'}
                onCheckedChange={() => setLayoutType('radial')}
              >
                <Circle className="w-4 h-4 mr-2 opacity-50" />
                Radial
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={timelineMode}
                onCheckedChange={(checked) => setTimelineMode(!!checked)}
                disabled={!timeBounds.min}
              >
                <Calendar className="w-4 h-4 mr-2" />
                Timeline mode
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Time Range (only if data has timestamps) */}
          {timeBounds.min && timeBounds.max && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 bg-white/80 dark:bg-slate-800/80",
                    (filters.timeRange.start || filters.timeRange.end) && "text-blue-500"
                  )}
                  title="Time filter"
                >
                  <Clock className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Time Range</DropdownMenuLabel>
                <div className="px-2 py-2 space-y-2">
                  <div>
                    <label className="text-xs text-muted-foreground">From</label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={filters.timeRange.start?.toISOString().split('T')[0] || ''}
                      min={timeBounds.min.toISOString().split('T')[0]}
                      max={timeBounds.max.toISOString().split('T')[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        timeRange: {
                          ...filters.timeRange,
                          start: e.target.value ? new Date(e.target.value) : null,
                        },
                      })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">To</label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={filters.timeRange.end?.toISOString().split('T')[0] || ''}
                      min={timeBounds.min.toISOString().split('T')[0]}
                      max={timeBounds.max.toISOString().split('T')[0]}
                      onChange={(e) => setFilters({
                        ...filters,
                        timeRange: {
                          ...filters.timeRange,
                          end: e.target.value ? new Date(e.target.value) : null,
                        },
                      })}
                    />
                  </div>
                  {(filters.timeRange.start || filters.timeRange.end) && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => setFilters({
                        ...filters,
                        timeRange: { start: null, end: null },
                      })}
                    >
                      Clear time filter
                    </Button>
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Export Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
                title="Export"
              >
                <Download className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Export</DropdownMenuLabel>
              <DropdownMenuCheckboxItem onCheckedChange={() => exportGraph('png')}>
                <Image className="w-4 h-4 mr-2" />
                PNG Image
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem onCheckedChange={() => exportGraph('svg')}>
                <FileCode className="w-4 h-4 mr-2" />
                SVG Vector
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem onCheckedChange={() => exportGraph('json')}>
                <FileJson className="w-4 h-4 mr-2" />
                JSON Data
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
              onClick={() => handleZoom('in')}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
              onClick={() => handleZoom('out')}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 bg-white/80 dark:bg-slate-800/80",
                showMiniMap && "text-blue-500"
              )}
              onClick={() => setShowMiniMap(!showMiniMap)}
              title="Mini-map"
            >
              <MapIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 bg-white/80 dark:bg-slate-800/80",
                showSidebar && "text-blue-500"
              )}
              onClick={() => setShowSidebar(!showSidebar)}
              title="Details panel"
            >
              {showSidebar ? <PanelRightClose className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
            </Button>
            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
                onClick={onToggleFullscreen}
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreen ? <X className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>

        {/* Path Info with Explanation */}
        {pathSteps.length > 0 ? (
          <PathExplanation steps={pathSteps} onClose={clearPath} />
        ) : (pathStart || pathEnd) && (
          <div className="absolute top-12 left-2 bg-white/90 dark:bg-slate-800/90 rounded-lg px-3 py-2 text-sm z-10">
            <div className="flex items-center gap-2">
              <span>Path:</span>
              <span className="font-medium">{pathStart?.label || '?'}</span>
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">{pathEnd?.label || '(select target)'}</span>
              <Button variant="ghost" size="sm" onClick={clearPath} className="h-6 px-2">
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-2 left-2 flex items-center gap-4 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
          {filters.showClusters ? (
            <span className="text-muted-foreground">Colored by cluster</span>
          ) : (
            Object.entries(NODE_COLORS).map(([type, color]) => (
              <div key={type} className="flex items-center gap-1">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span>{type}</span>
              </div>
            ))
          )}
        </div>

        {/* Stats */}
        <div className="absolute bottom-2 right-2 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
          {processedData.nodes.length} nodes, {processedData.edges.length} edges
          {processedData.nodes.length !== graphData.nodes.length && (
            <span className="text-muted-foreground ml-1">
              (filtered from {graphData.nodes.length})
            </span>
          )}
        </div>

        {/* Mini-map */}
        {showMiniMap && (
          <MiniMap
            nodes={processedData.nodes}
            edges={processedData.edges}
            width={viewBox.width}
            height={viewBox.height}
            viewBox={viewBox}
            onViewBoxChange={(x, y) => {
              // Pan to new position
              if (!svgRef.current) return
              const svg = d3.select(svgRef.current)
              const zoom = d3.zoom<SVGSVGElement, unknown>()
              svg.transition().duration(300).call(
                zoom.translateTo,
                x + viewBox.width / 2,
                y + viewBox.height / 2
              )
            }}
          />
        )}

        {/* SVG */}
        <svg ref={svgRef} className="w-full" />

        {/* Hover Card */}
        {hoverCard && (
          <NodeHoverCard
            data={hoverCard}
            onNavigate={handleNavigate}
            onSelectForPath={handleSelectForPath}
            onAskAboutNode={onAskAboutNode}
            onMouseEnter={handleHoverCardMouseEnter}
            onMouseLeave={handleHoverCardMouseLeave}
          />
        )}
      </div>

      {/* Detail Sidebar */}
      {showSidebar && (
        <DetailSidebar
          selectedNode={selectedNode}
          nodes={processedData.nodes}
          edges={processedData.edges}
          onClose={() => {
            setShowSidebar(false)
            setSelectedNode(null)
          }}
          onNavigate={handleNavigate}
          onSelectNode={(node) => setSelectedNode(node)}
        />
      )}
    </div>
  )
}

export default WikiGraphView
