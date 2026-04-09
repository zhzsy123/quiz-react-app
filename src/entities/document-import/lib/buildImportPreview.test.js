import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './buildImportPreview'

describe('buildImportPreview', () => {
  it('builds preview summary and carries diagnostics', () => {
    const preview = buildImportPreview({
      subjectKey: 'english',
      warnings: ['文档较长'],
      invalidReasons: ['已跳过 1 道'],
      diagnostics: {
        strategy: 'english_section_detection',
        ocrUsed: true,
        characterCount: 18000,
        pageCount: 3,
        sectionCount: 4,
        coverage: 0.91,
        skippedCount: 1,
        skippedTypes: ['cloze'],
        sections: [
          {
            key: 'reading_a',
            label: '阅读 A',
            targetQuestionTypes: ['reading'],
            itemCount: 1,
            repaired: true,
            warnings: ['至少一小题缺少标准答案'],
            sourceLength: 2500,
          },
        ],
      },
      normalizedDocument: {
        quiz: {
          title: '英语模拟卷',
          subject: 'english',
          items: [
            { id: 'q1', type: 'single_choice', prompt: '示例单选题题干', score: 2 },
            {
              id: 'q2',
              type: 'reading',
              prompt: '阅读材料',
              score: 8,
              passage: { content: 'This is a reading passage for import preview.' },
              questions: [{ id: 'q2-1' }, { id: 'q2-2' }],
            },
          ],
        },
        scoreBreakdown: {
          paperTotal: 150,
        },
      },
    })

    expect(preview.title).toBe('英语模拟卷')
    expect(preview.questionCount).toBe(2)
    expect(preview.totalScore).toBe(150)
    expect(preview.warningCount).toBe(1)
    expect(preview.invalidCount).toBe(1)
    expect(preview.typeStats).toHaveLength(2)
    expect(preview.questionPreviews).toHaveLength(2)
    expect(preview.questionPreviews[0].excerpt).toContain('示例单选题')
    expect(preview.questionPreviews[1].subQuestionCount).toBe(2)
    expect(preview.diagnostics.strategy).toBe('english_section_detection')
    expect(preview.diagnostics.sections[0].repaired).toBe(true)
  })
})

