/**
 * Unit Tests: Community Summarization (Fase 24.4)
 *
 * Tests for community summarization prompt utilities.
 * Tests prompt generation and response parsing for hierarchical summarization
 * and community name generation.
 *
 * @author Robin Waslander <R.Waslander@gmail.com>
 * @date 2026-01-15
 */

import { describe, it, expect } from 'vitest'
import {
  getSummarizePairSystemPrompt,
  getSummarizePairUserPrompt,
  parseSummarizePairResponse,
  getGenerateCommunityNameSystemPrompt,
  getGenerateCommunityNameUserPrompt,
  parseGenerateCommunityNameResponse,
} from './communitySummarization'

describe('communitySummarization', () => {
  // ===========================================================================
  // Pair-wise Summarization Tests
  // ===========================================================================

  describe('getSummarizePairSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getSummarizePairSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should contain key instructions', () => {
      const prompt = getSummarizePairSystemPrompt()
      expect(prompt).toContain('summaries')
      expect(prompt).toContain('combine')
      expect(prompt).toContain('merge')
    })

    it('should mention important guidelines', () => {
      const prompt = getSummarizePairSystemPrompt()
      expect(prompt).toContain('redundancy')
      expect(prompt).toContain('facts')
      expect(prompt).toContain('concise')
    })
  })

  describe('getSummarizePairUserPrompt', () => {
    it('should format two summaries correctly', () => {
      const prompt = getSummarizePairUserPrompt({
        summaries: [
          'Summary A: React developer with 5 years experience',
          'Summary B: TypeScript expert working on frontend',
        ],
      })

      expect(prompt).toContain('<SUMMARY 1>')
      expect(prompt).toContain('React developer with 5 years experience')
      expect(prompt).toContain('<SUMMARY 2>')
      expect(prompt).toContain('TypeScript expert working on frontend')
    })

    it('should include JSON format instructions', () => {
      const prompt = getSummarizePairUserPrompt({
        summaries: ['First summary', 'Second summary'],
      })

      expect(prompt).toContain('JSON')
      expect(prompt).toContain('"summary"')
    })

    it('should handle empty summaries', () => {
      const prompt = getSummarizePairUserPrompt({
        summaries: ['', ''],
      })

      expect(prompt).toContain('<SUMMARY 1>')
      expect(prompt).toContain('<SUMMARY 2>')
    })

    it('should handle long summaries', () => {
      const longSummary = 'A'.repeat(1000)
      const prompt = getSummarizePairUserPrompt({
        summaries: [longSummary, 'Short summary'],
      })

      expect(prompt).toContain(longSummary)
      expect(prompt).toContain('Short summary')
    })
  })

  describe('parseSummarizePairResponse', () => {
    it('should parse valid JSON response', () => {
      const response = `{
        "summary": "Combined frontend development team with React and TypeScript expertise"
      }`

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toBe(
        'Combined frontend development team with React and TypeScript expertise'
      )
    })

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Here's the combined summary:
\`\`\`json
{
  "summary": "Test combined summary"
}
\`\`\`
Done.`

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toBe('Test combined summary')
    })

    it('should handle markdown code blocks without language specifier', () => {
      const response = `\`\`\`
{
  "summary": "Another combined summary"
}
\`\`\``

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toBe('Another combined summary')
    })

    it('should fallback to entire response if JSON parsing fails', () => {
      const response = 'This is a plain text combined summary without JSON'

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toBe('This is a plain text combined summary without JSON')
    })

    it('should trim whitespace from summary', () => {
      const response = `{
        "summary": "  Summary with whitespace  "
      }`

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toBe('Summary with whitespace')
    })

    it('should throw error if summary is empty', () => {
      const response = `{
        "summary": ""
      }`

      expect(() => parseSummarizePairResponse(response)).toThrow()
    })

    it('should throw error if response is empty', () => {
      expect(() => parseSummarizePairResponse('')).toThrow()
      expect(() => parseSummarizePairResponse('   ')).toThrow()
    })

    it('should handle multiline summaries', () => {
      const response = `{
        "summary": "Line 1\\nLine 2\\nLine 3"
      }`

      const result = parseSummarizePairResponse(response)

      expect(result.summary).toContain('Line 1')
      expect(result.summary).toContain('Line 2')
    })
  })

  // ===========================================================================
  // Community Name Generation Tests
  // ===========================================================================

  describe('getGenerateCommunityNameSystemPrompt', () => {
    it('should return a non-empty string', () => {
      const prompt = getGenerateCommunityNameSystemPrompt()
      expect(prompt).toBeTruthy()
      expect(typeof prompt).toBe('string')
      expect(prompt.length).toBeGreaterThan(100)
    })

    it('should contain key instructions', () => {
      const prompt = getGenerateCommunityNameSystemPrompt()
      expect(prompt).toContain('name')
      expect(prompt).toContain('descriptive')
      expect(prompt).toContain('community')
    })

    it('should include good and bad examples', () => {
      const prompt = getGenerateCommunityNameSystemPrompt()
      expect(prompt).toContain('Good examples')
      expect(prompt).toContain('Bad examples')
    })

    it('should mention max length requirement', () => {
      const prompt = getGenerateCommunityNameSystemPrompt()
      expect(prompt).toContain('100')
    })
  })

  describe('getGenerateCommunityNameUserPrompt', () => {
    it('should format summary correctly', () => {
      const prompt = getGenerateCommunityNameUserPrompt({
        summary: 'A group of frontend developers working on React applications',
        topEntityNames: [],
      })

      expect(prompt).toContain('<COMMUNITY SUMMARY>')
      expect(prompt).toContain('frontend developers')
    })

    it('should include top entities when provided', () => {
      const prompt = getGenerateCommunityNameUserPrompt({
        summary: 'Development team summary',
        topEntityNames: ['React', 'TypeScript', 'Next.js'],
      })

      expect(prompt).toContain('<TOP ENTITIES>')
      expect(prompt).toContain('1. React')
      expect(prompt).toContain('2. TypeScript')
      expect(prompt).toContain('3. Next.js')
    })

    it('should not include top entities section when empty', () => {
      const prompt = getGenerateCommunityNameUserPrompt({
        summary: 'Test summary',
        topEntityNames: [],
      })

      expect(prompt).not.toContain('<TOP ENTITIES>')
    })

    it('should include JSON format instructions', () => {
      const prompt = getGenerateCommunityNameUserPrompt({
        summary: 'Test',
        topEntityNames: [],
      })

      expect(prompt).toContain('JSON')
      expect(prompt).toContain('"name"')
      expect(prompt).toContain('"description"')
    })

    it('should adjust wording based on whether top entities are provided', () => {
      const withEntities = getGenerateCommunityNameUserPrompt({
        summary: 'Test',
        topEntityNames: ['Entity1'],
      })
      const withoutEntities = getGenerateCommunityNameUserPrompt({
        summary: 'Test',
        topEntityNames: [],
      })

      expect(withEntities).toContain('and top entities')
      expect(withoutEntities).not.toContain('and top entities')
    })
  })

  describe('parseGenerateCommunityNameResponse', () => {
    it('should parse valid JSON response with name only', () => {
      const response = `{
        "name": "Frontend Development Team"
      }`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Frontend Development Team')
      expect(result.description).toBeUndefined()
    })

    it('should parse JSON with both name and description', () => {
      const response = `{
        "name": "Authentication & Security",
        "description": "Team focused on OAuth implementation and security best practices"
      }`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Authentication & Security')
      expect(result.description).toBe(
        'Team focused on OAuth implementation and security best practices'
      )
    })

    it('should parse JSON wrapped in markdown code blocks', () => {
      const response = `Here's the name:
\`\`\`json
{
  "name": "Marketing Campaign Q4"
}
\`\`\`
Done.`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Marketing Campaign Q4')
    })

    it('should truncate names exceeding 100 characters', () => {
      const longName = 'A'.repeat(150)
      const response = `{
        "name": "${longName}"
      }`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name.length).toBe(100)
      expect(result.name).toMatch(/\.\.\.$/)
    })

    it('should fallback to first line if JSON parsing fails', () => {
      const response = 'Community Name: Backend Services'

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Backend Services')
    })

    it('should remove common prefixes in fallback mode', () => {
      const response = 'Name: Test Community'

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Test Community')
    })

    it('should handle "Community:" prefix', () => {
      const response = 'Community: Infrastructure Team'

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Infrastructure Team')
    })

    it('should throw error if name is empty', () => {
      const response = `{
        "name": ""
      }`

      expect(() => parseGenerateCommunityNameResponse(response)).toThrow()
    })

    it('should throw error if response is empty', () => {
      expect(() => parseGenerateCommunityNameResponse('')).toThrow()
      expect(() => parseGenerateCommunityNameResponse('   ')).toThrow()
    })

    it('should trim whitespace from name and description', () => {
      const response = `{
        "name": "  Test Name  ",
        "description": "  Test Description  "
      }`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Test Name')
      expect(result.description).toBe('Test Description')
    })

    it('should omit description if empty string', () => {
      const response = `{
        "name": "Test Name",
        "description": ""
      }`

      const result = parseGenerateCommunityNameResponse(response)

      expect(result.name).toBe('Test Name')
      expect(result.description).toBeUndefined()
    })

    it('should truncate long names in fallback mode', () => {
      const longName = 'Title: ' + 'A'.repeat(150)

      const result = parseGenerateCommunityNameResponse(longName)

      expect(result.name.length).toBe(100)
      expect(result.name).toMatch(/\.\.\.$/)
    })
  })
})
