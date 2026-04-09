/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import QuizSubjectiveBlock from './QuizSubjectiveBlock.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

function createBaseProps(item, extraProps = {}) {
  return {
    item,
    response: {},
    submitted: false,
    isPaused: false,
    mode: 'practice',
    revealedMap: {},
    focusSubQuestionId: '',
    onFocusSubQuestion: () => {},
    onSelectReadingOption: () => {},
    onSelectClozeOption: () => {},
    onRevealCurrentObjective: () => {},
    aiExplainMap: {},
    onExplainQuestion: () => {},
    onSelectCompositeOption: () => {},
    onCompositeFillBlankChange: () => {},
    onCompositeTextChange: () => {},
    onRevealCompositeQuestion: () => {},
    onFillBlankChange: () => {},
    onTextChange: () => {},
    ...extraProps,
  }
}

describe('QuizSubjectiveBlock', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a fallback state instead of crashing for malformed reading questions', async () => {
    const malformedReading = {
      id: 'reading_1',
      type: 'reading',
      passage: {
        title: 'Reading passage',
        content: 'A short passage.',
      },
      questions: null,
    }

    const { container, root } = await renderComponent(
      <QuizSubjectiveBlock {...createBaseProps(malformedReading)} />
    )

    expect(container.textContent).toContain('当前阅读题缺少可作答的小题，无法继续作答。')

    await act(async () => {
      root.unmount()
    })
  })

  it('shows translation context as source text', async () => {
    const translation = {
      id: 'translation_1',
      type: 'translation',
      prompt: 'Translate the paragraph.',
      direction: 'en_to_zh',
      source_text: 'This is the source paragraph.',
      answer: {
        type: 'subjective',
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(translation)} />)

    expect(container.textContent).toContain('英译中')
    expect(container.textContent).toContain('Translate the paragraph.')
    expect(container.textContent).toContain('This is the source paragraph.')

    await act(async () => {
      root.unmount()
    })
  })

  it('renders essay scoring points', async () => {
    const essay = {
      id: 'essay_1',
      type: 'essay',
      prompt: 'Write an essay.',
      score: 30,
      answer: {
        type: 'subjective',
        scoring_points: ['切题', '结构完整', '表达连贯'],
      },
    }

    const { container, root } = await renderComponent(<QuizSubjectiveBlock {...createBaseProps(essay)} />)

    expect(container.textContent).toContain('评分要点')
    expect(container.textContent).toContain('切题')
    expect(container.textContent).toContain('结构完整')
    expect(container.textContent).toContain('表达连贯')

    await act(async () => {
      root.unmount()
    })
  })
})
