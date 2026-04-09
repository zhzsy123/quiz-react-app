/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useWrongBookPageStateMock = vi.fn()

vi.mock('../features/wrong-book/model/useWrongBookPageState', async () => {
  const actual = await vi.importActual('../features/wrong-book/model/useWrongBookPageState')
  return {
    ...actual,
    useWrongBookPageState: (...args) => useWrongBookPageStateMock(...args),
  }
})

vi.mock('../entities/subject/model/subjects', async () => {
  const actual = await vi.importActual('../entities/subject/model/subjects')
  return {
    ...actual,
    SUBJECT_REGISTRY: [
      { key: 'english', label: '英语模考系统 V2.0', shortLabel: '英语' },
      { key: 'international_trade', label: '国际贸易模考系统 V1.0', shortLabel: '国际贸易' },
    ],
    getSubjectMeta: (subject) =>
      subject === 'international_trade'
        ? { key: 'international_trade', shortLabel: '国际贸易' }
        : { key: 'english', shortLabel: '英语' },
    getQuestionTypeMeta: (type) =>
      ({
        single_choice: { key: 'single_choice', label: '单项选择题' },
        case_analysis: { key: 'case_analysis', label: '案例分析题' },
      })[type] || { key: type, label: type },
  }
})

import WrongBookPage from './WrongBookPage.jsx'

async function renderComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter>
        <WrongBookPage />
      </MemoryRouter>
    )
  })

  return { container, root }
}

describe('WrongBookPage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders subject-aware type options and wrongbook list', async () => {
    useWrongBookPageStateMock.mockReturnValue({
      filteredWrongItems: [
        {
          questionKey: 'international_trade:paper-1:q1',
          subject: 'international_trade',
          prompt: '根据案例分析买方是否有权拒收。',
          category: 'case_analysis',
          wrongTimes: 2,
          lastWrongAt: Date.now(),
          paperTitle: '国际贸易模拟卷一',
          userAnswerLabel: '认为无权拒收',
          correctAnswerLabel: '有权拒收',
          rationale: '应结合迟延交单的后果判断。',
        },
      ],
      subjectFilter: 'international_trade',
      setSubjectFilter: vi.fn(),
      typeFilter: 'all',
      setTypeFilter: vi.fn(),
      typeOptions: [
        { key: 'single_choice', label: '单项选择题' },
        { key: 'case_analysis', label: '案例分析题' },
      ],
      query: '',
      setQuery: vi.fn(),
      practiceMode: false,
      setPracticeMode: vi.fn(),
      practiceIndex: 0,
      setPracticeIndex: vi.fn(),
      selectedAnswer: '',
      feedback: '',
      displayPracticeItem: null,
      holdSolvedItem: null,
      selectedKeys: [],
      wrongSummary: {
        totalWrongRecords: 2,
        uniqueWrongQuestions: 1,
        filteredCount: 1,
        latestWrongAt: Date.now(),
      },
      handleRemove: vi.fn(),
      handleToggleSelected: vi.fn(),
      handleSelectAllFiltered: vi.fn(),
      handleClearSelected: vi.fn(),
      handleRemoveSelected: vi.fn(),
      handleRemoveAllFiltered: vi.fn(),
      handlePracticeAnswer: vi.fn(),
      handleAdvanceAfterSolved: vi.fn(),
      resetPractice: vi.fn(),
    })

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('错题本')
    expect(container.textContent).toContain('全部题型')
    expect(container.textContent).toContain('案例分析题')
    expect(container.textContent).toContain('国际贸易模拟卷一')

    await act(async () => {
      root.unmount()
    })
  })
})
