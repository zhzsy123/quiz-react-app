/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

const useAiControlCenterStateMock = vi.fn()

vi.mock('../features/ai-center/model/useAiControlCenterState', () => ({
  useAiControlCenterState: (...args) => useAiControlCenterStateMock(...args),
}))

import AiControlCenterPage from './AiControlCenterPage.jsx'

async function renderComponent() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(
      <MemoryRouter>
        <AiControlCenterPage />
      </MemoryRouter>
    )
  })

  return { container, root }
}

describe('AiControlCenterPage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('renders usage summary and pricing info', async () => {
    useAiControlCenterStateMock.mockReturnValue({
      activeProfile: { id: 'profile-1', name: 'Vorin' },
      loading: false,
      error: '',
      config: {
        apiKey: 'sk-test',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-reasoner',
        usdCnyRate: '7.2',
      },
      setConfig: vi.fn(),
      savingConfig: false,
      summary: {
        totalCalls: 3,
        successRate: 100,
        totalTokens: 1500,
        promptTokens: 1000,
        completionTokens: 500,
        reasoningTokens: 300,
        promptCacheHitTokens: 200,
        promptCacheMissTokens: 800,
        totalCny: 0.12,
      },
      summaryCards: [
        { label: 'AI 调用次数', value: '3' },
        { label: '成功率', value: '100%' },
      ],
      pricingCards: [{ label: '输出价', value: '$0.420000', help: '按每 100 万 tokens 估算' }],
      pricingEffectiveDate: '2026-04-09',
      availableModels: ['deepseek-reasoner', 'deepseek-chat'],
      maskedApiKey: 'sk-t***test',
      usageRows: [
        {
          id: 'usage-1',
          featureLabel: 'AI 出题',
          title: '英语 AI 生成题目',
          status: 'completed',
          startedAtLabel: '2026/4/9 12:00:00',
          model: 'deepseek-reasoner',
          mode: 'json',
          usage: { promptTokens: 100, completionTokens: 50, promptCacheHitTokens: 20 },
          totalCnyLabel: '¥0.0100',
          errorMessage: '',
        },
      ],
      tokenizerText: '',
      setTokenizerText: vi.fn(),
      tokenizerState: { loading: false, error: '', tokenCount: 0 },
      handleSaveConfig: vi.fn(),
      handleClearRecords: vi.fn(),
      handleCountTokens: vi.fn(),
      refreshRecords: vi.fn(),
    })

    const { container, root } = await renderComponent()

    expect(container.textContent).toContain('AI 控制中心')
    expect(container.textContent).toContain('AI 调用记录')
    expect(container.textContent).toContain('AI 出题')
    expect(container.textContent).toContain('DeepSeek 默认模型：deepseek-reasoner')

    await act(async () => {
      root.unmount()
    })
  })
})
