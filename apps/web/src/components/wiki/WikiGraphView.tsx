/*
 * Wiki Graph View Component
 * Version: 1.0.0
 *
 * D3.js force-directed graph visualization for wiki knowledge graph.
 * Shows wiki pages, entities, and their relationships.
 *
 * Features:
 * - Force-directed layout
 * - Zoom and pan
 * - Draggable nodes
 * - Click to navigate
 * - Different colors per node type
 *
 * ===================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Signed: 2026-01-12
 * Change: Initial implementation (Fase 5 - Graph Visualization)
 * ===================================================================
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as d3 from 'd3'
import { trpc } from '@/lib/trpc'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Loader2, ZoomIn, ZoomOut, Maximize2, X } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: 'WikiPage' | 'Concept' | 'Person' | 'Task'
  pageId?: number
  slug?: string
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode
  target: string | GraphNode
  type: 'LINKS_TO' | 'MENTIONS'
}

interface WikiGraphViewProps {
  /** Workspace ID for fetching graph data */
  workspaceId: number
  /** Base path for wiki navigation (e.g., /workspace/genx/wiki) */
  basePath: string
  /** Optional class name */
  className?: string
  /** Initial width (defaults to container) */
  width?: number
  /** Initial height */
  height?: number
  /** Whether to show in fullscreen mode */
  fullscreen?: boolean
  /** Callback when fullscreen is toggled */
  onToggleFullscreen?: () => void
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

const EDGE_COLORS: Record<GraphEdge['type'], string> = {
  LINKS_TO: '#94a3b8',   // Slate
  MENTIONS: '#cbd5e1',   // Lighter slate
}

// =============================================================================
// Component
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
  const [isInitialized, setIsInitialized] = useState(false)

  // Fetch graph data
  const groupId = `wiki-ws-${workspaceId}`
  const { data: graphData, isLoading, error } = trpc.graphiti.getGraph.useQuery(
    { groupId },
    { enabled: !!workspaceId }
  )

  // Navigate to wiki page on node click
  const handleNodeClick = useCallback((node: GraphNode) => {
    if (node.type === 'WikiPage' && node.slug) {
      navigate(`${basePath}/${node.slug}`)
    }
  }, [navigate, basePath])

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
    if (!graphData || !svgRef.current || !containerRef.current) return
    if (graphData.nodes.length === 0) return

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

    // Prepare nodes and links data
    const nodes: GraphNode[] = graphData.nodes.map(n => ({ ...n }))
    const links: GraphEdge[] = graphData.edges.map(e => ({
      ...e,
      source: e.source,
      target: e.target,
    }))

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

    // Create arrow markers for directed edges
    svg.append('defs').selectAll('marker')
      .data(['LINKS_TO', 'MENTIONS'])
      .join('marker')
      .attr('id', d => `arrow-${d}`)
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 25)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('fill', d => EDGE_COLORS[d as GraphEdge['type']])
      .attr('d', 'M0,-5L10,0L0,5')

    // Create edges
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', d => EDGE_COLORS[d.type])
      .attr('stroke-width', d => d.type === 'LINKS_TO' ? 2 : 1)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', d => `url(#arrow-${d.type})`)

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

    // Add circles to nodes
    node.append('circle')
      .attr('r', d => d.type === 'WikiPage' ? 12 : 8)
      .attr('fill', d => NODE_COLORS[d.type])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .on('click', (event, d) => {
        event.stopPropagation()
        handleNodeClick(d)
      })

    // Add labels to nodes
    node.append('text')
      .text(d => d.label.length > 20 ? d.label.slice(0, 20) + '...' : d.label)
      .attr('x', 16)
      .attr('y', 4)
      .attr('font-size', '11px')
      .attr('fill', '#374151')
      .attr('pointer-events', 'none')

    // Add tooltips
    node.append('title')
      .text(d => `${d.label} (${d.type})`)

    // Update positions on tick
    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

      node.attr('transform', d => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    setIsInitialized(true)

    // Cleanup
    return () => {
      simulation.stop()
    }
  }, [graphData, height, fullscreen, handleNodeClick])

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
      {/* Controls */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
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
      <div className="absolute top-2 left-2 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
        {graphData.nodes.length} nodes, {graphData.edges.length} edges
      </div>

      {/* SVG */}
      <svg ref={svgRef} className="w-full" />
    </div>
  )
}

export default WikiGraphView
