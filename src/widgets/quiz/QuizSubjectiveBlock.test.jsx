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
      <QuizSubjectiveBlock
        item={malformedReading}
        response={{}}
        submitted={false}
        isPaused={false}
        mode="practice"
        revealedMap={{}}
        focusSubQuestionId=""
        onFocusSubQuestion={() => {}}
        onSelectReadingOption={() => {}}
        aiExplainMap={{}}
        onExplainQuestion={() => {}}
        onSelectCompositeOption={() => {}}
        onCompositeFillBlankChange={() => {}}
        onCompositeTextChange={() => {}}
        onRevealCompositeQuestion={() => {}}
        onFillBlankChange={() => {}}
        onTextChange={() => {}}
      />
    )

    expect(container.textContent).toContain('当前阅读题缺少可作答的小题')

    await act(async () => {
      root.unmount()
    })
  })
})
