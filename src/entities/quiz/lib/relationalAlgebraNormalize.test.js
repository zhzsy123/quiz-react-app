import { describe, expect, it } from 'vitest'
import {
  normalizeRelationalAlgebraExpression,
  normalizeRelationalAlgebraQuestion,
} from './relationalAlgebraNormalize.js'

describe('relationalAlgebraNormalize', () => {
  it('normalizes common operator aliases and whitespace', () => {
    expect(normalizeRelationalAlgebraExpression(' Π [ 学号 , 姓名 ] ( 学生 JOIN 学习 ∪ 课程 ) ')).toBe(
      'Π[学号,姓名](学生⋈学习∪课程)'
    )
  })

  it('normalizes question and subquestion structure', () => {
    const normalized = normalizeRelationalAlgebraQuestion({
      id: 'ra_1',
      type: 'relational_algebra',
      prompt: '  已知关系模式  ',
      schemas: [
        {
          name: ' 学生 ',
          attributes: [' 学号 ', ' 姓名 ', ' 学号 '],
        },
      ],
      questions: [
        {
          id: 1,
          prompt: '  检索  ',
          score: '5',
          reference_answer: ' project [ 学号 ] ( 学生 JOIN 学习 ) ',
        },
      ],
      tooling: {
        symbols: ['Π', 'Π', 'JOIN'],
        wrap_symbols: ['σ', 'σ'],
        default_join_symbol: ' JOIN ',
      },
    })

    expect(normalized.prompt).toBe('已知关系模式')
    expect(normalized.schemas).toEqual([
      {
        name: '学生',
        attributes: ['学号', '姓名'],
      },
    ])
    expect(normalized.subquestions).toHaveLength(1)
    expect(normalized.subquestions[0]).toEqual(
      expect.objectContaining({
        id: '1',
        prompt: '检索',
        score: 5,
        reference_answer: 'Π[学号](学生⋈学习)',
      })
    )
    expect(normalized.tooling).toEqual(
      expect.objectContaining({
        symbols: ['Π', 'JOIN'],
        wrap_symbols: ['σ'],
        default_join_symbol: 'JOIN',
      })
    )
    expect(normalized.questions).toEqual(normalized.subquestions)
  })
})
