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
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .schemas import (
    AddEpisodeRequest,
    AddEpisodeResponse,
    EpisodeInfo,
    GetEpisodesRequest,
    GetEpisodesResponse,
    GetGraphRequest,
    GetGraphResponse,
    GraphEdge,
    GraphNode,
    HealthResponse,
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
    from src.core.graphiti import Graphiti
    from src.core.llm_client import LLMConfig, OpenAIClient

    # Get configuration from environment
    falkordb_uri = os.getenv('FALKORDB_URI', 'redis://localhost:6379')
    openai_api_key = os.getenv('OPENAI_API_KEY')

    if not openai_api_key:
        logger.warning('OPENAI_API_KEY not set, using mock LLM client')
        # For now, we'll create a basic setup
        # In production, you'd want to fail or use Ollama

    try:
        # Create LLM client
        llm_config = LLMConfig(
            api_key=openai_api_key or 'mock-key',
            model='gpt-4o-mini',
        )
        llm_client = OpenAIClient(llm_config)

        # Create Graphiti instance with FalkorDB
        graphiti_client = Graphiti(
            uri=falkordb_uri,
            llm_client=llm_client,
        )

        # Initialize the graph database
        await graphiti_client.build_indices_and_constraints()

        logger.info(f'Graphiti client initialized with FalkorDB at {falkordb_uri}')
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

    return HealthResponse(
        status='healthy' if db_connected else 'unhealthy',
        database_connected=db_connected,
        llm_configured=bool(os.getenv('OPENAI_API_KEY')),
        embedder_configured=bool(os.getenv('OPENAI_API_KEY')),
        version='1.0.0',
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
    """
    try:
        graphiti = await get_graphiti()

        # Import EpisodeType
        from src.core.graphiti_types import EpisodeType

        # Map source to EpisodeType
        source_map = {
            'text': EpisodeType.text,
            'json': EpisodeType.json,
            'message': EpisodeType.message,
        }

        # Add episode to graphiti
        result = await graphiti.add_episode(
            name=request.name,
            episode_body=request.episode_body,
            source=source_map.get(request.source, EpisodeType.text),
            source_description=request.source_description,
            group_id=request.group_id,
            reference_time=request.reference_time or datetime.now(),
        )

        return AddEpisodeResponse(
            episode_uuid=str(result.uuid) if hasattr(result, 'uuid') else 'unknown',
            entities_extracted=len(result.extracted_entities) if hasattr(result, 'extracted_entities') else 0,
            relations_created=len(result.created_edges) if hasattr(result, 'created_edges') else 0,
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
        from src.core.search.search_filters import (
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
