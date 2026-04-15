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
    expect(markdown).toContain('状态：已提交')
    expect(markdown).toContain('你的答案：B')
    expect(markdown).toContain('参考答案：A')
    expect(markdown).toContain('解析：因为 A 正确。')
  })

  it('exports top-level fill blank answers with per-blank reference answers', () => {
    const markdown = buildQuizExportMarkdown({
      entry: { title: '数据结构试卷', subject: 'data_structure' },
      quiz: {
        subject: 'data_structure',
        items: [
          {
            id: 'fb1',
            type: 'fill_blank',
            score: 4,
            prompt: '栈遵循 ___，队列遵循 ___。',
            blanks: [
              {
                blank_id: 'blank_1',
                accepted_answers: ['后进先出', 'LIFO'],
                rationale: '栈的核心特征是后进先出。',
              },
              {
                blank_id: 'blank_2',
                accepted_answers: ['先进先出', 'FIFO'],
                rationale: '队列的核心特征是先进先出。',
              },
            ],
          },
        ],
      },
      answers: {
        fb1: {
          blank_1: '后进先出',
          blank_2: '先进先出',
        },
      },
      submitted: true,
      score: 4,
      paperTotalScore: 4,
    })

    expect(markdown).toContain('## 第 1 题')
    expect(markdown).toContain('#### 第 1 空')
    expect(markdown).toContain('你的答案：后进先出')
    expect(markdown).toContain('参考答案：后进先出 / LIFO')
    expect(markdown).toContain('#### 第 2 空')
    expect(markdown).toContain('你的答案：先进先出')
    expect(markdown).toContain('参考答案：先进先出 / FIFO')
  })

  it('exports fill blank subquestions inside composite items', () => {
    const markdown = buildQuizExportMarkdown({
      entry: { title: '数据库综合题', subject: 'database_principles' },
      quiz: {
        subject: 'database_principles',
        items: [
          {
            id: 'comp1',
            type: 'composite',
            score: 6,
            prompt: '根据材料回答问题。',
            questions: [
              {
                id: 'sub_fill',
                type: 'fill_blank',
                prompt: '关系模型的三类完整性约束包括 ___ 和 ___。',
                blanks: [
                  {
                    blank_id: 'b1',
                    accepted_answers: ['实体完整性'],
                    rationale: '实体完整性保证主键非空且唯一。',
                  },
                  {
                    blank_id: 'b2',
                    accepted_answers: ['参照完整性'],
                    rationale: '参照完整性保证外键引用有效。',
                  },
                ],
              },
            ],
          },
        ],
      },
      answers: {
        comp1: {
          sub_fill: {
            b1: '实体完整性',
            b2: '参照完整性',
          },
        },
      },
      submitted: true,
      score: 6,
      paperTotalScore: 6,
    })

    expect(markdown).toContain('### 根据材料回答问题。')
    expect(markdown).toContain('#### 关系模型的三类完整性约束包括 ___ 和 ___。')
    expect(markdown).toContain('你的答案：实体完整性')
    expect(markdown).toContain('你的答案：参照完整性')
    expect(markdown).toContain('参考答案：实体完整性')
    expect(markdown).toContain('参考答案：参照完整性')
  })
})
