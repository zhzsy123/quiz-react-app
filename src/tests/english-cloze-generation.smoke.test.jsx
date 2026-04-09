/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const {
  createHistoryEntryMock,
  listLibraryEntriesMock,
  upsertLibraryEntryMock,
  loadSessionProgressMock,
  saveSessionProgressMock,
  clearSessionProgressMock,
  loadPreferenceMock,
  savePreferenceMock,
  startQuestionGenerationMock,
  resetMockStores,
} = vi.hoisted(() => {
  const libraryStore = []
  const sessionStore = new Map()
  const clone = (value) => JSON.parse(JSON.stringify(value))

  const clozeRawQuestion = {
    id: 'cloze_generated_1',
    type: 'cloze',
    title: '完形填空 A',
    prompt: '阅读短文并完成完形填空。',
    article: 'The system [[1]] stable after the first fix and [[2]] stable after the second fix.',
    blanks: [
      {
        blank_id: 1,
        score: 2,
        options: [
          { key: 'A', text: 'became' },
          { key: 'B', text: 'becomes' },
          { key: 'C', text: 'becoming' },
          { key: 'D', text: 'become' },
        ],
        correct: 'A',
        rationale: '第一空要用过去式，表示修复完成后的状态变化。',
      },
      {
        blank_id: 2,
        score: 2,
        options: [
          { key: 'A', text: 'remain' },
          { key: 'B', text: 'remained' },
          { key: 'C', text: 'remaining' },
          { key: 'D', text: 'remains' },
        ],
        correct: 'D',
        rationale: '第二空主语仍是第三人称单数，使用 remains。',
      },
    ],
  }

  const normalizedQuestion = {
    id: 'cloze_generated_1',
    type: 'cloze',
    title: '完形填空 A',
    prompt: '阅读短文并完成完形填空。',
    article: 'The system [[1]] stable after the first fix and [[2]] stable after the second fix.',
    blanks: [
      {
        blank_id: 1,
        score: 2,
        options: clozeRawQuestion.blanks[0].options,
        correct: 'A',
        rationale: '第一空要用过去式，表示修复完成后的状态变化。',
      },
      {
        blank_id: 2,
        score: 2,
        options: clozeRawQuestion.blanks[1].options,
        correct: 'D',
        rationale: '第二空主语仍是第三人称单数，使用 remains。',
      },
    ],
    answer: {
      type: 'objective',
      correct: ['A', 'D'],
    },
    score: 4,
    tags: ['cloze'],
  }

  const createGenerationEntry = () => ({
    status: 'valid',
    rawQuestion: clone(clozeRawQuestion),
    normalizedQuestion: clone(normalizedQuestion),
    validation: { warnings: [], errors: [] },
    warnings: [],
    errors: [],
    preview: {
      questionId: 'cloze_generated_1',
      index: 1,
      typeLabel: '完形填空',
      previewText: '阅读短文并完成完形填空。',
      score: 4,
    },
    scoreBreakdown: {
      objectiveTotal: 4,
      subjectiveTotal: 0,
      paperTotal: 4,
    },
  })

  return {
    createHistoryEntryMock: vi.fn(async (record) => clone({ ...record, id: 'attempt-cloze-1' })),
    listLibraryEntriesMock: vi.fn(async (profileId, subject) => {
      return libraryStore.filter((item) => item.profileId === profileId && item.subject === subject).map(clone)
    }),
    upsertLibraryEntryMock: vi.fn(async (entry) => {
      const next = clone(entry)
      const index = libraryStore.findIndex(
        (item) => item.profileId === next.profileId && item.subject === next.subject && item.paperId === next.paperId
      )
      if (index >= 0) {
        libraryStore[index] = { ...libraryStore[index], ...next }
      } else {
        libraryStore.push(next)
      }
      return next
    }),
    loadSessionProgressMock: vi.fn(async (profileId, subject, paperId) => {
      return clone(sessionStore.get(`${profileId}:${subject}:${paperId}`) || {})
    }),
    saveSessionProgressMock: vi.fn(async (profileId, subject, paperId, payload) => {
      sessionStore.set(`${profileId}:${subject}:${paperId}`, clone(payload))
    }),
    clearSessionProgressMock: vi.fn(async (profileId, subject, paperId) => {
      sessionStore.delete(`${profileId}:${subject}:${paperId}`)
    }),
    loadPreferenceMock: vi.fn(() => null),
    savePreferenceMock: vi.fn(() => true),
    startQuestionGenerationMock: vi.fn(async ({ onQuestion, onComplete }) => {
      const entry = createGenerationEntry()
      const result = {
        status: 'completed',
        requestId: 'gen_cloze_001',
        receivedCount: 1,
        meta: {
          subject: 'english',
          paperTitle: 'Generated cloze draft',
        },
        warnings: [],
        draftQuestions: [entry],
      }

      onQuestion?.(entry.rawQuestion, {
        requestId: result.requestId,
        streamIndex: 1,
        meta: result.meta,
        planItem: { typeKey: 'cloze', score: 4 },
        entry,
      })
      onComplete?.(result)
      return result
    }),
    resetMockStores: () => {
      libraryStore.splice(0, libraryStore.length)
      sessionStore.clear()
    },
  }
})

const clozeWorkspaceQuiz = {
  title: 'Generated cloze draft',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'cloze_generated_1',
      type: 'cloze',
      title: '完形填空 A',
      prompt: '阅读短文并完成完形填空。',
      article: 'The system [[1]] stable after the first fix and [[2]] stable after the second fix.',
      blanks: [
        {
          blank_id: 1,
          score: 2,
          options: [
            { key: 'A', text: 'became' },
            { key: 'B', text: 'becomes' },
            { key: 'C', text: 'becoming' },
            { key: 'D', text: 'become' },
          ],
          correct: 'A',
          rationale: '第一空要用过去式，表示修复完成后的状态变化。',
        },
        {
          blank_id: 2,
          score: 2,
          options: [
            { key: 'A', text: 'remain' },
            { key: 'B', text: 'remained' },
            { key: 'C', text: 'remaining' },
            { key: 'D', text: 'remains' },
          ],
          correct: 'D',
          rationale: '第二空主语仍是第三人称单数，使用 remains。',
        },
      ],
      answer: {
        type: 'objective',
        correct: ['A', 'D'],
      },
      score: 4,
      tags: ['cloze'],
    },
  ],
}

const clozeQuizDocument = {
  quiz: clozeWorkspaceQuiz,
  scoreBreakdown: {
    objectiveTotal: 4,
    subjectiveTotal: 0,
    paperTotal: 4,
  },
  validation: {
    warnings: [],
  },
  compatibility: {
    supportedCount: 1,
    skippedCount: 0,
  },
}

vi.mock('../app/providers/AppContext', () => ({
  useAppContext: () => ({
    profiles: [{ id: 'profile-1', name: 'Vorin' }],
    activeProfile: { id: 'profile-1', name: 'Vorin' },
    activeProfileId: 'profile-1',
    loading: false,
    createLocalProfile: vi.fn(),
    switchProfile: vi.fn(),
    renameLocalProfile: vi.fn(),
  }),
}))

vi.mock('../entities/quiz/lib/quizPipeline', () => ({
  buildQuizDocumentFromText: vi.fn(() => clozeQuizDocument),
}))

vi.mock('../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: vi.fn(() => clozeQuizDocument.scoreBreakdown),
}))

vi.mock('../entities/library/api/libraryRepository', () => ({
  listLibraryEntries: listLibraryEntriesMock,
  upsertLibraryEntry: upsertLibraryEntryMock,
  updateLibraryEntry: vi.fn(async () => {}),
  deleteLibraryEntry: vi.fn(async () => {}),
}))

vi.mock('../entities/history/api/historyRepository', () => ({
  createHistoryEntry: createHistoryEntryMock,
  updateHistoryEntry: vi.fn(async () => {}),
  listHistoryEntries: vi.fn(async () => []),
  removeHistoryEntry: vi.fn(async () => {}),
}))

vi.mock('../entities/session/api/sessionRepository', () => ({
  loadSessionProgress: loadSessionProgressMock,
  saveSessionProgress: saveSessionProgressMock,
  clearSessionProgress: clearSessionProgressMock,
  saveLastOpenedPaper: vi.fn(),
  loadLastOpenedPaper: vi.fn(async () => null),
}))

vi.mock('../shared/lib/preferences/preferenceRepository', () => ({
  loadPreference: loadPreferenceMock,
  savePreference: savePreferenceMock,
}))

vi.mock('../features/question-generator/api/questionGenerationService', () => ({
  startQuestionGeneration: startQuestionGenerationMock,
}))

vi.mock('../entities/favorite/api/favoriteRepository', () => ({
  listFavoriteEntriesBySubject: vi.fn(async () => []),
  toggleFavoriteEntry: vi.fn(async () => ({ entries: [] })),
}))

vi.mock('../entities/wrongbook/api/wrongbookRepository', () => ({
  upsertWrongbookEntries: vi.fn(async () => []),
  listAllWrongbookEntries: vi.fn(async () => []),
  listWrongbookEntriesBySubject: vi.fn(async () => []),
  removeWrongbookEntry: vi.fn(async () => {}),
  removeWrongbookEntries: vi.fn(async () => {}),
  loadMasteredWrongMap: vi.fn(async () => ({})),
  markWrongQuestionMastered: vi.fn(async () => {}),
}))

vi.mock('../entities/subject/model/subjects', () => {
  const questionTypeOptions = [
    {
      key: 'single_choice',
      label: '单项选择题',
      shortLabel: '单选',
      family: 'objective',
      mockExamDefaultCount: 1,
      mockExamDefaultScore: 2,
    },
    {
      key: 'cloze',
      label: '完形填空',
      shortLabel: '完型',
      family: 'objective',
      mockExamDefaultCount: 1,
      mockExamDefaultScore: 4,
    },
  ]

  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: '英语模考系统 V2.0',
    shortLabel: '英语',
    description: '英语题库与模考。',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 4,
    defaultDurationMinutes: 90,
    isAvailable: true,
    questionTypeKeys: questionTypeOptions.map((item) => item.key),
    generation: {
      enabled: true,
      supportedModes: ['practice', 'mock_exam'],
      supportedQuestionTypes: questionTypeOptions.map((item) => item.key),
      defaultCounts: [5],
      defaultDifficulty: 'medium',
      defaultDurationMinutes: 90,
      defaultPaperTotal: 4,
      promptProfile: 'english',
    },
    downloadDocs: [],
  }

  return {
    SUBJECT_REGISTRY: [subjectMeta],
    getSubjectMeta: () => subjectMeta,
    getSubjectMetaByRouteParam: () => subjectMeta,
    getSubjectQuestionTypeOptions: () => questionTypeOptions,
    getQuestionTypeMeta: (type) =>
      questionTypeOptions.find((item) => item.key === type) || {
        key: type,
        label: type,
        shortLabel: type,
        family: 'objective',
      },
    buildQuestionPlan: (typeKeys = [], options = []) =>
      typeKeys.reduce((plan, typeKey) => {
        const meta = options.find((item) => item.key === typeKey) || {
          mockExamDefaultCount: 1,
          mockExamDefaultScore: 1,
        }
        plan[typeKey] = {
          count: meta.mockExamDefaultCount || 1,
          score: meta.mockExamDefaultScore || 1,
        }
        return plan
      }, {}),
    normalizeQuestionPlan: (typeKeys = [], questionPlan = {}, options = []) =>
      typeKeys.reduce((plan, typeKey) => {
        const meta = options.find((item) => item.key === typeKey) || {
          mockExamDefaultCount: 1,
          mockExamDefaultScore: 1,
        }
        const current = questionPlan[typeKey] || {}
        plan[typeKey] = {
          count: Number(current.count) || meta.mockExamDefaultCount || 1,
          score: Number(current.score) || meta.mockExamDefaultScore || 1,
        }
        return plan
      }, {}),
  }
})

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function MockQuizImporter() {
    return <div data-testid="mock-importer">Mock importer</div>
  },
}))

import FileHubPage from '../pages/FileHubPage'
import SubjectWorkspacePage from '../pages/SubjectWorkspacePage'

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function waitFor(predicate, attempts = 40) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for english cloze generation smoke condition.')
}

async function renderAt(initialEntry) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/exam/:subjectParam" element={<FileHubPage />} />
          <Route path="/workspace/:subjectParam" element={<SubjectWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    )
  })

  return { container, root }
}

function getByTestId(container, testId) {
  const target = container.querySelector(`[data-testid="${testId}"]`)
  if (!target) {
    throw new Error(`Unable to find element by test id: ${testId}`)
  }
  return target
}

function findButton(container, text) {
  const buttons = Array.from(container.querySelectorAll('button'))
  const match = buttons.find((button) => button.textContent?.includes(text))
  if (!match) {
    throw new Error(`Unable to find button containing text: ${text}`)
  }
  return match
}

function getSubmitButton(container) {
  const button = container.querySelector('.quiz-submit-row button')
  if (!button) {
    throw new Error('Unable to find submit button.')
  }
  return button
}

describe('english cloze generation smoke flow', () => {
  beforeEach(() => {
    resetMockStores()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('generates a cloze draft, saves it, opens practice mode, and completes the whole cloze on one page', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      getByTestId(container, 'open-ai-generator').click()
    })

    await act(async () => {
      getByTestId(container, 'start-ai-generation').click()
    })

    await waitFor(() => !getByTestId(container, 'start-generated-paper-practice').disabled)

    await act(async () => {
      getByTestId(container, 'start-generated-paper-practice').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    expect(upsertLibraryEntryMock.mock.calls[0][0].questionCount).toBe(1)

    await waitFor(() => container.textContent?.includes('阅读短文并完成完形填空。'))
    expect(container.textContent).toContain('(1) ______')
    expect(container.textContent).toContain('(2) ______')

    await act(async () => {
      findButton(container, 'became').click()
      findButton(container, 'remains').click()
    })

    await waitFor(() => container.textContent?.includes('检查整篇完形'))

    await act(async () => {
      findButton(container, '检查整篇完形').click()
    })

    await waitFor(() => container.textContent?.includes('第一空要用过去式'))
    expect(container.textContent).toContain('第二空主语仍是第三人称单数')

    await act(async () => {
      getSubmitButton(container).click()
    })

    await waitFor(() => createHistoryEntryMock.mock.calls.length === 1)
    expect(container.querySelector('.score-card')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
  })
})
