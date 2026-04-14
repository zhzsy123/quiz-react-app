/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

const {
  createHistoryEntryMock,
  buildQuizDocumentFromTextMock,
  gradeRelationalAlgebraSubquestionAttemptMock,
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
    buildQuizDocumentFromTextMock: vi.fn(),
    gradeRelationalAlgebraSubquestionAttemptMock: vi.fn(),
    updateHistoryEntryMock: vi.fn(async () => {}),
    listFavoriteEntriesBySubjectMock: vi.fn(async () => []),
    toggleFavoriteEntryMock: vi.fn(async () => ({ entries: [] })),
    listLibraryEntriesMock: vi.fn(async (profileId, subject) =>
      libraryStore.filter((item) => item.profileId === profileId && item.subject === subject).map(clone)
    ),
    loadSessionProgressMock: vi.fn(async (profileId, subject, paperId) =>
      clone(sessionStore.get(`${profileId}:${subject}:${paperId}`) || {})
    ),
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
      title: 'Cloze A',
      prompt: 'Complete the cloze passage.',
      article: 'A short cloze passage [[1]] one missing blank and [[2]] another blank.',
      blanks: [
        {
          blank_id: '1',
          score: 2,
          options: [
            { key: 'A', text: 'with' },
            { key: 'B', text: 'for' },
            { key: 'C', text: 'to' },
            { key: 'D', text: 'by' },
          ],
          correct: 'A',
          rationale: 'cloze-rationale-1',
        },
        {
          blank_id: '2',
          score: 2,
          options: [
            { key: 'A', text: 'has' },
            { key: 'B', text: 'have' },
            { key: 'C', text: 'having' },
            { key: 'D', text: 'had' },
          ],
          correct: 'A',
          rationale: 'cloze-rationale-2',
        },
      ],
      answer: { type: 'objective', correct: ['A', 'A'] },
      score: 4,
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
          answer: { type: 'objective', correct: 'B', rationale: 'reading-rationale-1' },
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
          answer: { type: 'objective', correct: 'C', rationale: 'reading-rationale-2' },
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
          answer: { type: 'objective', correct: 'A', rationale: 'reading-rationale-3' },
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
          answer: { type: 'objective', correct: ['A', 'C'], rationale: 'composite-multi-rationale' },
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
          answer: { type: 'objective', correct: [['heap']], rationale: '' },
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
  validation: { warnings: [] },
  compatibility: { supportedCount: 3, skippedCount: 0 },
}

const autoAdvanceQuizFixture = {
  title: 'Workspace auto advance smoke',
  subject: 'english',
  duration_minutes: 90,
  items: [
    {
      id: 'cloze_auto',
      type: 'cloze',
      title: 'Cloze auto',
      prompt: 'Complete the cloze passage.',
      article: 'Auto advance cloze [[1]] with one blank and [[2]] with another blank.',
      blanks: [
        {
          blank_id: 'blank_1',
          score: 2,
          options: [
            { key: 'A', text: 'starts' },
            { key: 'B', text: 'start' },
            { key: 'C', text: 'started' },
            { key: 'D', text: 'starting' },
          ],
          correct: 'A',
          rationale: 'blank-1',
        },
        {
          blank_id: 'blank_2',
          score: 2,
          options: [
            { key: 'A', text: 'moves' },
            { key: 'B', text: 'move' },
            { key: 'C', text: 'moving' },
            { key: 'D', text: 'moved' },
          ],
          correct: 'A',
          rationale: 'blank-2',
        },
      ],
      answer: { type: 'objective', correct: ['A', 'A'] },
      score: 4,
    },
    {
      id: 'reading_auto',
      type: 'reading',
      title: 'Passage A',
      passage: {
        title: 'Passage A',
        content: 'Auto advance reading passage.',
      },
      questions: [
        {
          id: 'reading_auto_q1',
          type: 'single_choice',
          prompt: 'Reading auto 1',
          options: [
            { key: 'A', text: 'Wrong 1' },
            { key: 'B', text: 'Correct 1' },
            { key: 'C', text: 'Wrong 1-2' },
            { key: 'D', text: 'Wrong 1-3' },
          ],
          answer: { type: 'objective', correct: 'B', rationale: 'r1' },
          score: 2,
        },
        {
          id: 'reading_auto_q2',
          type: 'single_choice',
          prompt: 'Reading auto 2',
          options: [
            { key: 'A', text: 'Wrong 2' },
            { key: 'B', text: 'Wrong 2-2' },
            { key: 'C', text: 'Correct 2' },
            { key: 'D', text: 'Wrong 2-3' },
          ],
          answer: { type: 'objective', correct: 'C', rationale: 'r2' },
          score: 2,
        },
      ],
      answer: { type: 'objective' },
      score: 4,
    },
    {
      id: 'composite_auto',
      type: 'composite',
      prompt: 'Composite auto root',
      material_title: 'Composite material',
      material: 'Composite material body',
      questions: [
        {
          id: 'composite_auto_multi',
          type: 'multiple_choice',
          prompt: 'Composite auto multi',
          options: [
            { key: 'A', text: 'Correct A' },
            { key: 'B', text: 'Wrong B' },
            { key: 'C', text: 'Correct C' },
            { key: 'D', text: 'Wrong D' },
          ],
          answer: { type: 'objective', correct: ['A', 'C'], rationale: 'cm' },
          score: 2,
        },
        {
          id: 'composite_auto_blank',
          type: 'fill_blank',
          prompt: 'Composite auto blank',
          blanks: [{ blank_id: 'blank_1', accepted_answers: ['heap'], rationale: 'cb', score: 2 }],
          answer: { type: 'objective', correct: [['heap']], rationale: '' },
          score: 2,
        },
      ],
      answer: { type: 'objective' },
      score: 4,
    },
    {
      id: 'ra_auto',
      type: 'relational_algebra',
      prompt: 'Use relational algebra to answer the following.',
      score: 10,
      schemas: [
        { name: '学生', attributes: ['学号', '姓名', '专业'] },
        { name: '选课', attributes: ['学号', '课程号', '成绩'] },
      ],
      subquestions: [
        {
          id: '1',
          label: '(1)',
          prompt: 'Relational algebra part 1',
          score: 5,
          reference_answer: 'π[学号](学生)',
        },
        {
          id: '2',
          label: '(2)',
          prompt: 'Relational algebra part 2',
          score: 5,
          reference_answer: 'π[姓名](学生)',
        },
      ],
      answer: { type: 'subjective' },
    },
    {
      id: 'single_auto',
      type: 'single_choice',
      prompt: 'Final single choice',
      options: [
        { key: 'A', text: 'Final wrong' },
        { key: 'B', text: 'Final correct' },
        { key: 'C', text: 'Final wrong 2' },
        { key: 'D', text: 'Final wrong 3' },
      ],
      answer: { type: 'objective', correct: 'B', rationale: 'final' },
      score: 2,
    },
  ],
}

const autoAdvanceQuizDocument = {
  quiz: autoAdvanceQuizFixture,
  scoreBreakdown: {
    objectiveTotal: 14,
    subjectiveTotal: 10,
    paperTotal: 24,
  },
  validation: { warnings: [] },
  compatibility: { supportedCount: 5, skippedCount: 0 },
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
  buildQuizDocumentFromText: buildQuizDocumentFromTextMock,
}))

vi.mock('../entities/quiz/lib/scoring/getQuizScoreBreakdown', () => ({
  getQuizScoreBreakdown: vi.fn((items) => {
    const fixture = Array.isArray(items) && items.some((item) => item.id === 'ra_auto') ? autoAdvanceQuizDocument : richQuizDocument
    return fixture.scoreBreakdown
  }),
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

vi.mock('../features/ai/reviewService', () => ({
  auditQuizQuestionCompliance: vi.fn(async () => ({})),
  explainQuizQuestionWithMode: vi.fn(async () => ({
    status: 'completed',
    title: 'AI explain',
    explanation: 'ok',
    keyPoints: [],
    commonMistakes: [],
    answerStrategy: [],
    error: '',
  })),
  generateSimilarQuestions: vi.fn(async () => ({
    status: 'completed',
    title: 'AI similar',
    questions: [],
    error: '',
  })),
  gradeSubjectiveAttempt: vi.fn(async () => ({
    status: 'completed',
    score: 0,
    totalScore: 0,
    breakdown: [],
  })),
  gradeRelationalAlgebraAttempt: vi.fn(async () => ({
    question_id: 'ra',
    subquestion_results: [],
    total_score: 0,
    max_score: 0,
  })),
  gradeRelationalAlgebraSubquestionAttempt: gradeRelationalAlgebraSubquestionAttemptMock,
}))

vi.mock('../entities/subject/model/subjects', () => {
  const questionTypeOptions = [
    { key: 'single_choice', label: 'Single Choice', shortLabel: 'Single', family: 'objective' },
    { key: 'cloze', label: 'Cloze', shortLabel: 'Cloze', family: 'objective' },
    { key: 'reading', label: 'Reading', shortLabel: 'Reading', family: 'objective' },
    { key: 'composite', label: 'Composite', shortLabel: 'Composite', family: 'subjective' },
    { key: 'relational_algebra', label: 'Relational Algebra', shortLabel: 'RA', family: 'subjective' },
  ]

  const subjectMeta = {
    key: 'english',
    routeSlug: 'english',
    label: 'English Mock Exam System V2.0',
    shortLabel: 'English',
    description: 'English paper library and mock exam.',
    route: '/exam/english',
    workspaceRoute: '/workspace/english',
    expectedPaperTotal: 24,
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
      defaultPaperTotal: 24,
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
  buildQuizDocumentFromTextMock.mockClear()
  gradeRelationalAlgebraSubquestionAttemptMock.mockClear()
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

async function waitFor(predicate, attempts = 60) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }
  throw new Error('Timed out waiting for workspace smoke condition.')
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
  if (!matched) throw new Error(`Unable to find button containing text: ${text}`)
  return matched
}

function getNextButton(container) {
  const buttons = container.querySelectorAll('.question-actions button')
  if (buttons.length < 2) throw new Error('Unable to find next-question button.')
  return buttons[1]
}

function getSubmitButton(container) {
  const button =
    container.querySelector('.workspace-submit-btn') ||
    Array.from(container.querySelectorAll('button')).find((entry) => entry.textContent?.includes('提交'))
  if (!button) throw new Error('Unable to find submit button.')
  return button
}

function getInlineActionButton(container) {
  const button = container.querySelector('.question-inline-actions button')
  if (!button) throw new Error('Unable to find inline action button.')
  return button
}

function getCompositeRevealButtons(container) {
  const buttons = [...container.querySelectorAll('.question-inline-actions button')]
  if (!buttons.length) throw new Error('Unable to find composite reveal button.')
  return buttons
}

function getRelationalAlgebraGradeButton(container) {
  const button =
    container.querySelector('.rel-algebra-subquestion-card.focused .rel-algebra-grade-btn') ||
    container.querySelector('.rel-algebra-grade-btn')
  if (!button) throw new Error('Unable to find relational algebra grade button.')
  return button
}

function setNativeInputValue(input, value) {
  const prototype =
    input instanceof window.HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype
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
          {
            id: 'library-entry-auto',
            profileId,
            subject,
            paperId: 'paper-auto-advance',
            title: 'Workspace auto advance smoke',
            rawText: 'auto-advance-fixture',
            importedAt: Date.now(),
          },
        ]
      }
      return []
    })

    buildQuizDocumentFromTextMock.mockImplementation((rawText) =>
      rawText === 'auto-advance-fixture' ? autoAdvanceQuizDocument : richQuizDocument
    )

    gradeRelationalAlgebraSubquestionAttemptMock.mockImplementation(async ({ subQuestion, userAnswer }) => ({
      questionId: `ra_auto:${subQuestion.id}`,
      subquestionId: String(subQuestion.id),
      verdict: 'correct',
      equivalent: true,
      score: Number(subQuestion.score) || 0,
      maxScore: Number(subQuestion.score) || 0,
      completion: 100,
      confidence: 100,
      feedback: `${String(userAnswer || '').trim()} matches the reference semantics.`,
      strengths: [],
      weaknesses: [],
      suggestions: [],
      earned_points: ['表达式语义正确'],
      missing_points: [],
      error_points: [],
      normalizedReference: subQuestion.reference_answer,
      normalizedUserAnswer: String(userAnswer || '').trim(),
    }))
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('covers cloze, reading and composite interactions from navigation to submit', async () => {
    const { container, root } = await renderWorkspace('/workspace/english?paper=paper-rich&mode=practice')

    await waitFor(() => container.textContent?.includes('Complete the cloze passage.'))
    expect(container.textContent).toContain('(1) ______')
    expect(container.textContent).toContain('(2) ______')

    await act(async () => {
      findButtonByText(container, 'with').click()
      findButtonByText(container, 'has').click()
    })

    await waitFor(() => container.querySelector('.question-inline-actions button'))
    await act(async () => {
      getInlineActionButton(container).click()
    })

    await waitFor(() => container.textContent?.includes('cloze-rationale-1'))
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

    await act(async () => {
      const chips = container.querySelectorAll('.composite-subquestion-chip')
      chips[1]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    await waitFor(() => container.textContent?.includes('Composite fill blank'))

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

  it('auto advances through nested subquestions before moving to the next top-level item', async () => {
    loadPreferenceMock.mockImplementation((key) => (key === 'quiz:pref:autoAdvance' ? 'true' : null))

    const { container, root } = await renderWorkspace('/workspace/english?paper=paper-auto-advance&mode=practice')

    await waitFor(() => container.textContent?.includes('Complete the cloze passage.'))

    await act(async () => {
      findButtonByText(container, 'starts').click()
    })
    await waitFor(() => container.querySelector('.answer-review-card.focused')?.textContent?.includes('2'))
    expect(container.textContent).toContain('Complete the cloze passage.')

    await act(async () => {
      findButtonByText(container, 'moves').click()
    })
    await waitFor(() => container.querySelector('.question-inline-actions button'))
    await act(async () => {
      getInlineActionButton(container).click()
    })
    await waitFor(() => container.textContent?.includes('Auto advance reading passage.'))

    await act(async () => {
      findButtonByText(container, 'Correct 1').click()
    })
    await waitFor(() => container.querySelector('.reading-question-item.focused')?.textContent?.includes('Reading auto 2'))
    expect(container.textContent).toContain('Auto advance reading passage.')

    await act(async () => {
      findButtonByText(container, 'Correct 2').click()
    })
    await waitFor(() => container.textContent?.includes('Composite auto root'))

    await act(async () => {
      findButtonByText(container, 'Correct A').click()
      findButtonByText(container, 'Correct C').click()
    })
    await act(async () => {
      getCompositeRevealButtons(container)[0].click()
    })
    await waitFor(() => container.querySelector('.answer-review-card.focused')?.textContent?.includes('Composite auto blank'))
    expect(container.textContent).toContain('Composite auto root')

    const compositeInput = container.querySelector('.fill-blank-input')
    expect(compositeInput).not.toBeNull()
    await act(async () => {
      setNativeInputValue(compositeInput, 'heap')
    })
    await act(async () => {
      getCompositeRevealButtons(container)[0].click()
    })
    await waitFor(() => container.textContent?.includes('Use relational algebra to answer the following.'))

    await waitFor(() =>
      container.querySelector('.rel-algebra-subquestion-card.focused')?.textContent?.includes('Relational algebra part 1')
    )
    await act(async () => {
      container.querySelector('.rel-algebra-subquestion-card.focused .rel-algebra-subquestion-head')?.click()
    })
    await waitFor(() => container.querySelectorAll('.rel-algebra-editor').length > 0)
    let raTextareas = container.querySelectorAll('.rel-algebra-editor')
    expect(raTextareas.length).toBeGreaterThan(0)
    await act(async () => {
      setNativeInputValue(raTextareas[0], 'π[学号](学生)')
    })
    await act(async () => {
      getRelationalAlgebraGradeButton(container).click()
    })
    await waitFor(() => gradeRelationalAlgebraSubquestionAttemptMock.mock.calls.length === 1)
    await waitFor(() =>
      container.querySelector('.rel-algebra-subquestion-card.focused')?.textContent?.includes('Relational algebra part 2')
    )

    raTextareas = container.querySelectorAll('.rel-algebra-editor')
    await act(async () => {
      setNativeInputValue(raTextareas[1], 'π[姓名](学生)')
    })
    await act(async () => {
      getRelationalAlgebraGradeButton(container).click()
    })
    await waitFor(() => gradeRelationalAlgebraSubquestionAttemptMock.mock.calls.length === 2)
    await waitFor(() => container.textContent?.includes('Final single choice'))

    await act(async () => {
      root.unmount()
    })
  })
})
