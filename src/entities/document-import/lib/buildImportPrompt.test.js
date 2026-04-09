import { describe, expect, it } from 'vitest'
import { buildImportPrompt } from './buildImportPrompt'

describe('buildImportPrompt', () => {
  it('为英语文档构建带协议 v2 的分段导入 prompt', () => {
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
    expect(result.userPrompt).toContain('"allowed_question_types"')
    expect(result.userPrompt).toContain('"version": "english-import-v2"')
    expect(result.userPrompt).toContain('"single_choice"')
    expect(result.userPrompt).toContain('"cloze"')
    expect(result.systemPrompt).toContain('英语试卷 AI 清洗协议 v2')
    expect(result.systemPrompt).toContain('完形填空必须在 article 中嵌入 [[1]]、[[2]]')
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('supports section-level target question types for english import', () => {
    const result = buildImportPrompt({
      subjectKey: 'english',
      sectionLabel: '阅读 A',
      targetQuestionTypes: ['reading'],
      documentDraft: {
        fileName: 'reading-a.pdf',
        sourceType: 'pdf',
        plainText: 'Passage A\nRead Passage A and answer the questions.',
      },
    })

    expect(result.userPrompt).toContain('"section_label": "阅读 A"')
    expect(result.userPrompt).toContain('"allowed_question_types": [')
    expect(result.userPrompt).toContain('"reading"')
    expect(result.systemPrompt).toContain('当前只解析英语试卷中的一个局部 section：阅读 A。')
    expect(result.systemPrompt).toContain('本次 section 仅允许输出这些题型：reading。')
  })
})
