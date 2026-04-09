import { describe, expect, it } from 'vitest'
import { buildImportPreview } from './buildImportPreview'

describe('buildImportPreview', () => {
  it('builds preview summary from normalized document', () => {
    const preview = buildImportPreview({
      subjectKey: 'english',
      warnings: ['文档较长'],
      invalidReasons: ['已跳过 1 道'],
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
  })
})
