/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useSubjectWorkspaceStateMock = vi.fn()
const cleanQuizViewSpy = vi.fn()
const buildQuizExportMarkdownMock = vi.fn(() => '# 导出内容')
const downloadTextFileMock = vi.fn()

vi.mock('../features/workspace/model/useSubjectWorkspaceState', () => ({
  useSubjectWorkspaceState: (...args) => useSubjectWorkspaceStateMock(...args),
}))

vi.mock('../widgets/quiz/CleanQuizView', () => ({
  default: function MockCleanQuizView(props) {
    cleanQuizViewSpy(props)
    return <div data-testid="mock-clean-quiz-view">Mock clean quiz view</div>
  },
}))

vi.mock('../entities/quiz/lib/export/buildQuizExportMarkdown', () => ({
  buildQuizExportMarkdown: (...args) => buildQuizExportMarkdownMock(...args),
}))

vi.mock('../shared/lib/export/downloadFile', () => ({
  downloadTextFile: (...args) => downloadTextFileMock(...args),
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

function buildWorkspaceState(overrides = {}) {
  return {
    loading: false,
    loadError: '',
    entry: { title: '综合题测试卷', subject: 'data_structure' },
    quiz: { title: '综合题测试卷', subject: 'data_structure', items: [{ id: 'q1', prompt: '题目 1' }] },
    mode: 'practice',
    subjectMeta: { shortLabel: '数据结构' },
    answers: {},
    relationalAlgebraExpandedMap: {},
    subQuestionFocusMap: {},
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
    handleSelectCompositeOption: vi.fn(),
    handleRevealCurrentObjective: vi.fn(),
    handleRevealCompositeQuestion: vi.fn(),
    handleSelectReadingOption: vi.fn(),
    handleSelectClozeOption: vi.fn(),
    handleFillBlankChange: vi.fn(),
    handleCompositeFillBlankChange: vi.fn(),
    handleRelationalAlgebraTextChange: vi.fn(),
    handleToggleRelationalAlgebraSubQuestion: vi.fn(),
    handleRevealRelationalAlgebraQuestion: vi.fn(),
    handleFocusSubQuestion: vi.fn(),
    handleTextChange: vi.fn(),
    handleCompositeTextChange: vi.fn(),
    handleReset: vi.fn(),
    handleChangeAiExplainMode: vi.fn(),
    handleExplainQuestionWithMode: vi.fn(),
    handleExplainWhyWrong: vi.fn(),
    handleGenerateSimilarQuestions: vi.fn(),
    handleCloseAiPracticeModal: vi.fn(),
    handleFinish: vi.fn(),
    ...overrides,
  }
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

    useSubjectWorkspaceStateMock.mockReturnValue(
      buildWorkspaceState({
        handleSelectCompositeOption,
        handleRevealCompositeQuestion,
        handleCompositeFillBlankChange,
        handleCompositeTextChange,
      })
    )

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

  it('exports the current paper after submission', async () => {
    useSubjectWorkspaceStateMock.mockReturnValue(
      buildWorkspaceState({
        submitted: true,
        answers: { q1: 'A' },
        score: 8,
        paperTotalScore: 10,
      })
    )

    const { container, root } = await renderComponent()
    const exportButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('导出本卷')
    )

    expect(exportButton).toBeTruthy()

    await act(async () => {
      exportButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(buildQuizExportMarkdownMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submitted: true,
        score: 8,
        paperTotalScore: 10,
      })
    )
    expect(downloadTextFileMock).toHaveBeenCalledWith(
      expect.stringContaining('综合题测试卷-导出.md'),
      '# 导出内容'
    )

    await act(async () => {
      root.unmount()
    })
  })
})
