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
          comment: '表达式语义等价。',
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
          missing_points: ['缺少对课程名称的筛选条件'],
          error_points: ['投影字段与题意不一致'],
          comment: '表达式与标准答案不等价。',
        },
        model: 'deepseek-reasoner',
      })

    const result = await gradeRelationalAlgebraAttempt({
      quiz: {
        title: '数据库理论练习卷',
        subject: 'database_principles',
        items: [
          {
            id: 'ra_1',
            type: 'relational_algebra',
            score: 10,
            prompt: '用关系代数回答问题。',
            schemas: [
              {
                name: 'Student',
                attributes: ['sid', 'name'],
              },
            ],
            subquestions: [
              {
                id: '1',
                label: '(1)',
                prompt: '查找英语专业学生。',
                score: 5,
                reference_answer: "π[sid,name](σ[major='English'](Student JOIN Enrollment))",
              },
              {
                id: '2',
                label: '(2)',
                prompt: '查找数据库课程高分学生。',
                score: 5,
                reference_answer: "π[sid,name](σ[title='Database'](Student JOIN Enrollment JOIN Course))",
              },
            ],
          },
        ],
      },
      answers: {
        ra_1: {
          responses: {
            1: "PI [ sid , name ] ( sigma [ major = 'English' ] ( Student JOIN Enrollment ) )",
            2: "π[sid,name](σ[title='Database'](Student⋈Enrollment⋈Course))",
          },
        },
      },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(2)
    expect(requestAiJsonMock.mock.calls[0][0].feature).toBe('relational_algebra_grading')
    expect(requestAiJsonMock.mock.calls[0][0].temperature).toBe(0.1)
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toMatch(/"question_id":\s*"ra_1:1"/)
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toContain("π[sid,name](σ[major='English'](Student⋈Enrollment))")
    expect(requestAiJsonMock.mock.calls[1][0].userPrompt).toContain(
      "π[sid,name](σ[title='Database'](Student⋈Enrollment⋈Course))"
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
        title: '数据库理论练习卷',
        subject: 'database_principles',
        items: [
          {
            id: 'ra_2',
            type: 'relational_algebra',
            score: 5,
            prompt: '用关系代数回答问题。',
            subquestions: [
              {
                id: '1',
                prompt: '执行查询。',
                score: 5,
                reference_answer: 'π[sid](Student)',
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
