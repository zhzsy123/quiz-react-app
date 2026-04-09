/* @vitest-environment jsdom */

import React from 'react'
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
  upsertLibraryEntryMock,
  loadSessionProgressMock,
  saveSessionProgressMock,
  clearSessionProgressMock,
  upsertWrongbookEntriesMock,
  loadPreferenceMock,
  savePreferenceMock,
  resetMockStores,
} = vi.hoisted(() => {
  const libraryStore = []
  const sessionStore = new Map()
  const clone = (value) => JSON.parse(JSON.stringify(value))

  return {
    createHistoryEntryMock: vi.fn(async (record) => clone({ ...record, id: 'attempt-reading-1' })),
    updateHistoryEntryMock: vi.fn(async () => {}),
    listFavoriteEntriesBySubjectMock: vi.fn(async () => []),
    toggleFavoriteEntryMock: vi.fn(async () => ({ entries: [] })),
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
    upsertWrongbookEntriesMock: vi.fn(async () => []),
    loadPreferenceMock: vi.fn(() => null),
    savePreferenceMock: vi.fn(() => true),
    resetMockStores: () => {
      libraryStore.splice(0, libraryStore.length)
      sessionStore.clear()
    },
  }
})

const readingQuizFixture = {
  title: 'English reading import smoke',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'q1',
      type: 'single_choice',
      prompt: 'Warm-up question',
      options: [
        { key: 'A', text: 'Warm-up correct' },
        { key: 'B', text: 'Warm-up wrong' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'warmup-rationale',
      },
      score: 2,
    },
    {
      id: 'reading_A',
      type: 'reading',
      title: 'Passage A',
      passage: {
        title: 'Passage A',
        content: 'This is the reading passage body used for import smoke.',
      },
      questions: [
        {
          id: 'reading_A_q1',
          type: 'single_choice',
          prompt: 'Reading item 1',
          options: [
            { key: 'A', text: 'Reading one distractor' },
            { key: 'B', text: 'Reading one correct' },
            { key: 'C', text: 'Reading one distractor 2' },
            { key: 'D', text: 'Reading one distractor 3' },
          ],
          answer: { type: 'objective', correct: 'B', rationale: 'reading-import-rationale-1' },
          score: 2,
        },
        {
          id: 'reading_A_q2',
          type: 'single_choice',
          prompt: 'Reading item 2',
          options: [
            { key: 'A', text: 'Reading two distractor' },
            { key: 'B', text: 'Reading two distractor 2' },
            { key: 'C', text: 'Reading two correct' },
            { key: 'D', text: 'Reading two distractor 3' },
          ],
          answer: { type: 'objective', correct: 'C', rationale: 'reading-import-rationale-2' },
          score: 2,
        },
        {
          id: 'reading_A_q3',
          type: 'single_choice',
          prompt: 'Reading item 3',
          options: [
            { key: 'A', text: 'Reading three correct' },
            { key: 'B', text: 'Reading three distractor' },
            { key: 'C', text: 'Reading three distractor 2' },
            { key: 'D', text: 'Reading three distractor 3' },
          ],
          answer: { type: 'objective', correct: 'A', rationale: 'reading-import-rationale-3' },
          score: 2,
        },
      ],
      answer: { type: 'objective' },
      score: 6,
    },
  ],
}

const readingQuizDocument = {
  quiz: readingQuizFixture,
  scoreBreakdown: {
    objectiveTotal: 8,
    subjectiveTotal: 0,
    paperTotal: 8,
  },
  validation: {
    warnings: [],
  },
  compatibility: {
    supportedCount: 2,
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
  buildQuizDocumentFromText: vi.fn(() => readingQuizDocument),
}))

vi.mock('../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: vi.fn(() => readingQuizDocument.scoreBreakdown),
}))

vi.mock('../entities/history/api/historyRepository', () => ({
  createHistoryEntry: createHistoryEntryMock,
  updateHistoryEntry: updateHistoryEntryMock,
  listHistoryEntries: vi.fn(async () => []),
  removeHistoryEntry: vi.fn(async () => {}),
}))

vi.mock('../entities/favorite/api/favoriteRepository', () => ({
  listFavoriteEntriesBySubject: listFavoriteEntriesBySubjectMock,
  toggleFavoriteEntry: toggleFavoriteEntryMock,
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

vi.mock('../entities/wrongbook/api/wrongbookRepository', () => ({
  upsertWrongbookEntries: upsertWrongbookEntriesMock,
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

vi.mock('../entities/subject/model/subjects', () => {
  const questionTypeOptions = [
    { key: 'single_choice', label: 'Single Choice', shortLabel: 'Single', family: 'objective' },
    { key: 'reading', label: 'Reading', shortLabel: 'Reading', family: 'objective' },
  ]

  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: 'English Mock Exam System V2.0',
    shortLabel: 'English',
    description: 'English paper library and mock exam.',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 8,
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
      defaultPaperTotal: 8,
      promptProfile: 'english',
    },
    downloadDocs: [],
  }

  return {
    SUBJECT_REGISTRY: [subjectMeta],
    getSubjectMeta: () => subjectMeta,
    getSubjectMetaByRouteParam: () => subjectMeta,
    getSubjectQuestionTypeOptions: () => questionTypeOptions,
    getQuestionTypeMeta: (type) => questionTypeOptions.find((item) => item.key === type) || {
      key: type,
      label: type,
      shortLabel: type,
      family: 'objective',
    },
    buildQuestionPlan: () => ({}),
    normalizeQuestionPlan: () => ({}),
  }
})

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function ReadingQuizImporter({ onQuizLoaded }) {
    return (
      <button
        type="button"
        onClick={() =>
          onQuizLoaded({
            parsed: readingQuizFixture,
            rawText: JSON.stringify(readingQuizFixture),
            quizDocument: readingQuizDocument,
          })
        }
      >
        Import reading fixture
      </button>
    )
  },
}))

import FileHubPage from '../pages/FileHubPage'
import SubjectWorkspacePage from '../pages/SubjectWorkspacePage'

function resetStores() {
  resetMockStores()
  createHistoryEntryMock.mockClear()
  updateHistoryEntryMock.mockClear()
  listFavoriteEntriesBySubjectMock.mockClear()
  toggleFavoriteEntryMock.mockClear()
  listLibraryEntriesMock.mockClear()
  upsertLibraryEntryMock.mockClear()
  loadSessionProgressMock.mockClear()
  saveSessionProgressMock.mockClear()
  clearSessionProgressMock.mockClear()
  upsertWrongbookEntriesMock.mockClear()
  loadPreferenceMock.mockClear()
  savePreferenceMock.mockClear()
}

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

  throw new Error('Timed out waiting for english reading import smoke condition.')
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

function findButton(container, text) {
  const buttons = Array.from(container.querySelectorAll('button'))
  const match = buttons.find((button) => button.textContent?.includes(text))
  if (!match) {
    throw new Error(`Unable to find button containing text: ${text}`)
  }
  return match
}

function getNextButton(container) {
  const buttons = container.querySelectorAll('.question-actions button')
  if (buttons.length < 2) {
    throw new Error('Unable to find next-question button.')
  }
  return buttons[1]
}

function getSubmitButton(container) {
  const button = container.querySelector('.quiz-submit-row button')
  if (!button) {
    throw new Error('Unable to find submit button.')
  }
  return button
}

describe('english reading import smoke flow', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('imports an english reading paper and completes the reading flow in practice mode', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      findButton(container, 'Import reading fixture').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    const importedEntry = upsertLibraryEntryMock.mock.calls[0]?.[0]
    expect(importedEntry?.paperId).toBeTruthy()

    await act(async () => {
      root.unmount()
    })

    const workspaceMount = await renderAt(`/workspace/english?paper=${encodeURIComponent(importedEntry.paperId)}&mode=practice`)

    await waitFor(() => workspaceMount.container.textContent?.includes('Warm-up question'))

    await act(async () => {
      findButton(workspaceMount.container, 'Warm-up correct').click()
    })

    await waitFor(() => workspaceMount.container.textContent?.includes('warmup-rationale'))

    await act(async () => {
      getNextButton(workspaceMount.container).click()
    })

    await waitFor(() => workspaceMount.container.textContent?.includes('This is the reading passage body used for import smoke.'))
    expect(workspaceMount.container.textContent).toContain('A-1')
    expect(workspaceMount.container.textContent).toContain('A-2')
    expect(workspaceMount.container.textContent).toContain('A-3')

    await act(async () => {
      findButton(workspaceMount.container, 'Reading one correct').click()
    })
    await waitFor(() => workspaceMount.container.textContent?.includes('reading-import-rationale-1'))

    await act(async () => {
      findButton(workspaceMount.container, 'A-2').click()
    })
    await waitFor(() => workspaceMount.container.textContent?.includes('Reading item 2'))
    await act(async () => {
      findButton(workspaceMount.container, 'Reading two correct').click()
    })
    await waitFor(() => workspaceMount.container.textContent?.includes('reading-import-rationale-2'))

    await act(async () => {
      findButton(workspaceMount.container, 'A-3').click()
    })
    await waitFor(() => workspaceMount.container.textContent?.includes('Reading item 3'))
    await act(async () => {
      findButton(workspaceMount.container, 'Reading three correct').click()
    })
    await waitFor(() => workspaceMount.container.textContent?.includes('reading-import-rationale-3'))

    await act(async () => {
      getSubmitButton(workspaceMount.container).click()
    })

    await waitFor(() => createHistoryEntryMock.mock.calls.length === 1)
    expect(workspaceMount.container.querySelector('.score-card')).not.toBeNull()

    await act(async () => {
      workspaceMount.root.unmount()
    })
  })
})
