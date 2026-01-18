/*
 * AI Service
 * Version: 1.0.0
 *
 * AI-powered features for GitHub integration.
 * Supports Anthropic Claude and OpenAI providers.
 *
 * =============================================================================
 * AI Architect: Robin Waslander <R.Waslander@gmail.com>
 * Claude Code: Opus 4.5
 * Host: MAX
 * Date: 2026-01-09
 * Fase: 16 - AI/Claude Integratie
 * =============================================================================
 */

import Anthropic from '@anthropic-ai/sdk';

// =============================================================================
// Types
// =============================================================================

export type AIProvider = 'anthropic' | 'openai';

export interface AIConfig {
  provider: AIProvider;
  anthropicApiKey?: string;
  anthropicModel?: string;
  openaiApiKey?: string;
  openaiModel?: string;
}

export interface PRSummaryInput {
  title: string;
  commits: Array<{
    sha: string;
    message: string;
    author: string;
  }>;
  diff?: string;
  baseBranch: string;
  headBranch: string;
}

export interface PRSummary {
  summary: string;
  keyChanges: string[];
  breakingChanges: string[];
  affectedAreas: string[];
  suggestedReviewers?: string[];
}

export interface CodeReviewInput {
  diff: string;
  language?: string;
  context?: string;
}

export interface CodeReviewSuggestion {
  type: 'security' | 'performance' | 'style' | 'bug' | 'complexity' | 'suggestion';
  severity: 'info' | 'warning' | 'error';
  file?: string;
  line?: number;
  message: string;
  suggestion?: string;
}

export interface CodeReviewResult {
  suggestions: CodeReviewSuggestion[];
  overallAssessment: string;
  score: number; // 0-100
}

export interface ReleaseNotesInput {
  projectName: string;
  version?: string;
  prs: Array<{
    number: number;
    title: string;
    body?: string;
    author: string;
    labels?: string[];
    mergedAt: string;
  }>;
  previousVersion?: string;
}

export interface ReleaseNotes {
  title: string;
  summary: string;
  sections: {
    features: string[];
    fixes: string[];
    improvements: string[];
    breaking: string[];
    other: string[];
  };
  contributors: string[];
  markdown: string;
}

export interface CommitMessageInput {
  files: Array<{
    path: string;
    status: 'added' | 'modified' | 'deleted' | 'renamed';
    diff?: string;
  }>;
  context?: string;
}

export interface CommitMessage {
  title: string;
  body?: string;
  type: 'feat' | 'fix' | 'refactor' | 'docs' | 'style' | 'test' | 'chore';
  scope?: string;
  full: string;
}

// =============================================================================
// Configuration
// =============================================================================

function getConfig(): AIConfig {
  return {
    provider: (process.env.AI_PROVIDER as AIProvider) || 'anthropic',
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  };
}

/**
 * Check if AI service is configured and available
 */
export function isAIConfigured(): boolean {
  const config = getConfig();
  if (config.provider === 'anthropic') {
    return !!config.anthropicApiKey;
  }
  if (config.provider === 'openai') {
    return !!config.openaiApiKey;
  }
  return false;
}

/**
 * Get the current AI provider name
 */
export function getAIProvider(): AIProvider | null {
  if (!isAIConfigured()) return null;
  return getConfig().provider;
}

// =============================================================================
// Anthropic Client
// =============================================================================

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const config = getConfig();
    if (!config.anthropicApiKey) {
      throw new Error('Anthropic API key not configured');
    }
    anthropicClient = new Anthropic({
      apiKey: config.anthropicApiKey,
    });
  }
  return anthropicClient;
}

// =============================================================================
// Core AI Request Function
// =============================================================================

async function aiRequest(
  systemPrompt: string,
  userPrompt: string,
  options: { maxTokens?: number; temperature?: number } = {}
): Promise<string> {
  const config = getConfig();
  const { maxTokens = 2048, temperature = 0.3 } = options;

  if (config.provider === 'anthropic') {
    const client = getAnthropicClient();
    const response = await client.messages.create({
      model: config.anthropicModel || 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      temperature,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text response from AI');
    }
    return textBlock.text;
  }

  if (config.provider === 'openai') {
    // OpenAI implementation
    if (!config.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel || 'gpt-4o',
        max_tokens: maxTokens,
        temperature,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
    };
    return data.choices[0]?.message?.content || '';
  }

  throw new Error(`Unsupported AI provider: ${config.provider}`);
}

// =============================================================================
// PR Summary Generation
// =============================================================================

const PR_SUMMARY_SYSTEM = `You are an expert code reviewer. Generate a concise PR summary based on the provided commits and changes.

Output format (JSON):
{
  "summary": "Brief 1-2 sentence summary of the changes",
  "keyChanges": ["Change 1", "Change 2"],
  "breakingChanges": ["Breaking change 1"] or [],
  "affectedAreas": ["Area 1", "Area 2"]
}

Be concise and technical. Focus on what changed and why it matters.`;

export async function generatePRSummary(input: PRSummaryInput): Promise<PRSummary> {
  if (!isAIConfigured()) {
    throw new Error('AI service not configured');
  }

  const commitList = input.commits
    .map((c) => `- ${c.sha.substring(0, 7)}: ${c.message} (${c.author})`)
    .join('\n');

  const userPrompt = `PR: ${input.title}
Branch: ${input.headBranch} -> ${input.baseBranch}

Commits:
${commitList}

${input.diff ? `\nDiff (truncated to 10000 chars):\n${input.diff.substring(0, 10000)}` : ''}`;

  const response = await aiRequest(PR_SUMMARY_SYSTEM, userPrompt, {
    maxTokens: 1024,
    temperature: 0.2,
  });

  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim()) as {
      summary: string;
      keyChanges: string[];
      breakingChanges: string[];
      affectedAreas: string[];
    };
    return {
      summary: parsed.summary || '',
      keyChanges: parsed.keyChanges || [],
      breakingChanges: parsed.breakingChanges || [],
      affectedAreas: parsed.affectedAreas || [],
    };
  } catch {
    // Fallback: return the raw response as summary
    return {
      summary: response.substring(0, 500),
      keyChanges: [],
      breakingChanges: [],
      affectedAreas: [],
    };
  }
}

// =============================================================================
// Code Review Assistance
// =============================================================================

const CODE_REVIEW_SYSTEM = `You are an expert code reviewer. Analyze the provided code diff and provide constructive feedback.

Focus on:
- Security vulnerabilities (SQL injection, XSS, etc.)
- Performance issues
- Code style and best practices
- Potential bugs
- Code complexity

Output format (JSON):
{
  "suggestions": [
    {
      "type": "security|performance|style|bug|complexity|suggestion",
      "severity": "info|warning|error",
      "file": "path/to/file.ts",
      "line": 42,
      "message": "Description of the issue",
      "suggestion": "How to fix it (optional)"
    }
  ],
  "overallAssessment": "Brief overall assessment",
  "score": 85
}

Be constructive and specific. Only mention actual issues, not theoretical ones.`;

export async function reviewCode(input: CodeReviewInput): Promise<CodeReviewResult> {
  if (!isAIConfigured()) {
    throw new Error('AI service not configured');
  }

  const userPrompt = `${input.context ? `Context: ${input.context}\n\n` : ''}${input.language ? `Language: ${input.language}\n\n` : ''}Diff to review:
${input.diff.substring(0, 15000)}`;

  const response = await aiRequest(CODE_REVIEW_SYSTEM, userPrompt, {
    maxTokens: 2048,
    temperature: 0.2,
  });

  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim()) as {
      suggestions: CodeReviewSuggestion[];
      overallAssessment: string;
      score: number;
    };
    return {
      suggestions: parsed.suggestions || [],
      overallAssessment: parsed.overallAssessment || '',
      score: typeof parsed.score === 'number' ? parsed.score : 70,
    };
  } catch {
    return {
      suggestions: [],
      overallAssessment: response.substring(0, 500),
      score: 70,
    };
  }
}

// =============================================================================
// Release Notes Generation
// =============================================================================

const RELEASE_NOTES_SYSTEM = `You are a technical writer creating release notes. Generate clear, well-organized release notes from the provided merged PRs.

Output format (JSON):
{
  "title": "Release title",
  "summary": "Brief summary of this release",
  "sections": {
    "features": ["New feature 1", "New feature 2"],
    "fixes": ["Bug fix 1"],
    "improvements": ["Improvement 1"],
    "breaking": ["Breaking change 1"],
    "other": ["Other change 1"]
  },
  "contributors": ["username1", "username2"]
}

Categorize PRs based on their title prefixes (feat, fix, refactor, etc.) or content.
Be concise but informative.`;

export async function generateReleaseNotes(input: ReleaseNotesInput): Promise<ReleaseNotes> {
  if (!isAIConfigured()) {
    throw new Error('AI service not configured');
  }

  const prList = input.prs
    .map(
      (pr) =>
        `#${pr.number}: ${pr.title} by @${pr.author}${pr.labels?.length ? ` [${pr.labels.join(', ')}]` : ''}`
    )
    .join('\n');

  const userPrompt = `Project: ${input.projectName}
${input.version ? `Version: ${input.version}` : ''}
${input.previousVersion ? `Previous: ${input.previousVersion}` : ''}

Merged PRs:
${prList}`;

  const response = await aiRequest(RELEASE_NOTES_SYSTEM, userPrompt, {
    maxTokens: 2048,
    temperature: 0.3,
  });

  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim()) as {
      title: string;
      summary: string;
      sections: {
        features: string[];
        fixes: string[];
        improvements: string[];
        breaking: string[];
        other: string[];
      };
      contributors: string[];
    };

    // Generate markdown
    const markdown = generateReleaseMarkdown(parsed, input);

    return {
      ...parsed,
      markdown,
    };
  } catch {
    // Fallback
    const contributors = [...new Set(input.prs.map((pr) => pr.author))];
    return {
      title: input.version ? `Release ${input.version}` : 'New Release',
      summary: response.substring(0, 500),
      sections: {
        features: [],
        fixes: [],
        improvements: [],
        breaking: [],
        other: input.prs.map((pr) => `#${pr.number}: ${pr.title}`),
      },
      contributors,
      markdown: response,
    };
  }
}

function generateReleaseMarkdown(
  notes: Omit<ReleaseNotes, 'markdown'>,
  input: ReleaseNotesInput
): string {
  const lines: string[] = [];

  lines.push(`# ${notes.title}`);
  lines.push('');
  lines.push(notes.summary);
  lines.push('');

  if (notes.sections.breaking.length > 0) {
    lines.push('## Breaking Changes');
    notes.sections.breaking.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (notes.sections.features.length > 0) {
    lines.push('## New Features');
    notes.sections.features.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (notes.sections.fixes.length > 0) {
    lines.push('## Bug Fixes');
    notes.sections.fixes.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (notes.sections.improvements.length > 0) {
    lines.push('## Improvements');
    notes.sections.improvements.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (notes.sections.other.length > 0) {
    lines.push('## Other Changes');
    notes.sections.other.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (notes.contributors.length > 0) {
    lines.push('## Contributors');
    lines.push('');
    lines.push(
      `Thanks to ${notes.contributors.map((c) => `@${c}`).join(', ')} for their contributions!`
    );
    lines.push('');
  }

  lines.push('---');
  lines.push(`*Release notes generated for ${input.projectName}*`);

  return lines.join('\n');
}

// =============================================================================
// Commit Message Generation
// =============================================================================

const COMMIT_MESSAGE_SYSTEM = `You are a developer creating a git commit message. Follow conventional commits format.

Types: feat, fix, refactor, docs, style, test, chore

Output format (JSON):
{
  "type": "feat|fix|refactor|docs|style|test|chore",
  "scope": "optional scope",
  "title": "Commit title (imperative mood, max 72 chars)",
  "body": "Optional longer description"
}

Be concise and descriptive. Use imperative mood (add, fix, update, not added, fixed, updated).`;

export async function generateCommitMessage(input: CommitMessageInput): Promise<CommitMessage> {
  if (!isAIConfigured()) {
    throw new Error('AI service not configured');
  }

  const fileList = input.files
    .map((f) => `${f.status}: ${f.path}${f.diff ? `\n${f.diff.substring(0, 500)}` : ''}`)
    .join('\n\n');

  const userPrompt = `${input.context ? `Context: ${input.context}\n\n` : ''}Changed files:
${fileList.substring(0, 8000)}`;

  const response = await aiRequest(COMMIT_MESSAGE_SYSTEM, userPrompt, {
    maxTokens: 512,
    temperature: 0.2,
  });

  try {
    const jsonMatch = response.match(/```json\n?([\s\S]*?)\n?```/) || [null, response];
    const jsonStr = jsonMatch[1] || response;
    const parsed = JSON.parse(jsonStr.trim()) as {
      type: CommitMessage['type'];
      scope?: string;
      title: string;
      body?: string;
    };

    const full = parsed.scope
      ? `${parsed.type}(${parsed.scope}): ${parsed.title}${parsed.body ? `\n\n${parsed.body}` : ''}`
      : `${parsed.type}: ${parsed.title}${parsed.body ? `\n\n${parsed.body}` : ''}`;

    return {
      type: parsed.type || 'chore',
      scope: parsed.scope,
      title: parsed.title || 'Update code',
      body: parsed.body,
      full,
    };
  } catch {
    return {
      type: 'chore',
      title: 'Update code',
      full: 'chore: Update code',
    };
  }
}

// =============================================================================
// Service Object Export
// =============================================================================

export const aiService = {
  isConfigured: isAIConfigured,
  getProvider: getAIProvider,
  generatePRSummary,
  reviewCode,
  generateReleaseNotes,
  generateCommitMessage,
};

export default aiService;
