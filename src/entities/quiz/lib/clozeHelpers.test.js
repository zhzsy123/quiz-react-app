import { describe, expect, it } from 'vitest'
import { buildFallbackClozeArticle } from './clozeHelpers.js'

describe('clozeHelpers', () => {
  it('injects placeholders into article text using the correct option text', () => {
    const article =
      'In the heart of the bustling city, there lies a small, quiet park that serves as a refuge for many. It is a place where people can escape the noise and chaos of urban life, if only for a few moments.'
    const rawBlanks = [
      {
        blank_id: 1,
        options: [
          { key: 'A', text: 'refuge' },
          { key: 'B', text: 'obstacle' },
        ],
        correct: 'A',
      },
      {
        blank_id: 2,
        options: [
          { key: 'A', text: 'if only' },
          { key: 'B', text: 'even if' },
        ],
        correct: 'A',
      },
    ]

    const result = buildFallbackClozeArticle({ article }, rawBlanks)

    expect(result).toContain('[[1]]')
    expect(result).toContain('[[2]]')
    expect(result).not.toContain('refuge')
    expect(result).not.toContain('if only')
  })

  it('uses prompt lines as a fallback article when no article is present', () => {
    const result = buildFallbackClozeArticle(
      {},
      [
        { blank_id: 1, prompt: 'The city park offers a quiet place for residents to relax.' },
        { blank_id: 2, prompt: 'Local volunteers hope their efforts will inspire more people.' },
      ]
    )

    expect(result).toContain('[[1]]')
    expect(result).toContain('[[2]]')
    expect(result).toContain('The city park offers a quiet place for residents to relax.')
  })

  it('returns an empty article when a full passage exists but blank positions cannot be inferred', () => {
    const result = buildFallbackClozeArticle(
      {
        article:
          'In the heart of the bustling city, there lies a small, quiet park that serves as a safe shelter for many.',
      },
      [{ blank_id: 1, options: [{ key: 'A', text: 'refuge' }], correct: 'A' }]
    )

    expect(result).toBe('')
  })
})
