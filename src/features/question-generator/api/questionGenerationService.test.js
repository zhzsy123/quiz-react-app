import { describe, expect, it, vi } from 'vitest'

const { requestAiJsonMock } = vi.hoisted(() => ({
  requestAiJsonMock: vi.fn(),
}))

vi.mock('../../../shared/api/aiGateway.js', () => ({
  requestAiJson: requestAiJsonMock,
}))

import { buildDraftPaper, startQuestionGeneration } from './questionGenerationService.js'

describe('questionGenerationService', () => {
  it('builds a draft paper from generated questions', () => {
    const draftPaper = buildDraftPaper({
      config: {
        subject: 'data_structure',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        extraPrompt: 'focus on heap sort',
        durationMinutes: 90,
      },
      requestId: 'gen_001',
      meta: {
        paperTitle: 'Heap sort draft',
      },
      draftQuestions: [
        {
          status: 'valid',
          rawQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            answer: { type: 'objective', correct: 'B' },
          },
          normalizedQuestion: {
            id: 'q1',
            type: 'single_choice',
            prompt: 'Q1',
            score: 2,
            answer: { type: 'objective', correct: 'B' },
          },
        },
        {
          status: 'warning',
          rawQuestion: {
            id: 'q2',
            type: 'programming',
            prompt: 'Q2',
            score: 20,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
          normalizedQuestion: {
            id: 'q2',
            type: 'programming',
            prompt: 'Q2',
            score: 20,
            answer: { type: 'subjective', reference_answer: 'sample' },
          },
        },
      ],
    })

    expect(draftPaper.paper_id).toBe('gen_001')
    expect(draftPaper.questions).toHaveLength(2)
    expect(draftPaper.scoreBreakdown.totalScore).toBe(22)
    expect(draftPaper.scoreBreakdown.objectiveScore).toBe(2)
    expect(draftPaper.scoreBreakdown.subjectiveScore).toBe(20)
  })

  it('generates practice questions with per-question json calls and normalizes english single choice', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          id: 'q1',
          type: 'single_choice',
          prompt: 'Which conjunction is correct?',
          score: 2,
          options: {
            C: 'for',
            A: { text: 'because' },
            D: 'that',
            B: 'as',
          },
          answer: 'D',
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q2',
          type: 'single_choice',
          prompt: 'Choose the right sentence.',
          score: 2,
          options: ['A. One', 'B. Two', 'C. Three', 'D. Four'],
          correct_answer: 'B',
          rationale: '因为 B 的语法正确。',
        },
      })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        questionTypes: ['single_choice'],
        paperTitle: 'English draft',
      },
      meta: {
        requestId: 'gen_002',
      },
    })

    expect(requestAiJsonMock).toHaveBeenCalledTimes(2)
    expect(requestAiJsonMock.mock.calls[0][0].systemPrompt).toContain('只生成 1 道题')
    expect(requestAiJsonMock.mock.calls[0][0].userPrompt).toContain('"target_question_type":"single_choice"')

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(2)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.options).toEqual([
      { key: 'A', text: 'because' },
      { key: 'B', text: 'as' },
      { key: 'C', text: 'for' },
      { key: 'D', text: 'that' },
    ])
    expect(result.draftQuestions[0].normalizedQuestion.answer.correct).toBe('D')
    expect(result.draftQuestions[1].normalizedQuestion.answer.correct).toBe('B')
  })

  it('normalizes reading children and object-style answers', async () => {
    requestAiJsonMock.mockResolvedValueOnce({
      content: {
        id: 'rq1',
        type: 'reading',
        prompt: 'Read the passage and answer the questions.',
        score: 10,
        passage: 'Tom likes reading books after school.',
        sub_questions: [
          {
            id: 'rq1_1',
            prompt: 'What does Tom like to do?',
            options: {
              A: 'Play football',
              B: 'Read books',
              C: 'Watch TV',
              D: 'Go shopping',
            },
            answer: 'B',
          },
        ],
      },
    })

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['reading'],
      },
      meta: {
        requestId: 'gen_003',
      },
    })

    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('valid')
    expect(result.draftQuestions[0].normalizedQuestion.questions[0].options).toEqual([
      { key: 'A', text: 'Play football' },
      { key: 'B', text: 'Read books' },
      { key: 'C', text: 'Watch TV' },
      { key: 'D', text: 'Go shopping' },
    ])
    expect(result.draftQuestions[0].normalizedQuestion.questions[0].answer.correct).toBe('B')
  })

  it('retries duplicate generated questions within the same batch', async () => {
    requestAiJsonMock
      .mockResolvedValueOnce({
        content: {
          id: 'q1',
          type: 'case_analysis',
          prompt: '根据案例判断卖方是否违约。',
          context: '某出口合同约定装运期为 6 月 30 日。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应先判断迟延装运是否构成违约。',
            scoring_points: ['识别争议点', '判断是否违约'],
          },
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q2',
          type: 'case_analysis',
          prompt: '根据案例判断卖方是否违约。',
          context: '某出口合同约定装运期为 6 月 30 日。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应先判断迟延装运是否构成违约。',
            scoring_points: ['识别争议点', '判断是否违约'],
          },
        },
      })
      .mockResolvedValueOnce({
        content: {
          id: 'q3',
          type: 'case_analysis',
          prompt: '分析买方拒收货物是否成立。',
          context: '某合同约定以信用证支付，卖方迟延提交单据。',
          score: 10,
          answer: {
            type: 'subjective',
            reference_answer: '应结合单据迟延与拒收依据综合判断。',
            scoring_points: ['识别拒收依据', '判断是否有权拒收'],
          },
        },
      })

    const result = await startQuestionGeneration({
      config: {
        subject: 'international_trade',
        mode: 'practice',
        difficulty: 'medium',
        count: 2,
        questionTypes: ['case_analysis'],
      },
      meta: {
        requestId: 'gen_005',
      },
    })

    expect(requestAiJsonMock.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(2)
    expect(result.draftQuestions[0].normalizedQuestion.prompt).toBe('根据案例判断卖方是否违约。')
    expect(result.draftQuestions[1].normalizedQuestion.prompt).toBe('分析买方拒收货物是否成立。')
    expect(requestAiJsonMock.mock.calls[2][0].userPrompt).toContain('"avoid_question_signatures"')
  })

  it('returns diagnostic invalid entries when generation fails', async () => {
    requestAiJsonMock.mockRejectedValueOnce(new Error('network error'))

    const result = await startQuestionGeneration({
      config: {
        subject: 'english',
        mode: 'practice',
        difficulty: 'medium',
        count: 1,
        questionTypes: ['single_choice'],
        paperTitle: 'Broken paper',
      },
      meta: {
        requestId: 'gen_004',
      },
    })

    expect(result.status).toBe('completed')
    expect(result.draftQuestions).toHaveLength(1)
    expect(result.draftQuestions[0].status).toBe('invalid')
    expect(result.draftQuestions[0].errors[0]).toContain('network error')
  })
})
