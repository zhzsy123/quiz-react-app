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
    createHistoryEntryMock: vi.fn(async (record) => clone({ ...record, id: `attempt-${Date.now()}` })),
    updateHistoryEntryMock: vi.fn(async () => {}),
    listFavoriteEntriesBySubjectMock: vi.fn(async () => []),
    toggleFavoriteEntryMock: vi.fn(async () => ({ entries: [] })),
    listLibraryEntriesMock: vi.fn(async (profileId, subject) => {
      return libraryStore.filter((item) => item.profileId === profileId && item.subject === subject).map(clone)
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

const richQuizFixture = {
  title: 'English rich flow smoke',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'cloze_1_blank_1',
      type: 'single_choice',
      source_type: 'cloze',
      prompt: 'Cloze blank 1',
      context_title: 'Cloze A',
      context: 'A short cloze passage with one missing blank.',
      options: [
        { key: 'A', text: 'Correct cloze answer' },
        { key: 'B', text: 'Wrong cloze answer' },
        { key: 'C', text: 'Distractor one' },
        { key: 'D', text: 'Distractor two' },
      ],
      answer: {
        type: 'objective',
        correct: 'A',
        rationale: 'cloze-rationale',
      },
      score: 2,
      tags: ['cloze'],
    },
    {
      id: 'reading_A',
      type: 'reading',
      title: 'Passage A',
      passage: {
        title: 'Passage A',
        content: 'Reading passage A body for smoke testing.',
      },
      questions: [
        {
          id: 'reading_A_q1',
          type: 'single_choice',
          prompt: 'Reading question 1',
          options: [
            { key: 'A', text: 'Reading one wrong' },
            { key: 'B', text: 'Reading one correct' },
            { key: 'C', text: 'Reading one distractor' },
            { key: 'D', text: 'Reading one distractor 2' },
          ],
          answer: {
            type: 'objective',
            correct: 'B',
            rationale: 'reading-rationale-1',
          },
          score: 2,
        },
        {
          id: 'reading_A_q2',
          type: 'single_choice',
          prompt: 'Reading question 2',
          options: [
            { key: 'A', text: 'Reading two distractor' },
            { key: 'B', text: 'Reading two distractor 2' },
            { key: 'C', text: 'Reading two correct' },
            { key: 'D', text: 'Reading two distractor 3' },
          ],
          answer: {
            type: 'objective',
            correct: 'C',
            rationale: 'reading-rationale-2',
          },
          score: 2,
        },
        {
          id: 'reading_A_q3',
          type: 'single_choice',
          prompt: 'Reading question 3',
          options: [
            { key: 'A', text: 'Reading three correct' },
            { key: 'B', text: 'Reading three distractor' },
            { key: 'C', text: 'Reading three distractor 2' },
            { key: 'D', text: 'Reading three distractor 3' },
          ],
          answer: {
            type: 'objective',
            correct: 'A',
            rationale: 'reading-rationale-3',
          },
          score: 2,
        },
      ],
      answer: { type: 'objective' },
      score: 6,
    },
    {
      id: 'composite_1',
      type: 'composite',
      prompt: 'Composite root prompt',
      material_title: 'Composite material',
      material: 'Composite material body.',
      questions: [
        {
          id: 'composite_multi',
          type: 'multiple_choice',
          prompt: 'Composite multiple choice',
          options: [
            { key: 'A', text: 'Composite option A' },
            { key: 'B', text: 'Composite option B' },
            { key: 'C', text: 'Composite option C' },
            { key: 'D', text: 'Composite option D' },
          ],
          answer: {
            type: 'objective',
            correct: ['A', 'C'],
            rationale: 'composite-multi-rationale',
          },
          score: 2,
        },
        {
          id: 'composite_blank',
          type: 'fill_blank',
          prompt: 'Composite fill blank',
          blanks: [
            {
              blank_id: 'blank_1',
              accepted_answers: ['heap'],
              rationale: 'composite-blank-rationale',
              score: 2,
            },
          ],
          answer: {
            type: 'objective',
            correct: [['heap']],
            rationale: '',
          },
          score: 2,
        },
      ],
      answer: { type: 'objective' },
      score: 4,
    },
  ],
}

const richQuizDocument = {
  quiz: richQuizFixture,
  scoreBreakdown: {
    objectiveTotal: 12,
    subjectiveTotal: 0,
    paperTotal: 12,
  },
  validation: {
    warnings: [],
  },
  compatibility: {
    supportedCount: 3,
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
  buildQuizDocumentFromText: vi.fn(() => richQuizDocument),
}))

vi.mock('../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: vi.fn(() => richQuizDocument.scoreBreakdown),
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
  upsertLibraryEntry: vi.fn(async () => {}),
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
    { key: 'cloze', label: 'Cloze', shortLabel: 'Cloze', family: 'objective' },
    { key: 'reading', label: 'Reading', shortLabel: 'Reading', family: 'objective' },
    { key: 'composite', label: 'Composite', shortLabel: 'Composite', family: 'subjective' },
  ]

  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: 'English Mock Exam System V2.0',
    shortLabel: 'English',
    description: 'English paper library and mock exam.',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 12,
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
      defaultPaperTotal: 12,
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

import SubjectWorkspacePage from '../pages/SubjectWorkspacePage'

function resetStores() {
  resetMockStores()
  createHistoryEntryMock.mockClear()
  updateHistoryEntryMock.mockClear()
  listFavoriteEntriesBySubjectMock.mockClear()
  toggleFavoriteEntryMock.mockClear()
  listLibraryEntriesMock.mockClear()
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

  throw new Error('Timed out waiting for workspace rich smoke condition.')
}

async function renderWorkspace(initialEntry) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/workspace/:subjectParam" element={<SubjectWorkspacePage />} />
        </Routes>
      </MemoryRouter>
    )
  })

  return { container, root }
}

function findButtonByText(container, text) {
  const buttons = Array.from(container.querySelectorAll('button'))
  const matched = buttons.find((button) => button.textContent?.includes(text))
  if (!matched) {
    throw new Error(`Unable to find button containing text: ${text}`)
  }
  return matched
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

function getCompositeRevealButton(container) {
  const button = container.querySelector('.question-inline-actions button')
  if (!button) {
    throw new Error('Unable to find composite reveal button.')
  }
  return button
}

function setNativeInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
  descriptor?.set?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

describe('workspace rich smoke flow', () => {
  beforeEach(() => {
    resetStores()
    listLibraryEntriesMock.mockImplementation(async (profileId, subject) => {
      if (profileId === 'profile-1' && subject === 'english') {
        return [
          {
            id: 'library-entry-1',
            profileId,
            subject,
            paperId: 'paper-rich',
            title: 'English rich flow smoke',
            rawText: 'rich-fixture',
            importedAt: Date.now(),
          },
        ]
      }
      return []
    })
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('covers cloze, reading and composite interactions from navigation to submit', async () => {
    const { container, root } = await renderWorkspace('/workspace/english?paper=paper-rich&mode=practice')

    await waitFor(() => container.textContent?.includes('Cloze blank 1'))

    await act(async () => {
      findButtonByText(container, 'Correct cloze answer').click()
    })

    await waitFor(() => container.textContent?.includes('cloze-rationale'))
    expect(saveSessionProgressMock.mock.calls.length).toBeGreaterThan(0)

    await act(async () => {
      getNextButton(container).click()
    })

    await waitFor(() => container.textContent?.includes('Reading passage A body for smoke testing.'))
    expect(container.textContent).toContain('A-1')
    expect(container.textContent).toContain('A-2')
    expect(container.textContent).toContain('A-3')

    await act(async () => {
      findButtonByText(container, 'Reading one correct').click()
    })
    await waitFor(() => container.textContent?.includes('reading-rationale-1'))

    await act(async () => {
      findButtonByText(container, 'A-2').click()
    })
    await waitFor(() => container.textContent?.includes('Reading question 2'))
    await act(async () => {
      findButtonByText(container, 'Reading two correct').click()
    })
    await waitFor(() => container.textContent?.includes('reading-rationale-2'))

    await act(async () => {
      findButtonByText(container, 'A-3').click()
    })
    await waitFor(() => container.textContent?.includes('Reading question 3'))
    await act(async () => {
      findButtonByText(container, 'Reading three correct').click()
    })
    await waitFor(() => container.textContent?.includes('reading-rationale-3'))

    await act(async () => {
      getNextButton(container).click()
    })

    await waitFor(() => container.textContent?.includes('Composite root prompt'))

    await act(async () => {
      findButtonByText(container, 'Composite option A').click()
      findButtonByText(container, 'Composite option C').click()
    })

    await act(async () => {
      getCompositeRevealButton(container).click()
    })
    await waitFor(() => container.textContent?.includes('composite-multi-rationale'))

    const compositeInput = container.querySelector('.answer-review-card input')
    expect(compositeInput).not.toBeNull()
    await act(async () => {
      setNativeInputValue(compositeInput, 'heap')
    })
    await waitFor(() => container.textContent?.includes('composite-blank-rationale'))

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
