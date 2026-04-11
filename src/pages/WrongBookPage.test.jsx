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

const listAllWrongbookEntriesMock = vi.fn(async () => [])

vi.mock('../app/providers/AppContext', () => ({
  useAppContext: () => ({
    activeProfileId: 'profile-1',
  }),
}))

vi.mock('../entities/wrongbook/api/wrongbookRepository', () => ({
  listAllWrongbookEntries: (...args) => listAllWrongbookEntriesMock(...args),
}))

vi.mock('../entities/subject/model/subjects', async () => {
  const actual = await vi.importActual('../entities/subject/model/subjects')
  return {
    ...actual,
    SUBJECT_REGISTRY: [
      { key: 'english', label: '英语', shortLabel: '英语' },
      { key: 'international_trade', label: '国际贸易', shortLabel: '国际贸易' },
    ],
    getSubjectMeta: (subject) =>
      subject === 'international_trade'
        ? { key: 'international_trade', shortLabel: '国际贸易', route: '/exam/international_trade' }
        : { key: 'english', shortLabel: '英语', route: '/exam/english' },
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
    listAllWrongbookEntriesMock.mockResolvedValue([])
  })

  it('renders subject-aware type options and tolerates object-like wrongbook display fields', async () => {
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
          correctAnswerLabel: { label: '有权拒收' },
          rationale: { text: '应结合延期交单的后果判断。' },
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
      selectedChoices: [],
      blankAnswers: {},
      blankFeedback: [],
      feedback: '',
      displayPracticeItem: null,
      holdSolvedItem: null,
      isBlankPracticeItem: false,
      isClozePracticeItem: false,
      isMultipleChoicePracticeItem: false,
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
      handleTogglePracticeChoice: vi.fn(),
      handlePracticeBlankChange: vi.fn(),
      handlePracticeClozeAnswer: vi.fn(),
      handleCheckPracticeBlank: vi.fn(),
      handleCheckPracticeObjective: vi.fn(),
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

  it('re-sanitizes malformed rows from hook output before render', async () => {
    useWrongBookPageStateMock.mockReturnValue({
      filteredWrongItems: [
        {
          questionKey: 'q1',
          subject: { broken: true },
          prompt: { text: '对象题干' },
          category: { strange: true },
          wrongTimes: '2',
          paperTitle: { text: '对象试卷' },
          correctAnswer: { label: 'A. 正确' },
          rationale: { text: '对象解析' },
          options: [{ key: 'A', text: '选项 A' }],
        },
      ],
      subjectFilter: 'all',
      setSubjectFilter: vi.fn(),
      typeFilter: 'all',
      setTypeFilter: vi.fn(),
      typeOptions: [],
      query: '',
      setQuery: vi.fn(),
      practiceMode: false,
      setPracticeMode: vi.fn(),
      practiceIndex: 0,
      setPracticeIndex: vi.fn(),
      selectedAnswer: '',
      selectedChoices: [],
      blankAnswers: {},
      blankFeedback: [],
      feedback: '',
      displayPracticeItem: null,
      holdSolvedItem: null,
      isBlankPracticeItem: false,
      isClozePracticeItem: false,
      isMultipleChoicePracticeItem: false,
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
      handleTogglePracticeChoice: vi.fn(),
      handlePracticeBlankChange: vi.fn(),
      handlePracticeClozeAnswer: vi.fn(),
      handleCheckPracticeBlank: vi.fn(),
      handleCheckPracticeObjective: vi.fn(),
      handleAdvanceAfterSolved: vi.fn(),
      resetPractice: vi.fn(),
    })

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('对象题干')
    expect(container.textContent).toContain('对象试卷')
    expect(container.textContent).toContain('对象解析')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows a fallback card instead of white screen when page render throws', async () => {
    useWrongBookPageStateMock.mockImplementation(() => {
      throw new Error('bad wrongbook payload')
    })
    listAllWrongbookEntriesMock.mockResolvedValue([
      {
        questionKey: 'q-safe',
        subject: 'international_trade',
        prompt: '安全模式题干',
        category: 'case_analysis',
        paperTitle: '安全模式试卷',
        correctAnswerLabel: '有权拒收',
        rationale: '安全模式解析',
      },
    ])

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('错题本暂时无法渲染')
    expect(container.textContent).toContain('页面已阻止白屏')
    expect(container.textContent).toContain('安全模式题干')
    expect(container.textContent).toContain('安全模式解析')

    await act(async () => {
      root.unmount()
    })
  })
})
