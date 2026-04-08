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
})
