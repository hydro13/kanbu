"""
Kanbu Graphiti API Service
FastAPI wrapper around graphiti_core for wiki knowledge graph.

Endpoints:
- POST /episodes - Add episode (wiki page save)
- GET /episodes - Get episodes for group
- DELETE /episodes/{uuid} - Delete episode
- POST /search - Search facts/nodes
- POST /search/temporal - Temporal search (as of date)
- GET /graph/{group_id} - Get graph data for visualization
- GET /stats - Get graph statistics
- GET /health - Health check
"""

import logging
import os

# =============================================================================
# IMPORTANT: Disable Graphiti telemetry BEFORE any graphiti_core imports
# Graphiti by default sends anonymous telemetry to PostHog (opt-out).
# This must be set before importing graphiti_core modules.
# See: https://github.com/getzep/graphiti - telemetry is opt-out
# =============================================================================
os.environ['GRAPHITI_TELEMETRY_ENABLED'] = 'false'

from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AddEpisodeRequest,
    AddEpisodeResponse,
    EntityTypeInfo,
    EntityTypesResponse,
    EpisodeInfo,
    ExtractedEntityInfo,
    GetEpisodesRequest,
    GetEpisodesResponse,
    GetGraphRequest,
    GetGraphResponse,
    GraphEdge,
    GraphNode,
    HealthResponse,
    HybridSearchRequest,
    HybridSearchResponse,
    SearchRequest,
    SearchResponse,
    SearchResult,
    StatsResponse,
    TemporalQueryRequest,
    TemporalQueryResponse,
)

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global graphiti instance
graphiti_client = None


# =============================================================================
# Graphiti Client Setup
# =============================================================================


async def get_graphiti():
    """Get or create Graphiti client."""
    global graphiti_client

    if graphiti_client is not None:
        return graphiti_client

    # Import here to avoid circular imports
    from urllib.parse import urlparse

    from graphiti_core.driver.falkordb_driver import FalkorDriver
    from graphiti_core.embedder import OpenAIEmbedder
    from graphiti_core.embedder.openai import OpenAIEmbedderConfig
    from graphiti_core.graphiti import Graphiti
    from graphiti_core.llm_client import LLMConfig, OpenAIClient

    # Get configuration from environment
    falkordb_uri = os.getenv('FALKORDB_URI', 'redis://localhost:6379')
    openai_api_key = os.getenv('OPENAI_API_KEY')

    # Embedding configuration
    embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
    embedding_dim = int(os.getenv('EMBEDDING_DIM', '1024'))

    # Parse FalkorDB URI (redis://host:port)
    parsed = urlparse(falkordb_uri)
    falkordb_host = parsed.hostname or 'localhost'
    falkordb_port = parsed.port or 6379

    if not openai_api_key:
        logger.warning('OPENAI_API_KEY not set, using mock LLM client')
        # For now, we'll create a basic setup
        # In production, you'd want to fail or use Ollama

    try:
        # Create FalkorDB driver
        falkor_driver = FalkorDriver(
            host=falkordb_host,
            port=falkordb_port,
            database='kanbu_wiki',
        )

        # Create LLM client
        llm_config = LLMConfig(
            api_key=openai_api_key or 'mock-key',
            model='gpt-4o-mini',
        )
        llm_client = OpenAIClient(llm_config)

        # Create Embedder client (Fase 11)
        # Embeddings are automatically generated for:
        # - Entity nodes (name_embedding)
        # - Entity edges (fact_embedding)
        # - Community nodes (name_embedding)
        embedder_config = OpenAIEmbedderConfig(
            api_key=openai_api_key,
            embedding_model=embedding_model,
            embedding_dim=embedding_dim,
        )
        embedder = OpenAIEmbedder(config=embedder_config)

        logger.info(
            f'Embedder configured: model={embedding_model}, dim={embedding_dim}'
        )

        # Create Graphiti instance with FalkorDB driver and embedder
        graphiti_client = Graphiti(
            graph_driver=falkor_driver,
            llm_client=llm_client,
            embedder=embedder,
        )

        # Initialize the graph database
        await graphiti_client.build_indices_and_constraints()

        logger.info(f'Graphiti client initialized with FalkorDB at {falkordb_host}:{falkordb_port}')
        return graphiti_client

    except Exception as e:
        logger.error(f'Failed to initialize Graphiti: {e}')
        raise


# =============================================================================
# Application Lifecycle
# =============================================================================


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info('Starting Kanbu Graphiti service...')
    try:
        await get_graphiti()
        logger.info('Graphiti service ready')
    except Exception as e:
        logger.error(f'Failed to start Graphiti service: {e}')

    yield

    # Shutdown
    logger.info('Shutting down Kanbu Graphiti service...')
    global graphiti_client
    if graphiti_client:
        await graphiti_client.close()
        graphiti_client = None


# =============================================================================
# FastAPI Application
# =============================================================================


app = FastAPI(
    title='Kanbu Graphiti Service',
    description='Knowledge graph service for Kanbu Wiki',
    version='1.0.0',
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # In production, restrict this
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)


# =============================================================================
# Health & Stats Endpoints
# =============================================================================


@app.get('/health', response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        graphiti = await get_graphiti()
        db_connected = graphiti is not None
    except Exception:
        db_connected = False

    # Get available entity types
    from ..entity_types import KANBU_ENTITY_TYPES

    entity_types = list(KANBU_ENTITY_TYPES.keys())

    # Embedding configuration info
    embedding_model = os.getenv('EMBEDDING_MODEL', 'text-embedding-3-small')
    embedding_dim = int(os.getenv('EMBEDDING_DIM', '1024'))
    has_api_key = bool(os.getenv('OPENAI_API_KEY'))

    return HealthResponse(
        status='healthy' if db_connected else 'unhealthy',
        database_connected=db_connected,
        llm_configured=has_api_key,
        embedder_configured=has_api_key,
        version='1.0.0',
        entity_types_available=entity_types,
        embedding_model=embedding_model if has_api_key else None,
        embedding_dim=embedding_dim if has_api_key else None,
    )


@app.get('/entity-types', response_model=EntityTypesResponse)
async def get_entity_types():
    """
    List available entity types for extraction.
    Shows Kanbu-specific entity types and their fields.
    """
    from ..entity_types import KANBU_ENTITY_TYPES, KANBU_EXTRACTION_INSTRUCTIONS

    entity_types = []
    for type_name, type_model in KANBU_ENTITY_TYPES.items():
        # Get docstring as description
        description = type_model.__doc__ or f'{type_name} entity'
        description = description.strip().split('\n')[0]  # First line only

        # Get field names
        fields = list(type_model.model_fields.keys())

        entity_types.append(
            EntityTypeInfo(
                type_name=type_name,
                description=description,
                fields=fields,
            )
        )

    return EntityTypesResponse(
        entity_types=entity_types,
        kanbu_entities_enabled=True,
        custom_instructions_preview=KANBU_EXTRACTION_INSTRUCTIONS[:500] + '...',
    )


@app.get('/stats', response_model=StatsResponse)
async def get_stats(group_id: str | None = None):
    """Get graph statistics."""
    try:
        graphiti = await get_graphiti()

        # Query stats from graph
        # This is a placeholder - actual implementation depends on graphiti_core
        return StatsResponse(
            total_nodes=0,
            total_edges=0,
            total_episodes=0,
            nodes_by_type={},
            edges_by_type={},
        )
    except Exception as e:
        logger.error(f'Failed to get stats: {e}')
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Episode Endpoints
# =============================================================================


@app.post('/episodes', response_model=AddEpisodeResponse)
async def add_episode(request: AddEpisodeRequest):
    """
    Add an episode (wiki page save).
    This is the main entry point for syncing wiki content to the knowledge graph.

    Features:
    - LLM-based entity extraction (Fase 10)
    - Custom Kanbu entity types: WikiPage, Task, User, Project, Concept
    - Custom extraction instructions for domain-specific context
    """
    try:
        graphiti = await get_graphiti()

        # Import EpisodeType
        from graphiti_core.graphiti_types import EpisodeType

        # Map source to EpisodeType
        source_map = {
            'text': EpisodeType.text,
            'json': EpisodeType.json,
            'message': EpisodeType.message,
        }

        # Prepare entity types and extraction instructions
        entity_types = None
        extraction_instructions = request.custom_instructions or ''

        if request.use_kanbu_entities:
            from ..entity_types import KANBU_ENTITY_TYPES, KANBU_EXTRACTION_INSTRUCTIONS

            entity_types = KANBU_ENTITY_TYPES
            # Combine custom instructions with Kanbu defaults
            if extraction_instructions:
                extraction_instructions = f'{KANBU_EXTRACTION_INSTRUCTIONS}\n\n{extraction_instructions}'
            else:
                extraction_instructions = KANBU_EXTRACTION_INSTRUCTIONS

        logger.info(
            f'Adding episode "{request.name}" to group {request.group_id} '
            f'with entity_types={list(entity_types.keys()) if entity_types else "default"}'
        )

        # Add episode to graphiti with custom entity types
        result = await graphiti.add_episode(
            name=request.name,
            episode_body=request.episode_body,
            source=source_map.get(request.source, EpisodeType.text),
            source_description=request.source_description,
            group_id=request.group_id,
            reference_time=request.reference_time or datetime.now(),
            entity_types=entity_types,
            custom_extraction_instructions=extraction_instructions if extraction_instructions else None,
        )

        # Extract result information
        episode_uuid = str(result.uuid) if hasattr(result, 'uuid') else 'unknown'
        extracted_entities = result.extracted_entities if hasattr(result, 'extracted_entities') else []
        created_edges = result.created_edges if hasattr(result, 'created_edges') else []

        # Build entity details
        entity_details = []
        for entity in extracted_entities:
            entity_type = 'Entity'  # Default
            if hasattr(entity, 'labels') and entity.labels:
                entity_type = entity.labels[0]
            elif hasattr(entity, '__class__'):
                entity_type = entity.__class__.__name__

            entity_details.append(
                ExtractedEntityInfo(
                    entity_name=getattr(entity, 'name', str(entity)),
                    entity_type=entity_type,
                    is_new=True,  # Will need to track this properly
                )
            )

        logger.info(
            f'Episode "{request.name}" processed: '
            f'{len(extracted_entities)} entities, {len(created_edges)} relations'
        )

        return AddEpisodeResponse(
            episode_uuid=episode_uuid,
            entities_extracted=len(extracted_entities),
            relations_created=len(created_edges),
            entity_details=entity_details,
        )

    except Exception as e:
        logger.error(f'Failed to add episode: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/episodes/list', response_model=GetEpisodesResponse)
async def get_episodes(request: GetEpisodesRequest):
    """Get episodes for a group."""
    try:
        graphiti = await get_graphiti()

        # Get episodes from graphiti
        episodes = await graphiti.get_episodes(
            group_id=request.group_id,
            limit=request.limit,
        )

        return GetEpisodesResponse(
            episodes=[
                EpisodeInfo(
                    uuid=str(ep.uuid),
                    name=ep.name,
                    content=ep.content,
                    source=ep.source,
                    source_description=ep.source_description,
                    created_at=ep.created_at,
                    valid_at=ep.valid_at,
                )
                for ep in episodes
            ]
        )

    except Exception as e:
        logger.error(f'Failed to get episodes: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.delete('/episodes/{episode_uuid}')
async def delete_episode(episode_uuid: str):
    """Delete an episode."""
    try:
        graphiti = await get_graphiti()
        await graphiti.delete_episode(episode_uuid)
        return {'success': True, 'uuid': episode_uuid}
    except Exception as e:
        logger.error(f'Failed to delete episode: {e}')
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Search Endpoints
# =============================================================================


@app.post('/search', response_model=SearchResponse)
async def search(request: SearchRequest):
    """Search the knowledge graph."""
    try:
        graphiti = await get_graphiti()

        # Perform search
        results = await graphiti.search(
            query=request.query,
            group_ids=[request.group_id] if request.group_id else None,
            num_results=request.limit,
        )

        return SearchResponse(
            results=[
                SearchResult(
                    uuid=str(r.uuid) if hasattr(r, 'uuid') else 'unknown',
                    name=r.name if hasattr(r, 'name') else '',
                    content=r.fact if hasattr(r, 'fact') else str(r),
                    score=r.score if hasattr(r, 'score') else 1.0,
                    result_type='edge',
                    metadata={},
                )
                for r in results
            ],
            total=len(results),
            query=request.query,
        )

    except Exception as e:
        logger.error(f'Search failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/search/temporal', response_model=TemporalQueryResponse)
async def temporal_search(request: TemporalQueryRequest):
    """
    Temporal search - "What did we know at time X?"
    """
    try:
        graphiti = await get_graphiti()

        # Import search filters
        from graphiti_core.search.search_filters import (
            ComparisonOperator,
            DateFilter,
            SearchFilters,
        )

        # Create temporal filters
        filters = SearchFilters(
            valid_at=[
                [
                    DateFilter(
                        date=request.as_of,
                        comparison_operator=ComparisonOperator.less_than_equal,
                    )
                ]
            ],
            invalid_at=[
                [
                    DateFilter(
                        date=request.as_of,
                        comparison_operator=ComparisonOperator.greater_than,
                    )
                ],
                [DateFilter(comparison_operator=ComparisonOperator.is_null)],
            ],
        )

        # Search with temporal filters
        results = await graphiti.search(
            query=request.query,
            group_ids=[request.group_id],
            num_results=request.limit,
            filters=filters,
        )

        return TemporalQueryResponse(
            results=[
                SearchResult(
                    uuid=str(r.uuid) if hasattr(r, 'uuid') else 'unknown',
                    name=r.name if hasattr(r, 'name') else '',
                    content=r.fact if hasattr(r, 'fact') else str(r),
                    score=r.score if hasattr(r, 'score') else 1.0,
                    result_type='edge',
                    metadata={},
                )
                for r in results
            ],
            as_of=request.as_of,
        )

    except Exception as e:
        logger.error(f'Temporal search failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/search/hybrid', response_model=HybridSearchResponse)
async def hybrid_search(request: HybridSearchRequest):
    """
    Advanced hybrid search (Fase 11).

    Combines multiple search methods:
    - BM25 (fulltext) for keyword matching
    - Vector similarity for semantic matching
    - BFS (breadth-first search) for graph traversal

    Supports multiple reranking strategies:
    - RRF (Reciprocal Rank Fusion) - combines multiple rankings
    - MMR (Maximal Marginal Relevance) - diversity-aware
    - Cross-encoder - neural reranking
    """
    try:
        graphiti = await get_graphiti()

        # Import search configuration
        from graphiti_core.search.search import search as graphiti_search
        from graphiti_core.search.search_config import (
            CommunityReranker,
            CommunitySearchConfig,
            CommunitySearchMethod,
            EdgeReranker,
            EdgeSearchConfig,
            EdgeSearchMethod,
            EpisodeReranker,
            EpisodeSearchConfig,
            NodeReranker,
            NodeSearchConfig,
            NodeSearchMethod,
            SearchConfig,
        )
        from graphiti_core.search.search_filters import SearchFilters

        # Build search methods based on request
        edge_methods = []
        node_methods = []

        if request.use_bm25:
            edge_methods.append(EdgeSearchMethod.bm25)
            node_methods.append(NodeSearchMethod.bm25)
        if request.use_vector:
            edge_methods.append(EdgeSearchMethod.cosine_similarity)
            node_methods.append(NodeSearchMethod.cosine_similarity)
        if request.use_bfs:
            edge_methods.append(EdgeSearchMethod.bfs)
            node_methods.append(NodeSearchMethod.bfs)

        # Map reranker string to enum
        edge_reranker_map = {
            'rrf': EdgeReranker.rrf,
            'mmr': EdgeReranker.mmr,
            'cross_encoder': EdgeReranker.cross_encoder,
            'none': EdgeReranker.rrf,  # Default to RRF
        }
        node_reranker_map = {
            'rrf': NodeReranker.rrf,
            'mmr': NodeReranker.mmr,
            'cross_encoder': NodeReranker.cross_encoder,
            'none': NodeReranker.rrf,
        }

        # Build search config
        edge_config = None
        node_config = None
        episode_config = None
        community_config = None

        if request.search_edges and edge_methods:
            edge_config = EdgeSearchConfig(
                search_methods=edge_methods,
                reranker=edge_reranker_map.get(request.reranker, EdgeReranker.rrf),
                mmr_lambda=request.mmr_lambda,
            )

        if request.search_nodes and node_methods:
            node_config = NodeSearchConfig(
                search_methods=node_methods,
                reranker=node_reranker_map.get(request.reranker, NodeReranker.rrf),
                mmr_lambda=request.mmr_lambda,
            )

        if request.search_episodes:
            episode_config = EpisodeSearchConfig(
                reranker=EpisodeReranker.rrf,
            )

        if request.search_communities:
            community_reranker_map = {
                'rrf': CommunityReranker.rrf,
                'mmr': CommunityReranker.mmr,
                'cross_encoder': CommunityReranker.cross_encoder,
                'none': CommunityReranker.rrf,
            }
            community_config = CommunitySearchConfig(
                search_methods=[
                    CommunitySearchMethod.bm25 if request.use_bm25 else None,
                    CommunitySearchMethod.cosine_similarity if request.use_vector else None,
                ],
                reranker=community_reranker_map.get(request.reranker, CommunityReranker.rrf),
                mmr_lambda=request.mmr_lambda,
            )
            # Filter out None values
            community_config.search_methods = [m for m in community_config.search_methods if m]

        search_config = SearchConfig(
            edge_config=edge_config,
            node_config=node_config,
            episode_config=episode_config,
            community_config=community_config,
            limit=request.limit,
        )

        # Execute search
        group_ids = [request.group_id] if request.group_id else None
        results = await graphiti_search(
            clients=graphiti.clients,
            query=request.query,
            group_ids=group_ids,
            config=search_config,
            search_filter=SearchFilters(),
        )

        # Build response
        search_methods_used = []
        if request.use_bm25:
            search_methods_used.append('bm25')
        if request.use_vector:
            search_methods_used.append('vector')
        if request.use_bfs:
            search_methods_used.append('bfs')

        # Convert edges to SearchResult
        edge_results = []
        for i, edge in enumerate(results.edges):
            score = results.edge_reranker_scores[i] if i < len(results.edge_reranker_scores) else 1.0
            edge_results.append(
                SearchResult(
                    uuid=str(edge.uuid),
                    name=edge.name if hasattr(edge, 'name') else '',
                    content=edge.fact,
                    score=score,
                    result_type='edge',
                    metadata={
                        'source_node': edge.source_node_uuid,
                        'target_node': edge.target_node_uuid,
                        'valid_at': edge.valid_at.isoformat() if edge.valid_at else None,
                        'invalid_at': edge.invalid_at.isoformat() if edge.invalid_at else None,
                    },
                )
            )

        # Convert nodes to SearchResult
        node_results = []
        for i, node in enumerate(results.nodes):
            score = results.node_reranker_scores[i] if i < len(results.node_reranker_scores) else 1.0
            node_results.append(
                SearchResult(
                    uuid=str(node.uuid),
                    name=node.name,
                    content=node.summary or node.name,
                    score=score,
                    result_type='entity',
                    metadata={
                        'labels': node.labels,
                    },
                )
            )

        # Convert episodes to SearchResult
        episode_results = []
        for i, ep in enumerate(results.episodes):
            score = results.episode_reranker_scores[i] if i < len(results.episode_reranker_scores) else 1.0
            episode_results.append(
                SearchResult(
                    uuid=str(ep.uuid),
                    name=ep.name,
                    content=ep.content[:500] if ep.content else '',
                    score=score,
                    result_type='episode',
                    metadata={
                        'source': ep.source,
                        'created_at': ep.created_at.isoformat() if ep.created_at else None,
                    },
                )
            )

        # Convert communities to SearchResult
        community_results = []
        for i, comm in enumerate(results.communities):
            score = (
                results.community_reranker_scores[i]
                if i < len(results.community_reranker_scores)
                else 1.0
            )
            community_results.append(
                SearchResult(
                    uuid=str(comm.uuid),
                    name=comm.name,
                    content=comm.summary or comm.name,
                    score=score,
                    result_type='entity',
                    metadata={
                        'type': 'community',
                    },
                )
            )

        total = len(edge_results) + len(node_results) + len(episode_results) + len(community_results)

        logger.info(
            f'Hybrid search "{request.query[:50]}..." returned {total} results '
            f'(edges={len(edge_results)}, nodes={len(node_results)}, '
            f'episodes={len(episode_results)}, communities={len(community_results)})'
        )

        return HybridSearchResponse(
            edges=edge_results,
            nodes=node_results,
            episodes=episode_results,
            communities=community_results,
            query=request.query,
            search_methods_used=search_methods_used,
            reranker_used=request.reranker,
            total_results=total,
        )

    except Exception as e:
        logger.error(f'Hybrid search failed: {e}')
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Graph Visualization Endpoint
# =============================================================================


@app.post('/graph', response_model=GetGraphResponse)
async def get_graph(request: GetGraphRequest):
    """Get graph data for visualization."""
    try:
        graphiti = await get_graphiti()

        # Get all nodes and edges for the group
        # This is a custom query for visualization purposes
        nodes = []
        edges = []

        # Query nodes
        node_query = f"""
            MATCH (n)
            WHERE n.group_id = '{request.group_id}'
            RETURN n, labels(n) as labels
        """

        # Query edges
        edge_query = f"""
            MATCH (s)-[r]->(t)
            WHERE s.group_id = '{request.group_id}'
            RETURN s.uuid as source, t.uuid as target, type(r) as edge_type,
                   r.fact as fact, r.valid_at as valid_at, r.invalid_at as invalid_at
        """

        # Execute queries through graphiti driver
        # Note: Actual implementation depends on graphiti_core driver API

        return GetGraphResponse(nodes=nodes, edges=edges)

    except Exception as e:
        logger.error(f'Failed to get graph: {e}')
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Main Entry Point
# =============================================================================

if __name__ == '__main__':
    import uvicorn

    uvicorn.run(
        'src.api.main:app',
        host='0.0.0.0',
        port=8000,
        reload=True,
    )
