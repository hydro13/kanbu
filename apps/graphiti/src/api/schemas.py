"""
Kanbu Graphiti API Schemas
Pydantic models for request/response validation.
"""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


# =============================================================================
# Episode (Wiki Page Version)
# =============================================================================


class AddEpisodeRequest(BaseModel):
    """Request to add a new episode (wiki page save)."""

    name: str = Field(..., description='Episode name (e.g., page title)')
    episode_body: str = Field(..., description='Episode content (wiki page content)')
    source: Literal['text', 'json', 'message'] = Field(
        default='text', description='Source type'
    )
    source_description: str = Field(
        default='wiki_page', description='Source description (e.g., wiki_page:user:123)'
    )
    group_id: str = Field(..., description='Group ID for isolation (e.g., wiki-ws-1)')
    reference_time: datetime | None = Field(
        default=None, description='Reference time for temporal queries'
    )
    use_kanbu_entities: bool = Field(
        default=True,
        description='Use Kanbu-specific entity types (WikiPage, Task, User, Project, Concept)',
    )
    custom_instructions: str | None = Field(
        default=None,
        description='Additional extraction instructions for the LLM (optional)',
    )


class ExtractedEntityInfo(BaseModel):
    """Information about an extracted entity."""

    entity_name: str
    entity_type: str
    is_new: bool = False


class AddEpisodeResponse(BaseModel):
    """Response after adding an episode."""

    episode_uuid: str
    entities_extracted: int
    relations_created: int
    entity_details: list[ExtractedEntityInfo] = Field(default_factory=list)


class EntityTypeInfo(BaseModel):
    """Information about an available entity type."""

    type_name: str
    description: str
    fields: list[str]


class EntityTypesResponse(BaseModel):
    """Response listing available entity types."""

    entity_types: list[EntityTypeInfo]
    kanbu_entities_enabled: bool
    custom_instructions_preview: str | None = None


class GetEpisodesRequest(BaseModel):
    """Request to get episodes for a group."""

    group_id: str
    limit: int = Field(default=20, ge=1, le=100)


class EpisodeInfo(BaseModel):
    """Episode information."""

    uuid: str
    name: str
    content: str
    source: str
    source_description: str
    created_at: datetime
    valid_at: datetime


class GetEpisodesResponse(BaseModel):
    """Response with episodes."""

    episodes: list[EpisodeInfo]


# =============================================================================
# Search
# =============================================================================


class SearchRequest(BaseModel):
    """Search request."""

    query: str = Field(..., min_length=1, description='Search query')
    group_id: str | None = Field(default=None, description='Filter by group')
    limit: int = Field(default=10, ge=1, le=50)
    search_type: Literal['facts', 'nodes', 'hybrid'] = Field(
        default='hybrid', description='Type of search'
    )


class SearchResult(BaseModel):
    """Single search result."""

    uuid: str
    name: str
    content: str
    score: float
    result_type: Literal['entity', 'edge', 'episode']
    metadata: dict[str, Any] = Field(default_factory=dict)


class SearchResponse(BaseModel):
    """Search response."""

    results: list[SearchResult]
    total: int
    query: str


# =============================================================================
# Graph Data
# =============================================================================


class GraphNode(BaseModel):
    """Node in the graph."""

    id: str
    label: str
    node_type: str
    properties: dict[str, Any] = Field(default_factory=dict)


class GraphEdge(BaseModel):
    """Edge in the graph."""

    source: str
    target: str
    edge_type: str
    fact: str | None = None
    valid_at: datetime | None = None
    invalid_at: datetime | None = None


class GetGraphRequest(BaseModel):
    """Request to get graph data."""

    group_id: str


class GetGraphResponse(BaseModel):
    """Response with graph data for visualization."""

    nodes: list[GraphNode]
    edges: list[GraphEdge]


# =============================================================================
# Temporal Queries
# =============================================================================


class TemporalQueryRequest(BaseModel):
    """Request for temporal queries."""

    query: str
    group_id: str
    as_of: datetime = Field(..., description='Point in time to query')
    limit: int = Field(default=10, ge=1, le=50)


class TemporalQueryResponse(BaseModel):
    """Response for temporal queries."""

    results: list[SearchResult]
    as_of: datetime


# =============================================================================
# Stats & Health
# =============================================================================


class StatsResponse(BaseModel):
    """Graph statistics."""

    total_nodes: int
    total_edges: int
    total_episodes: int
    nodes_by_type: dict[str, int]
    edges_by_type: dict[str, int]


class HealthResponse(BaseModel):
    """Health check response."""

    status: Literal['healthy', 'unhealthy']
    database_connected: bool
    llm_configured: bool
    embedder_configured: bool
    version: str
    entity_types_available: list[str] = Field(default_factory=list)
