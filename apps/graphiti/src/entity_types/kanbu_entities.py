"""
Kanbu Entity Types for Graphiti Knowledge Graph

Defines domain-specific entity types for extracting and classifying
entities from wiki content in Kanbu.

IMPORTANT: Field names must NOT overlap with EntityNode base fields:
- uuid, name, group_id, labels, created_at
- name_embedding, summary, attributes

===================================================================
AI Architect: Robin Waslander <R.Waslander@gmail.com>
Signed: 2026-01-12
Change: Fase 10 - LLM Entity Extraction
===================================================================
"""

from pydantic import BaseModel, Field


# =============================================================================
# WikiPage Entity
# =============================================================================


class WikiPage(BaseModel):
    """
    A wiki page in the Kanbu knowledge base.

    Extract this type when content refers to documentation pages,
    wiki articles, or internal knowledge base entries.
    """

    page_title: str | None = Field(
        default=None,
        description='The title of the wiki page being referenced',
    )
    page_slug: str | None = Field(
        default=None,
        description='URL slug/identifier of the page (e.g., "getting-started")',
    )
    page_scope: str | None = Field(
        default=None,
        description='Scope: "workspace" or "project"',
    )


# =============================================================================
# Task Entity
# =============================================================================


class KanbuTask(BaseModel):
    """
    A task or issue in the Kanbu project management system.

    Extract this type when content refers to tasks, tickets,
    issues, or work items with a task reference (e.g., #KANBU-123).
    """

    task_reference: str | None = Field(
        default=None,
        description='Task reference number (e.g., "KANBU-123", "PROJ-456")',
    )
    task_title: str | None = Field(
        default=None,
        description='Title of the task if mentioned',
    )
    task_status: str | None = Field(
        default=None,
        description='Status if mentioned (e.g., "in progress", "done", "blocked")',
    )


# =============================================================================
# User Entity
# =============================================================================


class KanbuUser(BaseModel):
    """
    A user or team member in Kanbu.

    Extract this type when content mentions people by name,
    username, @mentions, or role references.
    """

    user_name: str | None = Field(
        default=None,
        description='Display name of the user',
    )
    user_handle: str | None = Field(
        default=None,
        description='Username or @handle (e.g., "@robin", "robin.waslander")',
    )
    user_role: str | None = Field(
        default=None,
        description='Role if mentioned (e.g., "developer", "manager", "admin")',
    )


# =============================================================================
# Project Entity
# =============================================================================


class KanbuProject(BaseModel):
    """
    A project in Kanbu.

    Extract this type when content refers to projects,
    workstreams, or project-specific contexts.
    """

    project_name: str | None = Field(
        default=None,
        description='Name of the project',
    )
    project_prefix: str | None = Field(
        default=None,
        description='Project task prefix (e.g., "KANBU", "WEB")',
    )


# =============================================================================
# Concept Entity (Generic)
# =============================================================================


class Concept(BaseModel):
    """
    A generic concept, topic, or domain term.

    Extract this type for technical concepts, methodologies,
    tools, technologies, or abstract ideas that don't fit
    other specific entity types.
    """

    concept_category: str | None = Field(
        default=None,
        description='Category of the concept (e.g., "technology", "methodology", "tool")',
    )
    related_domain: str | None = Field(
        default=None,
        description='Domain this concept belongs to (e.g., "frontend", "database", "devops")',
    )


# =============================================================================
# Aggregated Entity Types for Graphiti
# =============================================================================


KANBU_ENTITY_TYPES: dict[str, type[BaseModel]] = {
    'WikiPage': WikiPage,
    'Task': KanbuTask,
    'User': KanbuUser,
    'Project': KanbuProject,
    'Concept': Concept,
}
"""
Dictionary of all Kanbu entity types.
Pass this to graphiti.add_episode(entity_types=KANBU_ENTITY_TYPES)
"""


KANBU_EXTRACTION_INSTRUCTIONS = """
Additional Context for Kanbu Knowledge Base:

1. **Wiki Page References**: Look for [[wiki-link]] patterns or references
   to documentation pages. These should be classified as WikiPage entities.

2. **Task References**: Patterns like #KANBU-123, #PROJ-456, or mentions of
   "task", "ticket", "issue" should be classified as Task entities.

3. **User Mentions**: @username patterns, names of team members, or role
   references (e.g., "the developer", "project manager") should be
   classified as User entities.

4. **Project Context**: When content discusses specific projects or uses
   project prefixes, extract Project entities.

5. **Technical Concepts**: Technologies, methodologies, tools, or domain
   terms should be classified as Concept entities.

Be specific when extracting entity names - use full names and identifiers
when available (e.g., "Robin Waslander" not just "Robin",
"#KANBU-123" not just "the task").
"""
"""
Custom extraction instructions for the LLM.
Pass this to graphiti.add_episode(custom_extraction_instructions=KANBU_EXTRACTION_INSTRUCTIONS)
"""
