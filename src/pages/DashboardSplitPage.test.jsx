/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useDashboardSplitPageStateMock = vi.fn()

vi.mock('../features/dashboard/model/useDashboardSplitPageState', () => ({
  useDashboardSplitPageState: (...args) => useDashboardSplitPageStateMock(...args),
}))

import DashboardSplitPage from './DashboardSplitPage.jsx'

async function renderComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter>
        <DashboardSplitPage />
      </MemoryRouter>
    )
  })

  return { container, root }
}

describe('DashboardSplitPage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders clean dashboard copy and download groups', async () => {
    useDashboardSplitPageStateMock.mockReturnValue({
      profiles: [{ id: 'profile-1', name: 'Vorin' }],
      activeProfile: { id: 'profile-1', name: 'Vorin' },
      activeProfileId: 'profile-1',
      loading: false,
      newProfileName: '',
      setNewProfileName: vi.fn(),
      showCreateProfile: false,
      setShowCreateProfile: vi.fn(),
      showDownloadDialog: true,
      setShowDownloadDialog: vi.fn(),
      dashboardState: { attempts: [], totalQuestionVolume: 64, totalWrong: 12 },
      subjectSummaries: [
        {
          key: 'english',
          shortLabel: '英语',
          description: '支持英语题库导入、刷题模式、考试模式、历史记录、错题本与 AI 辅助。',
          route: '/exam/english',
          attemptCount: 2,
          averageRate: 78,
        },
      ],
      latestAttempt: { title: '最近一次英语模考', objectiveScore: 90, objectiveTotal: 120 },
      spotlightStats: [
        { label: '历史考试', value: '2 次' },
        { label: '平均正确率', value: '78%' },
      ],
      downloadGroups: [
        {
          subjectKey: 'english',
          subjectLabel: '英语模考系统 V2.0',
          questionTypeSummary: '单项选择题、完形填空、阅读理解、翻译题、作文题',
          items: [
            {
              key: 'english-json-spec',
              title: '英语试题 JSON 解析规范文档',
              href: './json-schema.md',
              filename: '英语试题 JSON 解析规范文档.md',
              description: '支持单选、完形填空、阅读理解、翻译题和作文题。',
            },
          ],
        },
      ],
      switchProfile: vi.fn(),
      handleCreateProfile: vi.fn(),
      handleRenameProfile: vi.fn(),
      handleUpdateApiKey: vi.fn(),
    })

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('智能在线模考系统 V2.0')
    expect(container.textContent).toContain('按科目下载规范，再交给 AI 清洗成可导入的 JSON')
    expect(container.textContent).toContain('英语试题 JSON 解析规范文档')

    await act(async () => {
      root.unmount()
    })
  })
})
