import { describe, expect, it } from 'vitest'
import { buildAnswerRows, getAttemptScoreSummary } from './useHistoryPageState'

describe('useHistoryPageState helpers', () => {
  it('includes persisted subjective AI review details in answer rows', () => {
    const attempt = {
      objectiveScore: 6,
      objectiveTotal: 10,
      subjectivePendingTotal: 15,
      paperTotal: 25,
      answersSnapshot: {
        essay_1: {
          text: '这是我的作文答案。',
        },
      },
      itemsSnapshot: [
        {
          id: 'essay_1',
          type: 'essay',
          prompt: '写一篇作文。',
          score: 15,
          answer: {
            type: 'subjective',
            reference_answer: '参考范文',
          },
        },
      ],
      aiReview: {
        status: 'completed',
        totalSubjectiveScore: 12,
        questionReviews: {
          essay_1: {
            score: 12,
            maxScore: 15,
            feedback: '立意明确，但语言还可以更精炼。',
            strengths: ['结构完整'],
            weaknesses: ['句式单一'],
            suggestions: ['增加过渡句'],
          },
        },
      },
    }

    const [row] = buildAnswerRows(attempt)

    expect(row).toEqual(
      expect.objectContaining({
        type: 'subjective',
        userText: '这是我的作文答案。',
        referenceText: '参考范文',
        reviewStatus: 'completed',
        reviewScore: 12,
        reviewMaxScore: 15,
        reviewFeedback: '立意明确，但语言还可以更精炼。',
        reviewStrengths: ['结构完整'],
        reviewWeaknesses: ['句式单一'],
        reviewSuggestions: ['增加过渡句'],
      })
    )

    expect(getAttemptScoreSummary(attempt)).toEqual(
      expect.objectContaining({
        objectiveScore: 6,
        objectiveTotal: 10,
        subjectiveScore: 12,
        subjectivePendingTotal: 15,
        totalScore: 18,
        totalMax: 25,
      })
    )
  })

  it('uses unified effective score and rate after AI review completes', () => {
    const completedAttempt = {
      objectiveScore: 6,
      objectiveTotal: 10,
      subjectivePendingTotal: 15,
      paperTotal: 25,
      aiReview: {
        status: 'completed',
        totalSubjectiveScore: 12,
      },
    }

    const pendingAttempt = {
      objectiveScore: 6,
      objectiveTotal: 10,
      subjectivePendingTotal: 15,
      paperTotal: 25,
      aiReview: {
        status: 'pending',
        totalSubjectiveScore: 0,
      },
    }

    expect(getAttemptScoreSummary(completedAttempt)).toEqual(
      expect.objectContaining({
        effectiveScore: 18,
        effectiveMax: 25,
        rate: 72,
        aiCompleted: true,
      })
    )
    expect(getAttemptScoreSummary(pendingAttempt)).toEqual(
      expect.objectContaining({
        effectiveScore: 6,
        effectiveMax: 10,
        rate: 60,
        aiCompleted: false,
      })
    )
  })

  it('flattens database composite and relational algebra items into structured answer rows', () => {
    const attempt = {
      answersSnapshot: {
        composite_1: {
          sql_1: {
            text: 'SELECT name FROM Student WHERE score > 80',
          },
        },
        ra_1: {
          responses: {
            '1': "Π[学号](σ[分数>80](成绩))",
          },
        },
      },
      itemsSnapshot: [
        {
          id: 'composite_1',
          type: 'composite',
          prompt: '阅读表结构并回答问题。',
          material_title: '学生选课表',
          material: 'Student(id, name, score)',
          material_format: 'sql',
          questions: [
            {
              id: 'sql_1',
              type: 'sql',
              prompt: '查询成绩大于 80 分的学生姓名。',
              score: 8,
              answer: {
                type: 'subjective',
                reference_answer: 'SELECT name FROM Student WHERE score > 80',
                scoring_points: ['字段选择正确', '过滤条件正确'],
              },
            },
          ],
        },
        {
          id: 'ra_1',
          type: 'relational_algebra',
          prompt: '请完成关系代数表达式。',
          schemas: [
            {
              name: '成绩',
              attributes: ['学号', '分数'],
            },
          ],
          subquestions: [
            {
              id: '1',
              label: '（1）',
              prompt: '查询分数大于 80 的学号。',
              score: 5,
              reference_answer: "Π[学号](σ[分数>80](成绩))",
            },
          ],
          answer: {
            type: 'subjective',
            scoring_points: ['表达式语义正确'],
          },
        },
      ],
      aiReview: {
        status: 'completed',
        questionReviews: {
          'composite_1:sql_1': {
            score: 8,
            maxScore: 8,
            feedback: 'SQL 语义正确。',
          },
          'ra_1:1': {
            score: 5,
            maxScore: 5,
            feedback: '关系代数表达式正确。',
          },
        },
      },
    }

    const rows = buildAnswerRows(attempt)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual(
      expect.objectContaining({
        key: 'composite_1:sql_1',
        parentTitle: '学生选课表',
        prompt: '查询成绩大于 80 分的学生姓名。',
        type: 'subjective',
        displayType: 'sql',
        codeLike: true,
        contextTitle: '学生选课表',
        contextText: 'Student(id, name, score)',
        userText: 'SELECT name FROM Student WHERE score > 80',
        referenceText: 'SELECT name FROM Student WHERE score > 80',
        scoringPoints: ['字段选择正确', '过滤条件正确'],
      })
    )
    expect(rows[1]).toEqual(
      expect.objectContaining({
        key: 'ra_1:1',
        parentTitle: '请完成关系代数表达式。',
        prompt: '（1） 查询分数大于 80 的学号。',
        type: 'subjective',
        displayType: 'relational_algebra',
        codeLike: true,
        contextTitle: '关系模式',
        contextText: '成绩（学号、分数）',
        userText: "Π[学号](σ[分数>80](成绩))",
        referenceText: "Π[学号](σ[分数>80](成绩))",
      })
    )
  })
})
