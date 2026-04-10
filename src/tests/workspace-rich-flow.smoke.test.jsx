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
      id: 'cloze_1',
      type: 'cloze',
      title: '完形填空 A',
      prompt: '根据短文内容完成完形填空。',
      article: 'A short cloze passage [[1]] one missing blank and [[2]] another blank.',
      blanks: [
        {
          blank_id: 1,
          score: 2,
          options: [
            { key: 'A', text: 'with' },
            { key: 'B', text: 'for' },
            { key: 'C', text: 'to' },
            { key: 'D', text: 'by' },
          ],
          correct: 'A',
          rationale: '固定搭配为 with one missing blank。',
        },
        {
          blank_id: 2,
          score: 2,
          options: [
            { key: 'A', text: 'has' },
            { key: 'B', text: 'have' },
            { key: 'C', text: 'having' },
            { key: 'D', text: 'had' },
          ],
          correct: 'A',
          rationale: '主语 another blank 视为单数，使用 has。',
        },
      ],
      answer: { type: 'objective', correct: ['A', 'A'] },
      score: 4,
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
      material: 'SELECT * FROM tree WHERE height > 3;',
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
    objectiveTotal: 14,
    subjectiveTotal: 0,
    paperTotal: 14,
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
    expectedPaperTotal: 14,
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
      defaultPaperTotal: 14,
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

function getCompositeRevealButtons(container) {
  const buttons = [...container.querySelectorAll('.question-inline-actions button')]
  if (!buttons.length) {
    throw new Error('Unable to find composite reveal button.')
  }
  return buttons
}

function setNativeInputValue(input, value) {
  const prototype = input instanceof window.HTMLTextAreaElement ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value')
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

    await waitFor(() => container.textContent?.includes('根据短文内容完成完形填空。'))
    expect(container.textContent).toContain('(1) ______')
    expect(container.textContent).toContain('(2) ______')

    await act(async () => {
      findButtonByText(container, 'with').click()
      findButtonByText(container, 'has').click()
    })

    await waitFor(() => container.textContent?.includes('检查整篇完形'))

    await act(async () => {
      findButtonByText(container, '检查整篇完形').click()
    })

    await waitFor(() => container.textContent?.includes('固定搭配为 with one missing blank。'))
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
      getCompositeRevealButtons(container)[0].click()
    })
    await waitFor(() => container.textContent?.includes('composite-multi-rationale'))

    const compositeInput = container.querySelector('.fill-blank-input')
    expect(compositeInput).not.toBeNull()
    await act(async () => {
      setNativeInputValue(compositeInput, 'heap')
    })
    await act(async () => {
      getCompositeRevealButtons(container)[0].click()
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
