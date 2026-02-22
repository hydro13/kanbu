import { describe, it, expect } from 'vitest';
import { buildTaskMessage } from '../src/context.js';
import type { KanbuTaskContext } from '../src/types.js';

const base: KanbuTaskContext = {
  taskId: 'PROJ-42',
  taskTitle: 'Implement login page',
  projectName: 'Kanbu',
  workspaceName: 'GenX',
};

describe('buildTaskMessage()', () => {
  it('includes task ID, title, project and workspace', () => {
    const msg = buildTaskMessage(base);
    expect(msg).toContain('PROJ-42');
    expect(msg).toContain('Implement login page');
    expect(msg).toContain('Kanbu');
    expect(msg).toContain('GenX');
  });

  it('includes agent role when provided', () => {
    const msg = buildTaskMessage({ ...base, assignedAgentRole: 'developer' });
    expect(msg).toContain('developer');
  });

  it('includes description when provided', () => {
    const msg = buildTaskMessage({ ...base, taskDescription: 'Build the login form with OAuth' });
    expect(msg).toContain('Build the login form with OAuth');
  });

  it('includes wiki context section when provided', () => {
    const msg = buildTaskMessage({ ...base, wikiContext: ['## Auth design\nUse JWT tokens'] });
    expect(msg).toContain('Relevant Knowledge');
    expect(msg).toContain('JWT tokens');
  });

  it('includes graphiti context section when provided', () => {
    const msg = buildTaskMessage({ ...base, graphitiContext: '{"nodes":[{"id":"auth"}]}' });
    expect(msg).toContain('Knowledge Graph Context');
    expect(msg).toContain('"id":"auth"');
  });

  it('includes custom instructions when provided', () => {
    const msg = buildTaskMessage({ ...base, customInstructions: 'Write tests first.' });
    expect(msg).toContain('Instructions');
    expect(msg).toContain('Write tests first.');
  });

  it('omits optional sections when not provided', () => {
    const msg = buildTaskMessage(base);
    expect(msg).not.toContain('Relevant Knowledge');
    expect(msg).not.toContain('Knowledge Graph Context');
    expect(msg).not.toContain('Instructions');
    expect(msg).not.toContain('Your role');
  });

  it('always includes MCP tools reminder in footer', () => {
    const msg = buildTaskMessage(base);
    expect(msg).toContain('MCP tools');
  });

  it('includes all wiki pages when multiple provided', () => {
    const msg = buildTaskMessage({
      ...base,
      wikiContext: ['Page one content', 'Page two content'],
    });
    expect(msg).toContain('Page one content');
    expect(msg).toContain('Page two content');
  });
});
