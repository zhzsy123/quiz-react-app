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
  deleteLibraryEntryMock,
  updateLibraryEntryMock,
  loadSessionProgressMock,
  saveSessionProgressMock,
  clearSessionProgressMock,
  listHistoryEntriesMock,
  removeHistoryEntryMock,
  upsertWrongbookEntriesMock,
  loadPreferenceMock,
  savePreferenceMock,
  resetMockStores,
} = vi.hoisted(() => {
  const libraryStore = []
  const historyStore = []
  const sessionStore = new Map()

  const clone = (value) => JSON.parse(JSON.stringify(value))

  return {
    createHistoryEntryMock: vi.fn(async (record) => {
      const next = { ...clone(record), id: `attempt-${historyStore.length + 1}` }
      historyStore.push(next)
      return next
    }),
    updateHistoryEntryMock: vi.fn(async (historyId, patch) => {
      const index = historyStore.findIndex((item) => item.id === historyId)
      if (index >= 0) historyStore[index] = { ...historyStore[index], ...clone(patch) }
    }),
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
    deleteLibraryEntryMock: vi.fn(async (entryId) => {
      const index = libraryStore.findIndex((item) => item.id === entryId)
      if (index >= 0) libraryStore.splice(index, 1)
    }),
    updateLibraryEntryMock: vi.fn(async (entryId, patch) => {
      const index = libraryStore.findIndex((item) => item.id === entryId)
      if (index >= 0) libraryStore[index] = { ...libraryStore[index], ...clone(patch) }
    }),
    loadSessionProgressMock: vi.fn(async (profileId, subject, sessionPaperId) => {
      return clone(sessionStore.get(`${profileId}:${subject}:${sessionPaperId}`) || {})
    }),
    saveSessionProgressMock: vi.fn(async (profileId, subject, sessionPaperId, payload) => {
      sessionStore.set(`${profileId}:${subject}:${sessionPaperId}`, clone(payload))
    }),
    clearSessionProgressMock: vi.fn(async (profileId, subject, sessionPaperId) => {
      sessionStore.delete(`${profileId}:${subject}:${sessionPaperId}`)
    }),
    listHistoryEntriesMock: vi.fn(async (profileId) => {
      return historyStore.filter((item) => item.profileId === profileId).map(clone)
    }),
    removeHistoryEntryMock: vi.fn(async (historyId) => {
      const index = historyStore.findIndex((item) => item.id === historyId)
      if (index >= 0) historyStore.splice(index, 1)
    }),
    upsertWrongbookEntriesMock: vi.fn(async () => []),
    loadPreferenceMock: vi.fn(() => null),
    savePreferenceMock: vi.fn(() => true),
    resetMockStores: () => {
      libraryStore.splice(0, libraryStore.length)
      historyStore.splice(0, historyStore.length)
      sessionStore.clear()
    },
  }
})

const quizFixture = {
  title: 'English practice paper',
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
  buildQuizDocumentFromText: vi.fn(() => ({
    quiz: quizFixture,
    scoreBreakdown: {
      objectiveTotal: 5,
      subjectiveTotal: 0,
      paperTotal: 5,
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

vi.mock('../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: vi.fn(() => ({
    objectiveTotal: 5,
    subjectiveTotal: 0,
    paperTotal: 5,
  })),
}))

vi.mock('../entities/history/api/historyRepository', () => ({
  createHistoryEntry: createHistoryEntryMock,
  updateHistoryEntry: updateHistoryEntryMock,
  listHistoryEntries: listHistoryEntriesMock,
  removeHistoryEntry: removeHistoryEntryMock,
}))

vi.mock('../entities/favorite/api/favoriteRepository', () => ({
  listFavoriteEntriesBySubject: listFavoriteEntriesBySubjectMock,
  toggleFavoriteEntry: toggleFavoriteEntryMock,
}))

vi.mock('../entities/library/api/libraryRepository', () => ({
  listLibraryEntries: listLibraryEntriesMock,
  upsertLibraryEntry: upsertLibraryEntryMock,
  updateLibraryEntry: updateLibraryEntryMock,
  deleteLibraryEntry: deleteLibraryEntryMock,
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
    expectedPaperTotal: 5,
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
      defaultPaperTotal: 5,
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
    getSubjectMetaByRouteParam: () => subjectMeta,
    getSubjectQuestionTypeOptions: () => [
      {
        key: 'single_choice',
        label: 'Single Choice',
        shortLabel: 'Single',
        family: 'objective',
      },
    ],
  }
})

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

vi.mock('../widgets/quiz/CleanQuizView', () => ({
  default: function SmokeQuizView({
    quiz,
    answers,
    currentIndex,
    mode = 'exam',
    submitted = false,
    onSelectOption,
    onSubmit,
  }) {
    const currentItem = quiz?.items?.[currentIndex]
    if (!currentItem) return null

    return (
      <section data-testid="smoke-quiz-view">
        <h3>{currentItem.prompt}</h3>
        <div>
          {(currentItem.options || []).map((option) => {
            const key = typeof option === 'string' ? option.charAt(0) : option.key
            const text = typeof option === 'string' ? option : `${option.key}. ${option.text}`
            const selected = answers?.[currentItem.id] === key
            return (
              <button
                key={key}
                type="button"
                className={selected ? 'selected' : ''}
                onClick={() => onSelectOption(currentItem.id, key)}
                disabled={submitted}
              >
                {text}
              </button>
            )
          })}
        </div>
        <button type="button" onClick={() => onSubmit()}>
          {mode === 'practice' ? 'Submit practice' : 'Submit exam'}
        </button>
      </section>
    )
  },
}))

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function SmokeQuizImporter({ onQuizLoaded }) {
    return (
      <button
        type="button"
        onClick={() =>
          onQuizLoaded({
            parsed: quizFixture,
            rawText: JSON.stringify(quizFixture),
            quizDocument: {
              quiz: quizFixture,
              scoreBreakdown: {
                objectiveTotal: 5,
                subjectiveTotal: 0,
                paperTotal: 5,
              },
              validation: {
                warnings: [],
              },
              compatibility: {
                supportedCount: 1,
                skippedCount: 0,
              },
            },
          })
        }
      >
        Import fixture
      </button>
    )
  },
}))

import FileHubPage from '../pages/FileHubPage'
import HistoryPage from '../pages/HistoryPage'
import SubjectWorkspacePage from '../pages/SubjectWorkspacePage'

function resetStores() {
  resetMockStores()
  createHistoryEntryMock.mockClear()
  updateHistoryEntryMock.mockClear()
  listFavoriteEntriesBySubjectMock.mockClear()
  toggleFavoriteEntryMock.mockClear()
  listLibraryEntriesMock.mockClear()
  upsertLibraryEntryMock.mockClear()
  deleteLibraryEntryMock.mockClear()
  updateLibraryEntryMock.mockClear()
  loadSessionProgressMock.mockClear()
  saveSessionProgressMock.mockClear()
  clearSessionProgressMock.mockClear()
  listHistoryEntriesMock.mockClear()
  removeHistoryEntryMock.mockClear()
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

async function waitFor(predicate, attempts = 30) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for smoke test condition.')
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
          <Route path="/history" element={<HistoryPage />} />
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

describe('page smoke flow', () => {
  beforeEach(() => {
    resetStores()
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('imports a quiz and persists workspace progress from the public pages', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      findButton(container, 'Import fixture').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    const importedEntry = upsertLibraryEntryMock.mock.calls[0]?.[0]
    expect(importedEntry?.paperId).toBeTruthy()
    expect(importedEntry?.subject).toBe('english')

    await act(async () => {
      root.unmount()
    })

    const workspaceMount = await renderAt(`/workspace/english?paper=${encodeURIComponent(importedEntry.paperId)}&mode=exam`)

    await waitFor(() => workspaceMount.container.textContent?.includes('Question 1'))

    await act(async () => {
      findButton(workspaceMount.container, 'Correct answer').click()
    })

    await waitFor(() =>
      saveSessionProgressMock.mock.calls.some((call) => {
        const payload = call[3]
        return payload?.answers?.q1 === 'A'
      })
    )

    expect(findButton(workspaceMount.container, 'Correct answer').className).toContain('selected')

    await act(async () => {
      workspaceMount.root.unmount()
    })
  })

  it('submits the paper and exposes the attempt on the history page', async () => {
    const { container, root } = await renderAt('/exam/english')

    await act(async () => {
      findButton(container, 'Import fixture').click()
    })

    await waitFor(() => upsertLibraryEntryMock.mock.calls.length > 0)
    const importedEntry = upsertLibraryEntryMock.mock.calls[0]?.[0]
    expect(importedEntry?.paperId).toBeTruthy()

    await act(async () => {
      root.unmount()
    })

    const workspaceMount = await renderAt(`/workspace/english?paper=${encodeURIComponent(importedEntry.paperId)}&mode=exam`)

    await waitFor(() => workspaceMount.container.textContent?.includes('Question 1'))

    await act(async () => {
      findButton(workspaceMount.container, 'Correct answer').click()
    })

    await act(async () => {
      findButton(workspaceMount.container, 'Submit exam').click()
    })

    await waitFor(() => createHistoryEntryMock.mock.calls.length === 1)
    expect(createHistoryEntryMock).toHaveBeenCalledTimes(1)

    await act(async () => {
      workspaceMount.root.unmount()
    })

    const historyMount = await renderAt('/history')
    await waitFor(() => historyMount.container.querySelectorAll('.record-item').length > 0)
    expect(historyMount.container.querySelectorAll('.record-item').length).toBeGreaterThan(0)

    await act(async () => {
      historyMount.root.unmount()
    })
  })
})
