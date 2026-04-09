import { describe, expect, it } from 'vitest'
import { buildImportPrompt } from './buildImportPrompt'

describe('buildImportPrompt', () => {
  it('builds chunked import prompt for a document draft', () => {
    const result = buildImportPrompt({
      subjectKey: 'english',
      documentDraft: {
        fileName: 'paper.pdf',
        sourceType: 'pdf',
        plainText: 'x'.repeat(10000),
        pages: [
          { page: 1, text: 'A'.repeat(3800) },
          { page: 2, text: 'B'.repeat(3800) },
          { page: 3, text: 'C'.repeat(3800) },
        ],
        outline: [{ text: 'Part I Grammar', page: 1 }],
      },
      chunkOptions: {
        maxCharsPerChunk: 3000,
        maxIncludedChunks: 2,
        maxTotalChars: 7000,
      },
    })

    expect(result.subjectMeta.key).toBe('english')
    expect(result.chunkSelection.selectedChunks.length).toBeLessThanOrEqual(2)
    expect(result.userPrompt).toContain('allowed_question_types')
    expect(result.systemPrompt).toContain('单个 JSON 对象')
    expect(result.warnings.length).toBeGreaterThan(0)
  })
})
