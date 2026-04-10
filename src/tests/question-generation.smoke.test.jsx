/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const {
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

  const generatedQuestion = {
    id: 'gq_001',
    type: 'single_choice',
    prompt: 'Generated question prompt',
    score: 2,
    options: [
      { key: 'A', text: 'Correct answer' },
      { key: 'B', text: 'Wrong answer' },
    ],
    answer: {
      type: 'objective',
      correct: 'A',
      rationale: 'Because A is correct.',
    },
  }

  const createGenerationResult = () => {
    const entry = {
      status: 'valid',
      rawQuestion: clone(generatedQuestion),
      normalizedQuestion: clone(generatedQuestion),
      normalizedItems: [clone(generatedQuestion)],
      validation: { warnings: [], errors: [] },
      warnings: [],
      errors: [],
      preview: {
        questionId: 'gq_001',
        index: 1,
        typeLabel: 'Single Choice',
        previewText: 'Generated question prompt',
        score: 2,
      },
      scoreBreakdown: {
        objectiveTotal: 2,
        subjectiveTotal: 0,
        paperTotal: 2,
      },
    }

    return {
      entry,
      result: {
        status: 'completed',
        requestId: 'gen_smoke_001',
        receivedCount: 1,
        meta: {
          subject: 'english',
          paperTitle: 'Generated draft',
        },
        warnings: [],
        draftQuestions: [entry],
      },
    }
  }

  return {
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
      const { entry, result } = createGenerationResult()
      onQuestion?.(entry.rawQuestion, {
        requestId: result.requestId,
        streamIndex: 1,
        meta: result.meta,
        planItem: { typeKey: 'single_choice', score: 2 },
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

const quizFixture = {
  title: 'Generated draft',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'gq_001',
      type: 'single_choice',
      prompt: 'Generated question prompt',
      options: [
        { key: 'A', text: 'Correct answer' },
        { key: 'B', text: 'Wrong answer' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'Because A is correct.',
      },
      score: 2,
    },
  ],
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

vi.mock('../entities/library/api/libraryRepository', () => ({
  listLibraryEntries: listLibraryEntriesMock,
  upsertLibraryEntry: upsertLibraryEntryMock,
  updateLibraryEntry: vi.fn(async () => {}),
  deleteLibraryEntry: vi.fn(async () => {}),
}))

vi.mock('../entities/session/api/sessionRepository', () => ({
  loadSessionProgress: loadSessionProgressMock,
  saveSessionProgress: saveSessionProgressMock,
  clearSessionProgress: clearSessionProgressMock,
  saveLastOpenedPaper: vi.fn(),
  loadLastOpenedPaper: vi.fn(async () => null),
}))

vi.mock('../entities/history/api/historyRepository', () => ({
  createHistoryEntry: vi.fn(async (record) => ({ ...record, id: 'attempt-1' })),
  updateHistoryEntry: vi.fn(async () => {}),
  listHistoryEntries: vi.fn(async () => []),
  removeHistoryEntry: vi.fn(async () => {}),
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

vi.mock('../shared/lib/preferences/preferenceRepository', () => ({
  loadPreference: loadPreferenceMock,
  savePreference: savePreferenceMock,
}))

vi.mock('../entities/quiz/lib/quizPipeline', () => ({
  buildQuizDocumentFromText: vi.fn(() => ({
    quiz: quizFixture,
    scoreBreakdown: {
      objectiveTotal: 2,
      subjectiveTotal: 0,
      paperTotal: 2,
    },
    validation: {
      warnings: [],
    },
    compatibility: {
      supportedCount: 1,
      skippedCount: 0,
    },
  })),
}))

vi.mock('../entities/subject/model/subjects', () => {
  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: 'English Mock Exam System V2.0',
    shortLabel: 'English',
    description: 'English paper library and mock exam.',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 2,
    defaultDurationMinutes: 90,
    isAvailable: true,
    questionTypeKeys: ['single_choice'],
    generation: {
      enabled: true,
      supportedModes: ['practice', 'mock_exam'],
      supportedQuestionTypes: ['single_choice'],
      defaultCounts: [5],
      defaultDifficulty: 'medium',
      defaultDurationMinutes: 90,
      defaultPaperTotal: 2,
      promptProfile: 'english',
    },
    downloadDocs: [],
  }

  return {
    SUBJECT_REGISTRY: [subjectMeta],
    getSubjectMeta: (subjectKey) => ({
      ...subjectMeta,
      key: subjectKey,
      routeSlug: subjectKey,
    }),
    getSubjectGenerationConfig: () => subjectMeta.generation,
    getSubjectMetaByRouteParam: () => subjectMeta,
    getSubjectQuestionTypeOptions: () => [
      {
        key: 'single_choice',
        label: 'Single Choice',
        shortLabel: 'Single',
        family: 'objective',
        mockExamDefaultCount: 5,
        mockExamDefaultScore: 2,
      },
    ],
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
    getQuestionTypeMeta: (typeKey) => ({
      key: typeKey || 'single_choice',
      label: typeKey === 'single_choice' ? 'Single Choice' : String(typeKey || 'single_choice'),
      shortLabel: typeKey === 'single_choice' ? 'Single' : String(typeKey || 'single_choice'),
      family: 'objective',
    }),
  }
})

vi.mock('../features/question-generator/api/questionGenerationService', () => ({
  startQuestionGeneration: startQuestionGenerationMock,
}))

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function MockQuizImporter() {
    return <div data-testid="mock-importer">Mock importer</div>
  },
}))

vi.mock('../widgets/quiz/CleanQuizView', () => ({
  default: function SmokeQuizView({ quiz }) {
    const currentItem = quiz?.items?.[0]
    if (!currentItem) return null

    return (
      <section data-testid="smoke-generated-workspace">
        <h3>{currentItem.prompt}</h3>
      </section>
    )
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

async function waitFor(predicate, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for question generation smoke condition.')
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

describe('question generation smoke flow', () => {
  beforeEach(() => {
    resetMockStores()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('starts generation and autosaves the generated paper in the background', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      getByTestId(container, 'open-ai-generator').click()
    })

    await act(async () => {
      getByTestId(container, 'start-ai-generation').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    const lastCall = upsertLibraryEntryMock.mock.calls.at(-1)?.[0]
    expect(lastCall.subject).toBe('english')
    expect(lastCall.questionCount).toBe(1)

    await waitFor(() => listLibraryEntriesMock.mock.calls.length >= 2)

    await act(async () => {
      root.unmount()
    })
  })

  it('jumps straight into practice mode as soon as generation starts', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      getByTestId(container, 'open-ai-generator').click()
    })

    await act(async () => {
      getByTestId(container, 'start-ai-generation').click()
    })

    await waitFor(() => container.textContent?.includes('Generated question prompt'))
    expect(container.querySelector('[data-testid="smoke-generated-workspace"]')).not.toBeNull()

    await act(async () => {
      root.unmount()
    })
  })
})
