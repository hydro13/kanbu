/*
 * Wiki Graph View Component
 * Version: 2.0.0
 *
 * D3.js force-directed graph visualization for wiki knowledge graph.
 * Shows wiki pages, entities, and their relationships.
 *
 * Features (Fase 15.4 Enhanced Graphs):
 * - Force-directed layout with configurable force strength
 * - Entity type filtering (WikiPage/Concept/Person/Task)
 * - Depth control (1-5 levels from selected node)
 * - Search within graph with highlighting
 * - Node hover cards with details
 * - Path finding between nodes
 * - Zoom, pan, and fullscreen
 * - Hide/show orphan nodes
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 5 - Graph Visualization)
 *
 * Modified: 2026-01-12
 * Change: Enhanced Graphs (Fase 15.4) - Filtering, hover cards, search
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
  // Enhanced properties
  connectionCount?: number
  isHighlighted?: boolean
  isSelected?: boolean
  depth?: number // Distance from selected node
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: 'LINKS_TO' | 'MENTIONS'
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
}

interface HoverCardData {
  node: GraphNode
  x: number
  y: number
  connections: { node: GraphNode; type: string; direction: 'in' | 'out' }[]
}

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
  nodes: GraphNode[],
  edges: GraphEdge[],
  maxDepth: number
): Map<string, number> {
  const depths = new Map<string, number>()
  depths.set(startNode.id, 0)

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

// =============================================================================
// Hover Card Component
// =============================================================================

function NodeHoverCard({
  data,
  basePath,
  onNavigate,
  onSelectForPath,
}: {
  data: HoverCardData
  basePath: string
  onNavigate: (slug: string) => void
  onSelectForPath: (node: GraphNode) => void
}) {
  const Icon = NODE_ICONS[data.node.type]

  return (
    <div
      className="absolute z-50 w-72 bg-popover text-popover-foreground shadow-lg rounded-lg border p-4"
      style={{
        left: data.x + 20,
        top: data.y - 10,
        transform: 'translateY(-50%)',
      }}
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
      <div className="flex gap-2">
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
      </div>
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
}: WikiGraphViewProps) {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)

  // State
  const [isInitialized, setIsInitialized] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [hoverCard, setHoverCard] = useState<HoverCardData | null>(null)
  const [pathStart, setPathStart] = useState<GraphNode | null>(null)
  const [pathEnd, setPathEnd] = useState<GraphNode | null>(null)
  const [pathNodes, setPathNodes] = useState<Set<string>>(new Set())

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    types: new Set(['WikiPage', 'Concept', 'Person', 'Task'] as GraphNode['type'][]),
    hideOrphans: false,
    depthLimit: 5,
    focusNode: null,
  })

  // Fetch graph data
  const groupId = `wiki-ws-${workspaceId}`
  const { data: graphData, isLoading, error } = trpc.graphiti.getGraph.useQuery(
    { groupId },
    { enabled: !!workspaceId }
  )

  // Process graph data with filters
  const processedData = useMemo(() => {
    if (!graphData) return { nodes: [], edges: [], nodeStats: {} as Record<GraphNode['type'], number> }

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

    // Filter edges to only include visible nodes
    const nodeIds = new Set(nodes.map(n => n.id))
    const edges: GraphEdge[] = graphData.edges
      .filter(e => nodeIds.has(e.source) && nodeIds.has(e.target))
      .map(e => ({
        ...e,
        isHighlighted: pathNodes.has(e.source) && pathNodes.has(e.target),
      }))

    return { nodes, edges, nodeStats }
  }, [graphData, filters, searchQuery, pathNodes])

  // Handle node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'WikiPage' && node.slug) {
      navigate(`${basePath}/${node.slug}`)
    }
  }, [navigate, basePath])

  // Handle node hover
  const handleNodeHover = useCallback((node: GraphNode | null, event?: MouseEvent) => {
    if (!node || !event) {
      setHoverCard(null)
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

  // Handle path selection
  const handleSelectForPath = useCallback((node: GraphNode) => {
    if (!pathStart) {
      setPathStart(node)
      setHoverCard(null)
    } else if (!pathEnd && node.id !== pathStart.id) {
      setPathEnd(node)
      setHoverCard(null)

      // Calculate shortest path using BFS
      const path = findShortestPath(pathStart, node, processedData.nodes, processedData.edges)
      setPathNodes(new Set(path))
    } else {
      // Reset and start new
      setPathStart(node)
      setPathEnd(null)
      setPathNodes(new Set())
      setHoverCard(null)
    }
  }, [pathStart, processedData.nodes, processedData.edges])

  // Clear path
  const clearPath = useCallback(() => {
    setPathStart(null)
    setPathEnd(null)
    setPathNodes(new Set())
  }, [])

  // Find shortest path using BFS
  function findShortestPath(
    start: GraphNode,
    end: GraphNode,
    nodes: GraphNode[],
    edges: GraphEdge[]
  ): string[] {
    const queue: { nodeId: string; path: string[] }[] = [{ nodeId: start.id, path: [start.id] }]
    const visited = new Set<string>([start.id])

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!

      if (nodeId === end.id) {
        return path
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

    return [] // No path found
  }

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

  // Initialize D3 visualization
  useEffect(() => {
    if (!processedData.nodes.length || !svgRef.current || !containerRef.current) return

    const svg = d3.select(svgRef.current)
    const container = containerRef.current
    const width = container.clientWidth || 800
    const actualHeight = fullscreen ? window.innerHeight - 100 : height

    // Clear previous content
    svg.selectAll('*').remove()

    // Set up zoom
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform)
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
      .force('link', d3.forceLink<GraphNode, GraphEdge>(links)
        .id(d => d.id)
        .distance(100)
        .strength(0.5))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, actualHeight / 2))
      .force('collision', d3.forceCollide().radius(30))

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
      .attr('cursor', d => d.type === 'WikiPage' ? 'pointer' : 'default')
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
          d.fx = null
          d.fy = null
        }))

    // Add circles
    node.append('circle')
      .attr('r', d => {
        if (pathNodes.has(d.id)) return 16
        if (d.isHighlighted) return 14
        if (d.type === 'WikiPage') return 12
        return 8
      })
      .attr('fill', d => pathNodes.has(d.id) ? '#22c55e' : NODE_COLORS[d.type])
      .attr('stroke', d => d.isHighlighted ? '#fff' : 'rgba(255,255,255,0.5)')
      .attr('stroke-width', d => d.isHighlighted ? 3 : 2)
      .on('click', (event, d) => {
        event.stopPropagation()
        handleNodeClick(d)
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
  }, [processedData, height, fullscreen, handleNodeClick, handleNodeHover, pathNodes])

  // Handle window resize
  useEffect(() => {
    if (!containerRef.current || !svgRef.current || !isInitialized) return

    const handleResize = () => {
      const container = containerRef.current
      if (!container) return

      const width = container.clientWidth
      const actualHeight = fullscreen ? window.innerHeight - 100 : height

      d3.select(svgRef.current)
        .attr('viewBox', `0 0 ${width} ${actualHeight}`)

      if (simulationRef.current) {
        simulationRef.current
          .force('center', d3.forceCenter(width / 2, actualHeight / 2))
          .alpha(0.3)
          .restart()
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isInitialized, height, fullscreen])

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
        'relative bg-slate-50 dark:bg-slate-900 rounded-lg border',
        fullscreen && 'fixed inset-0 z-50 rounded-none',
        className
      )}
    >
      {/* Top Controls */}
      <div className="absolute top-2 left-2 right-2 flex items-center gap-2 z-10">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
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
          <DropdownMenuContent className="w-56" align="end">
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

        {/* Zoom Controls */}
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
            className="h-8 w-8 bg-white/80 dark:bg-slate-800/80"
            onClick={() => handleZoom('reset')}
            title="Reset zoom"
          >
            <Maximize2 className="h-4 w-4" />
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

      {/* Path Info */}
      {(pathStart || pathEnd) && (
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
          {pathNodes.size > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {pathNodes.size} nodes in path
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-2 left-2 flex items-center gap-4 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span>{type}</span>
          </div>
        ))}
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

      {/* SVG */}
      <svg ref={svgRef} className="w-full" />

      {/* Hover Card */}
      {hoverCard && (
        <NodeHoverCard
          data={hoverCard}
          basePath={basePath}
          onNavigate={(slug) => navigate(`${basePath}/${slug}`)}
          onSelectForPath={handleSelectForPath}
        />
      )}
    </div>
  )
}

export default WikiGraphView
