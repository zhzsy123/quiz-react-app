/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useFileHubPageStateMock = vi.fn()

vi.mock('../features/file-hub/model/useFileHubPageState', () => ({
  useFileHubPageState: (...args) => useFileHubPageStateMock(...args),
}))

vi.mock('../widgets/quiz-importer/QuizImporter', () => ({
  default: function MockQuizImporter() {
    return <div data-testid="mock-importer">Mock importer</div>
  },
}))

vi.mock('../widgets/question-generator/AiQuestionGeneratorDialog.jsx', () => ({
  default: function MockAiQuestionGeneratorDialog({ open }) {
    return open ? <div data-testid="mock-generator-dialog">Generator dialog</div> : null
  },
}))

import FileHubPage from './FileHubPage.jsx'

async function renderComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter>
        <FileHubPage />
      </MemoryRouter>
    )
  })

  return { container, root }
}

describe('FileHubPage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders file hub actions and local library entries', async () => {
    useFileHubPageStateMock.mockReturnValue({
      activeProfile: { id: 'profile-1', name: 'Vorin' },
      subjectMeta: {
        key: 'english',
        shortLabel: '英语',
        label: '英语模考系统 V2.0',
      },
      loading: false,
      query: '',
      setQuery: vi.fn(),
      filteredEntries: [
        {
          id: 'entry-1',
          paperId: 'paper-1',
          title: '英语模拟卷一',
          questionCount: 32,
          updatedAt: Date.now(),
          schemaVersion: 'v1',
          tags: ['阅读', '作文'],
        },
      ],
      handleQuizLoaded: vi.fn(),
      handleRename: vi.fn(),
      handleTags: vi.fn(),
      handleDelete: vi.fn(),
      openWorkspace: vi.fn(),
      generator: {
        open: false,
        config: {},
        status: 'idle',
        error: '',
        summary: null,
        draftQuestions: [],
        setOpen: vi.fn(),
        setConfig: vi.fn(),
        stopGeneration: vi.fn(),
        resetGenerator: vi.fn(),
        removeQuestion: vi.fn(),
      },
      openGeneratorDialog: vi.fn(),
      startGenerator: vi.fn(),
      saveGeneratedPaper: vi.fn(),
      startPracticeWithGeneratedPaper: vi.fn(),
    })

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('英语本地题库')
    expect(container.textContent).toContain('AI 生成题目')
    expect(container.textContent).toContain('英语模拟卷一')
    expect(container.textContent).toContain('刷题模式')
    expect(container.textContent).toContain('考试模式')

    await act(async () => {
      root.unmount()
    })
  })
})
