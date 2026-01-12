"""
Kanbu Entity Types for Graphiti Knowledge Graph

Custom Pydantic models defining domain-specific entity types
for better entity extraction and classification.

===================================================================
AI Architect: Robin Waslander <R.Waslander@gmail.com>
Signed: 2026-01-12
Change: Fase 10 - LLM Entity Extraction
===================================================================
"""

from .kanbu_entities import (
    KANBU_ENTITY_TYPES,
    KANBU_EXTRACTION_INSTRUCTIONS,
    Concept,
    KanbuProject,
    KanbuTask,
    KanbuUser,
    WikiPage,
)

__all__ = [
    # Entity type models
    'WikiPage',
    'KanbuTask',
    'KanbuUser',
    'KanbuProject',
    'Concept',
    # Aggregated types
    'KANBU_ENTITY_TYPES',
    'KANBU_EXTRACTION_INSTRUCTIONS',
]
