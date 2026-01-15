# Fase 24.10: Community Detection UI Integration Plan

**Doel:** Integreer ClusterLegend en ClusterDetailPanel in WikiGraphView om Label Propagation communities te visualiseren

**Status:** 📋 PLAN - Nog niet geïmplementeerd

**Datum:** 2026-01-15

---

## Huidige Situatie (Bestaande Code)

### WikiGraphView.tsx bevat al clustering functionaliteit:

1. **Simpele community detection** (regel 314-363)
   - Functie: `detectCommunities(nodes, edges)`
   - Algoritme: Connected components (simpel, geen Label Propagation)
   - Output: `Map<string, number>` (nodeId → clusterId)

2. **UI elementen:**
   - Toggle: "Show clusters" checkbox in Filter dropdown (regel 1674-1681)
   - Visualisatie: Nodes gekleurd per cluster (regel 1442-1443)
   - Legend: "Colored by cluster" tekst (regel 1959-1960)
   - Sidebar: Cluster # badge in detail panel (regel 556-566)

3. **State:**
   ```typescript
   filters: {
     showClusters: boolean  // Toggle voor cluster mode
   }
   ```

4. **Kleuren:**
   ```typescript
   const CLUSTER_COLORS = [
     '#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4',
     '#3b82f6', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6',
   ]
   ```

### Nieuwe Components (Fase 24.7 - Al gemaakt):

1. **ClusterLegend.tsx**
   - Toont communities met AI-generated names
   - Clickable items met member count
   - Color-coded met dezelfde kleuren als nodes

2. **ClusterDetailPanel.tsx**
   - Volledige community summary (AI-generated)
   - List van member entities
   - Update button
   - Metadata (created/updated timestamps)

3. **Hooks:**
   - `useCommunities` - Fetch communities
   - `useCommunityDetails` - Fetch single community
   - `useDetectCommunities` - Run detection
   - `useUpdateCommunities` - Incremental update

---

## Implementatie Plan

### STAP 1: Backend Integration (WikiGraphView State)

**Wijzigingen in WikiGraphView.tsx:**

#### 1.1 Import nieuwe components en hooks
```typescript
import { ClusterLegend, ClusterDetailPanel } from '@/components/wiki'
import { useCommunities, useDetectCommunities } from '@/hooks/wiki'
```

#### 1.2 Add community state
```typescript
const [selectedCommunityUuid, setSelectedCommunityUuid] = useState<string | null>(null)
const [communityMode, setCommunityMode] = useState<'simple' | 'advanced'>('simple')
```

#### 1.3 Add community detection mutation
```typescript
const detectMutation = useDetectCommunities()

const handleDetectCommunities = () => {
  detectMutation.mutate({
    workspaceId,
    projectId,
    forceRebuild: true,
    generateSummaries: true,
  })
}
```

#### 1.4 Fetch communities when enabled
```typescript
const { data: communitiesData } = useCommunities({
  workspaceId,
  projectId,
  includeMembers: false,
}, {
  enabled: communityMode === 'advanced' && filters.showClusters,
})
```

---

### STAP 2: Replace Cluster Detection Logic

**Wijzigingen in useEffect (regel ~1031):**

#### 2.1 Conditionally use advanced or simple clustering
```typescript
// Calculate clusters if enabled
if (filters.showClusters) {
  if (communityMode === 'advanced' && communitiesData) {
    // Use Label Propagation results from backend
    const communityMap = new Map<string, { id: number; name: string }>()

    communitiesData.communities.forEach((community, index) => {
      // Map members to community
      // NOTE: Members zijn entities, nodes zijn graph nodes
      // We moeten entity UUIDs matchen met node IDs
      // TODO: Implement mapping logic
    })

    nodes.forEach(n => {
      const communityInfo = communityMap.get(n.id)
      if (communityInfo) {
        n.cluster = communityInfo.id
        n.communityName = communityInfo.name
        n.communityUuid = communitiesData.communities[communityInfo.id]?.uuid
      }
    })
  } else {
    // Fallback to simple connected components
    const communities = detectCommunities(nodes, edges)
    nodes.forEach(n => {
      n.cluster = communities.get(n.id)
    })
  }
}
```

#### 2.2 Extend GraphNode interface
```typescript
interface GraphNode extends d3.SimulationNodeDatum {
  id: string
  label: string
  type: 'WikiPage' | 'Concept' | 'Person' | 'Organization' | 'Task'
  // ... existing fields
  cluster?: number
  communityName?: string     // NEW: AI-generated name
  communityUuid?: string     // NEW: UUID for detail lookup
}
```

---

### STAP 3: Update UI Controls

**Wijzigingen in Filter Dropdown (regel ~1674):**

#### 3.1 Replace simple checkbox with mode selector
```typescript
<DropdownMenuLabel>Community Detection</DropdownMenuLabel>
<DropdownMenuCheckboxItem
  checked={filters.showClusters && communityMode === 'simple'}
  onCheckedChange={(checked) => {
    setFilters({ ...filters, showClusters: !!checked })
    setCommunityMode('simple')
  }}
>
  <Layers className="w-4 h-4 mr-2" />
  Simple clustering (connected components)
</DropdownMenuCheckboxItem>
<DropdownMenuCheckboxItem
  checked={filters.showClusters && communityMode === 'advanced'}
  onCheckedChange={(checked) => {
    setFilters({ ...filters, showClusters: !!checked })
    setCommunityMode('advanced')
  }}
>
  <GitBranch className="w-4 h-4 mr-2" />
  Advanced communities (Label Propagation + AI)
</DropdownMenuCheckboxItem>
```

#### 3.2 Add "Detect Communities" button
```typescript
{communityMode === 'advanced' && (
  <Button
    variant="outline"
    size="sm"
    onClick={handleDetectCommunities}
    disabled={detectMutation.isPending}
  >
    <RefreshCw className={cn(
      'w-4 h-4 mr-2',
      detectMutation.isPending && 'animate-spin'
    )} />
    {detectMutation.isPending ? 'Detecting...' : 'Detect Communities'}
  </Button>
)}
```

---

### STAP 4: Replace Legend with ClusterLegend

**Wijzigingen onderaan graph (regel ~1957):**

#### 4.1 Conditional legend rendering
```typescript
{/* Legend */}
{filters.showClusters && communityMode === 'advanced' ? (
  <ClusterLegend
    workspaceId={workspaceId}
    projectId={projectId}
    selectedCommunityUuid={selectedCommunityUuid}
    onCommunityClick={(uuid) => {
      setSelectedCommunityUuid(uuid)
      // Optionally highlight community members in graph
    }}
    className="absolute bottom-2 left-2 max-w-xs"
  />
) : filters.showClusters ? (
  <div className="absolute bottom-2 left-2 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
    <span className="text-muted-foreground">Colored by cluster (simple)</span>
  </div>
) : (
  <div className="absolute bottom-2 left-2 flex items-center gap-4 text-xs bg-white/80 dark:bg-slate-800/80 px-2 py-1 rounded">
    {Object.entries(NODE_COLORS).map(([type, color]) => (
      <div key={type} className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-muted-foreground">{type}</span>
      </div>
    ))}
  </div>
)}
```

---

### STAP 5: Extend Sidebar with ClusterDetailPanel

**Wijzigingen in DetailSidebar (regel ~556):**

#### 5.1 Add community detail section
```typescript
{/* Community Info - Enhanced */}
{selectedNode.communityUuid && communityMode === 'advanced' ? (
  <div className="space-y-2 border-t pt-4">
    <h4 className="text-sm font-medium">Community</h4>
    <ClusterDetailPanel
      communityUuid={selectedNode.communityUuid}
      workspaceId={workspaceId}
      projectId={projectId}
      onMemberClick={(entityUuid) => {
        // Find and select node by entity UUID
        const node = nodes.find(n => n.id === entityUuid)
        if (node) {
          handleNodeClick(node)
        }
      }}
      className="!p-0"
    />
  </div>
) : selectedNode.cluster !== undefined ? (
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
) : null}
```

---

### STAP 6: Community Highlighting in Graph

**Optionele feature: Highlight all members when community selected**

#### 6.1 Add highlight effect
```typescript
const highlightedByCommunitySets = useMemo(() => {
  if (!selectedCommunityUuid || !communitiesData) return new Set<string>()

  const community = communitiesData.communities.find(c => c.uuid === selectedCommunityUuid)
  if (!community?.members) return new Set<string>()

  return new Set(community.members.map(m => m.uuid))
}, [selectedCommunityUuid, communitiesData])
```

#### 6.2 Update node fill color logic
```typescript
.attr('fill', d => {
  if (isNodeHighlighted(d)) return '#f59e0b' // Duplicate highlights
  if (highlightedByCommunity.has(d.id)) return '#10b981' // Community highlight
  if (pathNodes.has(d.id)) return '#22c55e'
  if (filters.showClusters && d.cluster !== undefined) {
    return CLUSTER_COLORS[d.cluster % CLUSTER_COLORS.length] || NODE_COLORS[d.type]
  }
  return NODE_COLORS[d.type]
})
```

---

## Data Mapping Challenge

### Probleem:
- **Graph nodes** hebben node IDs (kunnen page IDs, entity UUIDs, etc. zijn)
- **Communities** hebben entity UUIDs als members
- Mapping nodig: entity UUID → node ID

### Oplossing:
1. **Backend query** moet entities returnen met hun node IDs (vanuit FalkorDB)
2. **Frontend mapping** op basis van node type:
   - WikiPage nodes: match op pageId
   - Entity nodes: match op entity UUID (direct)

### Code sketch:
```typescript
// In getCommunity/getCommunities response:
members: [
  {
    uuid: 'entity-uuid-123',
    name: 'John Doe',
    type: 'Person',
    nodeId: 'entity-uuid-123' // Add this field
  }
]
```

---

## Testing Checklist

- [ ] Simple clustering werkt nog steeds (fallback mode)
- [ ] Advanced mode haalt communities op van backend
- [ ] ClusterLegend toont correct aantal communities
- [ ] Click op community in legend selecteert de community
- [ ] Graph nodes krijgen correcte kleuren per community
- [ ] Sidebar toont community details met members
- [ ] Click op member in ClusterDetailPanel selecteert die node in graph
- [ ] "Detect Communities" button werkt en toont loading state
- [ ] Community highlighting werkt (optioneel)
- [ ] Mode switching (simple ↔ advanced) werkt zonder crashes

---

## Geschatte Impact

### Bestanden te wijzigen:
1. `apps/web/src/components/wiki/WikiGraphView.tsx` (~200 regels wijzigingen)
   - Imports
   - State management
   - Cluster detection logic
   - UI controls
   - Legend replacement
   - Sidebar extension

### Nieuwe functionaliteit:
- AI-generated community names in graph
- Interactive community legend
- Detailed community info panel
- Toggle tussen simple/advanced clustering

### Backwards compatibility:
- ✅ Simple clustering blijft beschikbaar als fallback
- ✅ Bestaande graph features blijven werken
- ✅ Geen breaking changes voor bestaande gebruikers

---

## Implementatie Volgorde

1. **Phase 1: Backend Integration** (30 min)
   - Add imports, state, hooks
   - Extend GraphNode interface

2. **Phase 2: Detection Logic** (45 min)
   - Replace cluster calculation
   - Handle data mapping
   - Test both modes

3. **Phase 3: UI Controls** (30 min)
   - Update filter dropdown
   - Add detect button
   - Test mode switching

4. **Phase 4: Legend** (20 min)
   - Replace with ClusterLegend
   - Test click interactions

5. **Phase 5: Sidebar** (30 min)
   - Integrate ClusterDetailPanel
   - Test member navigation

6. **Phase 6: Polish** (15 min)
   - Community highlighting (optional)
   - Loading states
   - Error handling

**Totaal geschat:** ~2.5 uur

---

## Risico's & Mitigaties

### Risico 1: Entity UUID ↔ Node ID mismatch
**Mitigatie:** Add explicit nodeId field in community member response

### Risico 2: Performance bij grote graphs
**Mitigatie:** Lazy load communities, cache detection results

### Risico 3: UI clutter met beide legends
**Mitigatie:** Conditional rendering, alleen tonen in advanced mode

### Risico 4: Breaking existing workflows
**Mitigatie:** Keep simple mode as default, advanced is opt-in

---

## Post-Implementation

### Documentatie updates:
- [ ] Update WikiGraphView.tsx header comment (versie bump)
- [ ] Add community detection section to WIKI docs
- [ ] Update ROADMAP-STATUS.md with Fase 24.10 completion

### Testen:
- [ ] Unit tests voor community mapping logic
- [ ] Integration test: detect → visualize → interact
- [ ] Performance test met 500+ nodes

### Monitoring:
- [ ] Track community detection usage
- [ ] Monitor API call performance
- [ ] Collect user feedback on AI summaries

---

## Conclusie

Deze integratie brengt de volledige Fase 24 Community Detection naar de frontend. Gebruikers krijgen:

✅ AI-powered community names (vs. "Cluster #1")
✅ Interactive legend met member counts
✅ Detailed community panels met summaries
✅ Smooth workflow: detect → visualize → explore

De implementatie is backwards compatible en bouwt voort op de bestaande graph infrastructuur.
