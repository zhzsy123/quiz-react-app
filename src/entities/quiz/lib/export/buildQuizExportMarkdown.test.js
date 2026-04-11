import { describe, expect, it } from 'vitest'
import { buildQuizExportMarkdown } from './buildQuizExportMarkdown'

describe('buildQuizExportMarkdown', () => {
  it('builds a readable markdown export for mixed quiz content', () => {
    const markdown = buildQuizExportMarkdown({
      entry: { title: '英语试卷', subject: 'english' },
      quiz: {
        subject: 'english',
        items: [
          {
            id: 'q1',
            type: 'single_choice',
            score: 2,
            prompt: '选择正确答案',
            options: [
              { key: 'A', text: '选项 A' },
              { key: 'B', text: '选项 B' },
            ],
            answer: {
              correct: 'A',
              rationale: '因为 A 正确。',
            },
          },
        ],
      },
      answers: { q1: 'B' },
      submitted: true,
      score: 0,
      paperTotalScore: 2,
    })

    expect(markdown).toContain('# 英语试卷')
    expect(markdown).toContain('状态：已交卷')
    expect(markdown).toContain('你的答案：B')
    expect(markdown).toContain('参考答案：A')
    expect(markdown).toContain('解析：因为 A 正确。')
  })
})
