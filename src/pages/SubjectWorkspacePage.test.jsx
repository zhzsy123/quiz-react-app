/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useSubjectWorkspaceStateMock = vi.fn()
const cleanQuizViewSpy = vi.fn()

vi.mock('../features/workspace/model/useSubjectWorkspaceState', () => ({
  useSubjectWorkspaceState: (...args) => useSubjectWorkspaceStateMock(...args),
}))

vi.mock('../widgets/quiz/CleanQuizView', () => ({
  default: function MockCleanQuizView(props) {
    cleanQuizViewSpy(props)
    return <div data-testid="mock-clean-quiz-view">Mock clean quiz view</div>
  },
}))

import SubjectWorkspacePage from './SubjectWorkspacePage.jsx'

async function renderComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter>
        <SubjectWorkspacePage />
      </MemoryRouter>
    )
  })

  return { container, root }
}

describe('SubjectWorkspacePage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('passes composite handlers through to CleanQuizView', async () => {
    const handleSelectCompositeOption = vi.fn()
    const handleRevealCompositeQuestion = vi.fn()
    const handleCompositeFillBlankChange = vi.fn()
    const handleCompositeTextChange = vi.fn()

    useSubjectWorkspaceStateMock.mockReturnValue({
      loading: false,
      loadError: '',
      entry: { title: '综合题测试卷' },
      quiz: { items: [{ id: 'q1', prompt: '题目 1' }] },
      mode: 'practice',
      subjectMeta: { shortLabel: '数据结构' },
      answers: {},
      revealedMap: {},
      submitted: false,
      score: 0,
      aiReview: null,
      aiQuestionReviewMap: {},
      aiExplainMap: {},
      aiExplainMode: 'standard',
      aiPracticeModal: null,
      currentIndex: 0,
      autoAdvance: false,
      practiceWritesWrongBook: true,
      examWritesWrongBook: true,
      spoilerExpanded: false,
      remainingSeconds: 0,
      remainingTimeLabel: '00:00',
      isPaused: false,
      practiceAccuracy: { rate: 0 },
      objectiveTotalScore: 0,
      paperTotalScore: 0,
      subjectivePendingScore: 0,
      isCurrentFavorite: false,
      backLink: '/exam/data-structure',
      handleToggleFavorite: vi.fn(),
      handleToggleSpoiler: vi.fn(),
      handleToggleAutoAdvance: vi.fn(),
      handleTogglePracticeWrongBook: vi.fn(),
      handleToggleExamWrongBook: vi.fn(),
      handleTogglePause: vi.fn(),
      handleJump: vi.fn(),
      handlePrev: vi.fn(),
      handleNext: vi.fn(),
      handleSelectOption: vi.fn(),
      handleSelectCompositeOption,
      handleRevealCurrentObjective: vi.fn(),
      handleRevealCompositeQuestion,
      handleSelectReadingOption: vi.fn(),
      handleFillBlankChange: vi.fn(),
      handleCompositeFillBlankChange,
      handleTextChange: vi.fn(),
      handleCompositeTextChange,
      handleReset: vi.fn(),
      handleChangeAiExplainMode: vi.fn(),
      handleExplainQuestionWithMode: vi.fn(),
      handleExplainWhyWrong: vi.fn(),
      handleGenerateSimilarQuestions: vi.fn(),
      handleCloseAiPracticeModal: vi.fn(),
      handleFinish: vi.fn(),
    })

    const { root } = await renderComponent()
    const props = cleanQuizViewSpy.mock.calls[0][0]

    expect(props.onSelectCompositeOption).toBe(handleSelectCompositeOption)
    expect(props.onRevealCompositeQuestion).toBe(handleRevealCompositeQuestion)
    expect(props.onCompositeFillBlankChange).toBe(handleCompositeFillBlankChange)
    expect(props.onCompositeTextChange).toBe(handleCompositeTextChange)

    await act(async () => {
      root.unmount()
    })
  })
})
