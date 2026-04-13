import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestAiJsonMock } = vi.hoisted(() => ({
  requestAiJsonMock: vi.fn(),
}))

vi.mock('../../shared/api/aiGateway.js', () => ({
  requestAiJson: requestAiJsonMock,
}))

import { auditQuizQuestionCompliance, gradeRelationalAlgebraAttempt } from './reviewService.js'

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
          completion: 100,
          confidence: 98,
          earned_points: ['投影字段正确', '筛选条件正确'],
          missing_points: [],
          error_points: [],
          comment: '表达式与参考答案语义等价。',
        },
        model: 'deepseek-reasoner',
      })
      .mockResolvedValueOnce({
        content: {
          verdict: 'incorrect',
          equivalent: false,
          score: 0,
          max_score: 5,
          completion: 20,
          confidence: 94,
          earned_points: ['连接关系基本正确'],
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
                reference_answer: "Π[sid,name](σ[major='English'](Student JOIN Enrollment))",
              },
              {
                id: '2',
                label: '(2)',
                prompt: '查找数据库课程高分学生。',
                score: 5,
                reference_answer: "Π[sid,name](σ[title='Database'](Student JOIN Enrollment JOIN Course))",
              },
            ],
          },
        ],
      },
      answers: {
        ra_1: {
          responses: {
            1: "PI [ sid , name ] ( sigma [ major = 'English' ] ( Student JOIN Enrollment ) )",
            2: "Π[sid,name](σ[title='Database'](Student⋈Enrollment⋈Course))",
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
        completion: 100,
        strengths: ['投影字段正确', '筛选条件正确'],
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
        completion: 20,
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
                reference_answer: 'Π[sid](Student)',
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
        completion: 0,
      })
    )
    expect(result.totalRelationalAlgebraScore).toBe(0)
  })
})

describe('reviewService question audit strategies', () => {
  beforeEach(() => {
    requestAiJsonMock.mockReset()
  })

  it('uses sql-specific audit strategy for sql questions', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        verdict: '基本合理',
        summary: '题目基本合理，但建议明确分组字段。',
        issues: ['GROUP BY 描述不够明确'],
        consistency_checks: ['表名与字段名自洽'],
        suggestions: ['补充分组要求'],
      },
      model: 'deepseek-chat',
    })

    await auditQuizQuestionCompliance({
      paperTitle: '数据库练习',
      item: {
        id: 'sql_1',
        type: 'sql',
        prompt: '查询平均分大于 80 的学生姓名。',
        context_title: '表结构',
        context: 'Student(id, name, score)',
        answer: {
          reference_answer: 'SELECT name FROM Student WHERE score > 80',
          rationale: '筛选 score > 80 的记录后投影 name。',
          scoring_points: ['字段正确', '条件正确'],
        },
      },
      response: { text: 'SELECT name FROM Student WHERE score >= 80' },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(1)
    const payload = requestAiJsonMock.mock.calls[0][0]
    expect(payload.feature).toBe('question_audit')
    expect(payload.userPrompt).toContain('"audit_strategy": "database_sql"')
    expect(payload.userPrompt).toContain('GROUP BY')
    expect(payload.userPrompt).toContain('Student(id, name, score)')
  })

  it('uses er-diagram strategy for er_diagram questions', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        verdict: '存在问题',
        summary: '基数约束描述不完整。',
        issues: ['未说明一对多关系'],
        consistency_checks: ['实体和属性划分清晰'],
        suggestions: ['补充联系基数'],
      },
      model: 'deepseek-chat',
    })

    await auditQuizQuestionCompliance({
      paperTitle: '数据库练习',
      item: {
        id: 'er_1',
        type: 'er_diagram',
        prompt: '为学生选课系统绘制 E-R 图。',
        answer: {
          reference_answer: '实体：学生、课程；联系：选课',
          rationale: '需要包含学生与课程之间的选课联系。',
        },
      },
      response: { text: '学生-选课-课程' },
    })

    const payload = requestAiJsonMock.mock.calls[0][0]
    expect(payload.userPrompt).toContain('"audit_strategy": "database_er_diagram"')
    expect(payload.userPrompt).toContain('主键、外键或唯一标识是否缺失')
  })
})
