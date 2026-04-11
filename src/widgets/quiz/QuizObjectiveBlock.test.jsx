/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import QuizObjectiveBlock from './QuizObjectiveBlock.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

describe('QuizObjectiveBlock', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('reveals the correct answer and rationale after exam submission even without practice reveal state', async () => {
    const item = {
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
    }

    const { container, root } = await renderComponent(
      <QuizObjectiveBlock
        item={item}
        userResponse="B"
        objectiveReveal={false}
        submitted
        disabled={false}
        mode="exam"
        onSelectOption={() => {}}
        onRevealCurrentObjective={() => {}}
        onFillBlankChange={() => {}}
      />
    )

    expect(container.textContent).toContain('正确答案')
    expect(container.textContent).toContain('A. Correct answer')
    expect(container.textContent).toContain('Because A is correct.')

    await act(async () => {
      root.unmount()
    })
  })
})
