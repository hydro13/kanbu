# Contributing to Kanbu

Thank you for your interest in contributing to Kanbu! This document provides guidelines and instructions for contributing.

## How to Contribute

### Reporting Bugs

Before creating a bug report, please check the issue tracker to ensure the bug hasn't already been reported.

When creating a bug report, include:

- **Clear title** describing the issue
- **Detailed description** of the problem
- **Steps to reproduce** the behavior
- **Expected behavior** vs actual behavior
- **Screenshots or logs** if applicable
- **Environment** information (OS, Node version, etc.)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub Issues. When suggesting an enhancement:

- Use a clear title describing the suggestion
- Provide a detailed description with use cases
- List any alternatives you've considered

### Pull Requests

1. **Fork** the repository
2. **Create a branch** for your feature or fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes** and ensure:
   - Code follows the project's style guidelines
   - All tests pass: `pnpm test`
   - No linting issues: `pnpm lint`
   - TypeScript compiles: `pnpm typecheck`
4. **Commit** your changes with clear messages:
   ```bash
   git commit -m "fix: description of fix"
   git commit -m "feat: description of feature"
   git commit -m "docs: description of docs"
   ```
5. **Push** to your fork and **submit a Pull Request**

### Development Setup

```bash
# Clone the repository
git clone https://github.com/hydro13/kanbu.git
cd kanbu

# Install dependencies
pnpm install

# Setup database
cd packages/shared
pnpm db:generate
pnpm db:push
cd ../..

# Start development
pnpm dev
```

### Project Structure

- `apps/api/` - Backend (Fastify, tRPC, Socket.io)
- `apps/web/` - Frontend (React, Vite, TypeScript)
- `packages/shared/` - Database schema and shared types
- `packages/mcp-server/` - Claude Code integration
- `docker/` - Docker deployment configurations

### Code Standards

- Use **TypeScript** for all code
- Follow **Prettier** formatting (auto-formatted on commit)
- Use **ESLint** standards
- Write clear commit messages
- Add tests for new features

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:

- `feat(api): add new permission validation`
- `fix(web): resolve kanban board drag issue`
- `docs: update setup instructions`

### Testing

Run tests with:

```bash
pnpm test
```

All contributions should include tests. Aim for at least 80% coverage.

## Community

- **Issues**: Report bugs and suggest features via GitHub Issues
- **Discussions**: Ask questions and discuss ideas in GitHub Discussions
- **Email**: Reach out to R.Waslander@gmail.com for questions

## License

By contributing to Kanbu, you agree that your contributions will be licensed under its AGPL-3.0 License.

## Questions?

Feel free to open an issue or discussion if you have any questions about contributing. We're here to help!
