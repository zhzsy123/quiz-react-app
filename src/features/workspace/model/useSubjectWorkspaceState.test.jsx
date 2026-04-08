/* @vitest-environment jsdom */

import React, { useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const {
  createHistoryEntryMock,
  updateHistoryEntryMock,
  listFavoriteEntriesBySubjectMock,
  toggleFavoriteEntryMock,
  listLibraryEntriesMock,
  loadSessionProgressMock,
  saveSessionProgressMock,
  clearSessionProgressMock,
  upsertWrongbookEntriesMock,
  loadPreferenceMock,
  savePreferenceMock,
  gradeSubjectiveAttemptMock,
  explainQuizQuestionWithModeMock,
  auditQuizQuestionComplianceMock,
  generateSimilarQuestionsMock,
} = vi.hoisted(() => ({
  createHistoryEntryMock: vi.fn(),
  updateHistoryEntryMock: vi.fn(),
  listFavoriteEntriesBySubjectMock: vi.fn(),
  toggleFavoriteEntryMock: vi.fn(),
  listLibraryEntriesMock: vi.fn(),
  loadSessionProgressMock: vi.fn(),
  saveSessionProgressMock: vi.fn(),
  clearSessionProgressMock: vi.fn(),
  upsertWrongbookEntriesMock: vi.fn(),
  loadPreferenceMock: vi.fn(),
  savePreferenceMock: vi.fn(),
  gradeSubjectiveAttemptMock: vi.fn(),
  explainQuizQuestionWithModeMock: vi.fn(),
  auditQuizQuestionComplianceMock: vi.fn(),
  generateSimilarQuestionsMock: vi.fn(),
}))

const quizFixture = {
  title: '英语练习卷',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'q1',
      type: 'single_choice',
      prompt: 'Question 1',
      options: [
        { key: 'A', text: 'Correct answer' },
        { key: 'B', text: 'Wrong answer' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'Because A is correct.',
      },
      score: 5,
      tags: ['grammar'],
    },
  ],
}

const defaultQuizFixture = JSON.parse(JSON.stringify(quizFixture))

function setQuizFixture(nextQuiz) {
  const cloned = JSON.parse(JSON.stringify(nextQuiz))
  Object.keys(quizFixture).forEach((key) => {
    delete quizFixture[key]
  })
  Object.assign(quizFixture, cloned)
}

function createCompositeQuizFixture() {
  return {
    title: '数据结构综合题',
    subject: 'english',
    duration_minutes: 90,
    items: [
      {
        id: 'composite_1',
        type: 'composite',
        prompt: '阅读下列代码与 SQL 片段后完成子题。',
        material_title: '综合材料',
        material: 'SELECT * FROM tree WHERE height > 3;',
        material_format: 'sql',
        presentation: 'code',
        deliverable_type: 'analysis',
        tags: ['database', 'tree'],
        assets: [{ type: 'image', url: '/assets/er-diagram.png' }],
        score: 14,
        questions: [
          {
            id: 'sub_single',
            type: 'single_choice',
            prompt: '该查询最适合使用哪类索引？',
            options: [
              { key: 'A', text: '聚簇索引' },
              { key: 'B', text: 'B+ 树索引' },
            ],
            answer: {
              type: 'objective',
              correct: 'B',
              rationale: '范围查询通常更适合 B+ 树索引。',
            },
            score: 4,
            tags: ['index'],
          },
          {
            id: 'sub_blank',
            type: 'fill_blank',
            prompt: '写出该查询使用的关键字。',
            blanks: [
              {
                blank_id: 'blank_1',
                accepted_answers: ['SELECT'],
                score: 4,
              },
            ],
            answer: {
              type: 'objective',
              correct: 'SELECT',
              rationale: '查询语句以 SELECT 关键字开头。',
            },
            score: 4,
            tags: ['sql'],
          },
          {
            id: 'sub_subjective',
            type: 'short_answer',
            prompt: '简述该 SQL 在树结构查询中的潜在优化方向。',
            answer: {
              type: 'subjective',
            },
            score: 6,
            response_format: 'plain_text',
            tags: ['optimization'],
          },
        ],
      },
    ],
  }
}

vi.mock('../../../app/providers/AppContext', () => ({
  useAppContext: () => ({
    activeProfile: { id: 'profile-1' },
  }),
}))

vi.mock('../../../entities/quiz/lib/quizPipeline', () => ({
  buildQuizDocumentFromText: () => ({ quiz: quizFixture }),
}))

vi.mock('../../../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: () => ({
    objectiveTotal: 5,
    paperTotal: 5,
    subjectiveTotal: 0,
  }),
}))

vi.mock('../../ai/reviewService', () => ({
  auditQuizQuestionCompliance: auditQuizQuestionComplianceMock,
  explainQuizQuestionWithMode: explainQuizQuestionWithModeMock,
  generateSimilarQuestions: generateSimilarQuestionsMock,
  gradeSubjectiveAttempt: gradeSubjectiveAttemptMock,
}))

vi.mock('../../../entities/history/api/historyRepository', () => ({
  createHistoryEntry: createHistoryEntryMock,
  updateHistoryEntry: updateHistoryEntryMock,
}))

vi.mock('../../../entities/favorite/api/favoriteRepository', () => ({
  listFavoriteEntriesBySubject: listFavoriteEntriesBySubjectMock,
  toggleFavoriteEntry: toggleFavoriteEntryMock,
}))

vi.mock('../../../entities/library/api/libraryRepository', () => ({
  listLibraryEntries: listLibraryEntriesMock,
}))

vi.mock('../../../entities/subject/model/subjects', () => ({
  getSubjectMetaByRouteParam: () => ({
    key: 'english',
    routeSlug: 'english',
    shortLabel: '英语',
    defaultDurationMinutes: 90,
  }),
}))

vi.mock('../../../entities/session/api/sessionRepository', () => ({
  clearSessionProgress: clearSessionProgressMock,
  loadSessionProgress: loadSessionProgressMock,
  saveSessionProgress: saveSessionProgressMock,
}))

vi.mock('../../../entities/wrongbook/api/wrongbookRepository', () => ({
  upsertWrongbookEntries: upsertWrongbookEntriesMock,
}))

vi.mock('../../../shared/lib/preferences/preferenceRepository', () => ({
  loadPreference: loadPreferenceMock,
  savePreference: savePreferenceMock,
}))

import { useSubjectWorkspaceState } from './useSubjectWorkspaceState'

function WorkspaceHarness({ onChange }) {
  const state = useSubjectWorkspaceState()

  useEffect(() => {
    onChange(state)
  }, [onChange, state])

  return null
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function waitFor(predicate, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for workspace state.')
}

async function mountWorkspace() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const stateRef = { current: null }

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={['/exam/english?paper=paper-1&mode=practice&source=library']}>
        <Routes>
          <Route
            path="/exam/:subjectParam"
            element={<WorkspaceHarness onChange={(state) => { stateRef.current = state }} />}
          />
        </Routes>
      </MemoryRouter>
    )
  })

  await waitFor(() => Boolean(stateRef.current?.quiz) && stateRef.current?.loading === false)

  return {
    root,
    container,
    stateRef,
  }
}

describe('useSubjectWorkspaceState practice persistence', () => {
  beforeEach(() => {
    setQuizFixture(defaultQuizFixture)
    createHistoryEntryMock.mockResolvedValue({ id: 'attempt-1' })
    updateHistoryEntryMock.mockResolvedValue(undefined)
    listFavoriteEntriesBySubjectMock.mockResolvedValue([])
    toggleFavoriteEntryMock.mockResolvedValue({ entries: [] })
    listLibraryEntriesMock.mockResolvedValue([
      {
        paperId: 'paper-1',
        title: '英语练习卷',
        rawText: 'mock raw text',
      },
    ])
    loadSessionProgressMock.mockResolvedValue({})
    saveSessionProgressMock.mockResolvedValue(undefined)
    clearSessionProgressMock.mockResolvedValue(undefined)
    upsertWrongbookEntriesMock.mockResolvedValue([])
    loadPreferenceMock.mockReturnValue(null)
    savePreferenceMock.mockReturnValue(true)
    gradeSubjectiveAttemptMock.mockResolvedValue(null)
    explainQuizQuestionWithModeMock.mockResolvedValue(null)
    auditQuizQuestionComplianceMock.mockResolvedValue(null)
    generateSimilarQuestionsMock.mockResolvedValue(null)
  })

  afterEach(async () => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('persists attempt/history even when practice wrong-book is disabled', async () => {
    const { root, container, stateRef } = await mountWorkspace()

    await act(async () => {
      stateRef.current.handleTogglePracticeWrongBook()
      await flushAsyncWork()
    })

    await act(async () => {
      stateRef.current.handleSelectOption('q1', 'B')
      await flushAsyncWork()
    })

    await act(async () => {
      await stateRef.current.handleFinish()
    })

    expect(createHistoryEntryMock).toHaveBeenCalledTimes(1)
    expect(createHistoryEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: 'profile-1',
        subject: 'english',
        paperId: 'paper-1',
        mode: 'practice',
        practiceWritesWrongBook: false,
        answeredCount: 1,
        wrongCount: 1,
      })
    )
    expect(upsertWrongbookEntriesMock).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('keeps wrong-book writes behind the dedicated switch in practice mode', async () => {
    const { root, container, stateRef } = await mountWorkspace()

    await act(async () => {
      stateRef.current.handleSelectOption('q1', 'B')
      await flushAsyncWork()
    })

    await act(async () => {
      await stateRef.current.handleFinish()
    })

    expect(createHistoryEntryMock).toHaveBeenCalledTimes(1)
    expect(createHistoryEntryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'practice',
        practiceWritesWrongBook: true,
      })
    )
    expect(upsertWrongbookEntriesMock).toHaveBeenCalledTimes(1)
    expect(upsertWrongbookEntriesMock).toHaveBeenCalledWith(
      'profile-1',
      'english',
      expect.arrayContaining([
        expect.objectContaining({
          questionKey: 'english:paper-1:q1',
          prompt: 'Question 1',
          userAnswer: 'B',
          correctAnswer: 'A',
        }),
      ])
    )

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('stores composite child answers and reveal state using canonical keys', async () => {
    setQuizFixture(createCompositeQuizFixture())
    const { root, container, stateRef } = await mountWorkspace()

    expect(stateRef.current.quiz.items[0]).toEqual(
      expect.objectContaining({
        id: 'composite_1',
        type: 'composite',
        material_title: '综合材料',
        material: 'SELECT * FROM tree WHERE height > 3;',
        material_format: 'sql',
      })
    )

    await act(async () => {
      stateRef.current.handleSelectCompositeOption('composite_1', 'sub_single', 'A')
      await flushAsyncWork()
    })

    await act(async () => {
      stateRef.current.handleCompositeFillBlankChange('composite_1', 'sub_blank', 'blank_1', 'SELECT')
      await flushAsyncWork()
    })

    await act(async () => {
      stateRef.current.handleCompositeTextChange(
        'composite_1',
        'sub_subjective',
        '可以增加针对 height 字段的索引并减少全表扫描。'
      )
      await flushAsyncWork()
    })

    expect(stateRef.current.answers).toEqual(
      expect.objectContaining({
        composite_1: expect.objectContaining({
          sub_single: 'A',
          sub_blank: expect.objectContaining({
            blank_1: 'SELECT',
          }),
          sub_subjective: expect.objectContaining({
            text: '可以增加针对 height 字段的索引并减少全表扫描。',
          }),
        }),
      })
    )
    expect(stateRef.current.revealedMap).toEqual(
      expect.objectContaining({
        'composite_1:sub_single': true,
        'composite_1:sub_blank': true,
      })
    )

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('emits canonical itemsSnapshot in progress payload for composite questions', async () => {
    setQuizFixture(createCompositeQuizFixture())
    const { root, container, stateRef } = await mountWorkspace()

    await act(async () => {
      stateRef.current.handleSelectCompositeOption('composite_1', 'sub_single', 'B')
      await flushAsyncWork()
    })

    const latestPayload =
      saveSessionProgressMock.mock.calls[saveSessionProgressMock.mock.calls.length - 1]?.[3]

    expect(latestPayload).toEqual(
      expect.objectContaining({
        itemsSnapshot: [
          expect.objectContaining({
            id: 'composite_1',
            type: 'composite',
            questions: expect.arrayContaining([
              expect.objectContaining({
                id: 'sub_single',
                questionKey: 'composite_1:sub_single',
                composite_context: expect.objectContaining({
                  composite_id: 'composite_1',
                  composite_prompt: '阅读下列代码与 SQL 片段后完成子题。',
                  material_title: '综合材料',
                  material: 'SELECT * FROM tree WHERE height > 3;',
                  material_format: 'sql',
                  presentation: 'code',
                  deliverable_type: 'analysis',
                  tags: ['database', 'tree'],
                  assets: [{ type: 'image', url: '/assets/er-diagram.png' }],
                }),
              }),
              expect.objectContaining({
                id: 'sub_blank',
                questionKey: 'composite_1:sub_blank',
                composite_context: expect.objectContaining({
                  composite_id: 'composite_1',
                }),
              }),
              expect.objectContaining({
                id: 'sub_subjective',
                questionKey: 'composite_1:sub_subjective',
                composite_context: expect.objectContaining({
                  composite_id: 'composite_1',
                }),
              }),
            ]),
          }),
        ],
      })
    )

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('writes composite wrongItems at child-question level with canonical context', async () => {
    setQuizFixture(createCompositeQuizFixture())
    const { root, container, stateRef } = await mountWorkspace()

    await act(async () => {
      stateRef.current.handleSelectCompositeOption('composite_1', 'sub_single', 'A')
      await flushAsyncWork()
    })

    await act(async () => {
      stateRef.current.handleCompositeFillBlankChange('composite_1', 'sub_blank', 'blank_1', 'SELECT')
      await flushAsyncWork()
    })

    await act(async () => {
      stateRef.current.handleCompositeTextChange(
        'composite_1',
        'sub_subjective',
        '建议补充覆盖索引并优化查询条件。'
      )
      await flushAsyncWork()
    })

    await act(async () => {
      await stateRef.current.handleFinish()
    })

    expect(upsertWrongbookEntriesMock).toHaveBeenCalledTimes(1)
    expect(upsertWrongbookEntriesMock).toHaveBeenCalledWith(
      'profile-1',
      'english',
      expect.arrayContaining([
        expect.objectContaining({
          questionKey: 'composite_1:sub_single',
          questionId: 'composite_1',
          subQuestionId: 'sub_single',
          prompt: '该查询最适合使用哪类索引？',
          parentType: 'composite',
          userAnswer: 'A',
          correctAnswer: 'B',
          composite_context: expect.objectContaining({
            composite_id: 'composite_1',
            composite_prompt: '阅读下列代码与 SQL 片段后完成子题。',
            material_title: '综合材料',
            material: 'SELECT * FROM tree WHERE height > 3;',
            material_format: 'sql',
            presentation: 'code',
            deliverable_type: 'analysis',
            tags: ['database', 'tree'],
            assets: [{ type: 'image', url: '/assets/er-diagram.png' }],
          }),
        }),
      ])
    )

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
