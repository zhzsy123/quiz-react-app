import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestAiJsonMock } = vi.hoisted(() => ({
  requestAiJsonMock: vi.fn(),
}))

vi.mock('../../shared/api/aiGateway.js', () => ({
  requestAiJson: requestAiJsonMock,
}))

import { gradeRelationalAlgebraAttempt } from './reviewService.js'

describe('reviewService relational algebra grading', () => {
  beforeEach(() => {
    requestAiJsonMock.mockReset()
  })

  it('grades each relational algebra subquestion independently with normalized payloads', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          verdict: 'correct',
          equivalent: true,
          score: 5,
          max_score: 5,
          confidence: 98,
          missing_points: [],
          error_points: [],
          comment: 'Equivalent.',
        },
        model: 'deepseek-reasoner',
      })
      .mockResolvedValueOnce({
        content: {
          verdict: 'incorrect',
          equivalent: false,
          score: 0,
          max_score: 5,
          confidence: 94,
          missing_points: ['Missing selection on course name'],
          error_points: ['Projection target does not match'],
          comment: 'Not equivalent.',
        },
        model: 'deepseek-reasoner',
      })

    const result = await gradeRelationalAlgebraAttempt({
      quiz: {
        title: 'Database theory quiz',
        subject: 'database_principles',
        items: [
          {
            id: 'ra_1',
            type: 'relational_algebra',
            score: 10,
            prompt: 'Use relational algebra to answer.',
            schemas: [
              {
                name: '学生',
                attributes: ['学号', '姓名'],
              },
            ],
            subquestions: [
              {
                id: '1',
                label: '（1）',
                prompt: '检索英语专业学生信息。',
                score: 5,
                reference_answer: "Π[学号,姓名](σ[专业='英语'](学生 JOIN 学习))",
              },
              {
                id: '2',
                label: '（2）',
                prompt: '检索数据库原理课程高分学生。',
                score: 5,
                reference_answer: "Π[学号,姓名](σ[名称='数据库原理'](学生 JOIN 学习 JOIN 课程))",
              },
            ],
          },
        ],
      },
      answers: {
        ra_1: {
          responses: {
            1: "PI [ 学号 , 姓名 ] ( sigma [ 专业 = '英语' ] ( 学生 JOIN 学习 ) )",
            2: "Π[学号,姓名](σ[名称='数据库原理'](学生⋈学习⋈课程))",
          },
        },
      },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(2)
    expect(requestAiJsonMock.mock.calls[0][0].feature).toBe('relational_algebra_grading')
    expect(requestAiJsonMock.mock.calls[0][0].temperature).toBe(0.1)
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toMatch(/"question_id":\s*"ra_1:1"/)
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toContain("Π[学号,姓名](σ[专业='英语'](学生⋈学习))")
    expect(requestAiJsonMock.mock.calls[1][0].userPrompt).toContain(
      "Π[学号,姓名](σ[名称='数据库原理'](学生⋈学习⋈课程))"
    )

    expect(result.status).toBe('completed')
    expect(result.totalRelationalAlgebraScore).toBe(5)
    expect(result.totalScore).toBe(5)
    expect(result.questionReviews['ra_1:1']).toEqual(
      expect.objectContaining({
        questionId: 'ra_1:1',
        subquestionId: '1',
        score: 5,
        maxScore: 5,
        verdict: 'correct',
        equivalent: true,
      })
    )
    expect(result.questionReviews['ra_1:2']).toEqual(
      expect.objectContaining({
        questionId: 'ra_1:2',
        subquestionId: '2',
        score: 0,
        maxScore: 5,
        verdict: 'incorrect',
        equivalent: false,
      })
    )
  })

  it('skips unanswered relational algebra subquestions without calling AI', async () => {
    const result = await gradeRelationalAlgebraAttempt({
      quiz: {
        title: 'Database theory quiz',
        subject: 'database_principles',
        items: [
          {
            id: 'ra_2',
            type: 'relational_algebra',
            score: 5,
            prompt: 'Use relational algebra to answer.',
            subquestions: [
              {
                id: '1',
                prompt: 'Do something.',
                score: 5,
                reference_answer: 'Π[学号](学生)',
              },
            ],
          },
        ],
      },
      answers: {
        ra_2: {
          responses: {
            1: '   ',
          },
        },
      },
    })

    expect(requestAiJsonMock).not.toHaveBeenCalled()
    expect(result.questionReviews['ra_2:1']).toEqual(
      expect.objectContaining({
        verdict: 'unanswered',
        equivalent: false,
        score: 0,
      })
    )
    expect(result.totalRelationalAlgebraScore).toBe(0)
  })
})
