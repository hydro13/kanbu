# Changelog

All notable changes to Kanbu will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned Features
- Multi-instance deployment with Redis support
- - Discord integration for notifications
  - - Advanced reporting and analytics dashboard
    - - Slack integration
      - - Custom fields and templates
        - - API v2 with GraphQL support
          - - Email notifications
            - - Team workload analytics
             
              - ### In Progress
              - - Knowledge graph wiki implementation (Fase 8)
                - - Advanced permissioning edge cases
                  - - Performance optimization for large datasets
                   
                    - ## [0.1.0-beta.1] - 2026-01-16
                   
                    - ### Added
                    - - **Kanban Board**: Drag-and-drop task management with columns and swimlanes
                      - - **Multiple Views**: Board, List, Calendar, Timeline views for tasks
                        - - **Sprints & Milestones**: Sprint planning with burndown charts
                          - - **Real-time Collaboration**: Live task updates, cursor tracking, typing indicators
                            - - **NTFS-Style ACL System**:
                              -   - Granular permissions (Read, Write, Execute, Delete, Permissions)
                                  -   - Permission inheritance (Workspace → Project → Task)
                                      -   - Deny-first logic with security groups
                                          -   - Complete audit logging
                                              - - **AI Integration (Claude Code)**:
                                                -   - 131 MCP tools for task management
                                                    -   - Permission inheritance for Claude Code
                                                        -   - One-time secure pairing flow
                                                            -   - Multi-language support
                                                                - - **GitHub Integration**:
                                                                  -   - Bi-directional issue and PR sync
                                                                      -   - GitHub App with webhook support
                                                                          -   - Auto-link commits to tasks
                                                                              - - **Knowledge Wiki**:
                                                                                -   - Rich editor with code highlighting
                                                                                    -   - Knowledge graph with auto-linking
                                                                                        -   - Semantic search capabilities
                                                                                            -   - AI-powered Q&A interface
                                                                                                - - **Multi-AI Provider Support**:
                                                                                                  -   - OpenAI integration
                                                                                                      -   - Ollama for local models
                                                                                                          -   - LM Studio support
                                                                                                              -   - Priority fallback system
                                                                                                                  - - **Time Tracking**: Estimates vs actuals tracking
                                                                                                                    - - **Comments & Discussions**: Rich text comments on tasks
                                                                                                                      - - **Activity Feeds**: Comprehensive audit trail
                                                                                                                        - - **Documentation**:
                                                                                                                          -   - README with full feature overview
                                                                                                                              -   - CONTRIBUTING guide for developers
                                                                                                                                  -   - SECURITY policy with vulnerability reporting
                                                                                                                                      -   - CODE_OF_CONDUCT for community standards
                                                                                                                                       
                                                                                                                                          - ### Technical Stack
                                                                                                                                          - - **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Shadcn/ui
                                                                                                                                            - - **Backend**: Node.js 22, Fastify, tRPC v10, Socket.io
                                                                                                                                              - - **Database**: PostgreSQL 15, Prisma ORM
                                                                                                                                                - - **Monorepo**: pnpm workspaces, Turborepo
                                                                                                                                                  - - **Deployment**: Docker & Docker Compose
                                                                                                                                                   
                                                                                                                                                    - ### Known Limitations
                                                                                                                                                    - - Single-instance deployment only (multi-instance coming in v0.2.0)
                                                                                                                                                      - - Some edge cases in permission calculations (will be fixed)
                                                                                                                                                        - - Discord integration not yet available
                                                                                                                                                          - - Advanced reporting in progress
                                                                                                                                                           
                                                                                                                                                            - ### Breaking Changes
                                                                                                                                                            - None - Initial beta release
                                                                                                                                                           
                                                                                                                                                            - ## Roadmap
                                                                                                                                                           
                                                                                                                                                            - ### Version 0.2.0 (Q2 2026)
                                                                                                                                                            - - [ ] Multi-instance Redis support
                                                                                                                                                              - [ ] - [ ] Performance optimization
                                                                                                                                                              - [ ] - [ ] Advanced permission edge cases fixed
                                                                                                                                                              - [ ] - [ ] Knowledge graph wiki improvements
                                                                                                                                                              - [ ] - [ ] Email notifications
                                                                                                                                                             
                                                                                                                                                              - [ ] ### Version 0.3.0 (Q3 2026)
                                                                                                                                                              - [ ] - [ ] Discord integration
                                                                                                                                                              - [ ] - [ ] Slack integration
                                                                                                                                                              - [ ] - [ ] Advanced reporting dashboard
                                                                                                                                                              - [ ] - [ ] Custom fields system
                                                                                                                                                              - [ ] - [ ] Template system
                                                                                                                                                             
                                                                                                                                                              - [ ] ### Version 1.0.0 (Q4 2026)
                                                                                                                                                              - [ ] - [ ] API v2 with GraphQL
                                                                                                                                                              - [ ] - [ ] Enterprise features
                                                                                                                                                              - [ ] - [ ] Advanced analytics
                                                                                                                                                              - [ ] - [ ] Team workload optimization
                                                                                                                                                              - [ ] - [ ] Production-ready stability
                                                                                                                                                             
                                                                                                                                                              - [ ] ## Contributing
                                                                                                                                                             
                                                                                                                                                              - [ ] We appreciate all contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.
                                                                                                                                                             
                                                                                                                                                              - [ ] ## Security
                                                                                                                                                             
                                                                                                                                                              - [ ] For security-related concerns, see [SECURITY.md](SECURITY.md) for responsible disclosure process.
                                                                                                                                                             
                                                                                                                                                              - [ ] ## License
                                                                                                                                                             
                                                                                                                                                              - [ ] Licensed under [AGPL-3.0](LICENSE) - See LICENSE file for details.
