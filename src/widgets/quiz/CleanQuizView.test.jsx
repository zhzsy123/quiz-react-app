/* @vitest-environment jsdom */

import React from 'react'
import { act } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { createRoot } from 'react-dom/client'
import CleanQuizView from './CleanQuizView.jsx'

async function renderComponent(element) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)

  await act(async () => {
    root.render(element)
  })

  return { container, root }
}

function noop() {}

describe('CleanQuizView', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders a fallback message instead of returning a blank screen for empty quizzes', async () => {
    const { container, root } = await renderComponent(
      <CleanQuizView
        quiz={{ items: [] }}
        answers={{}}
        submitted={false}
        currentIndex={0}
        mode="practice"
        autoAdvance={false}
        remainingSeconds={0}
        isPaused={false}
        revealedMap={{}}
        isFavorite={false}
        onToggleFavorite={noop}
        onToggleAutoAdvance={noop}
        onTogglePracticeWrongBook={noop}
        onToggleExamWrongBook={noop}
        onTogglePause={noop}
        practiceWritesWrongBook
        examWritesWrongBook
        onJump={noop}
        onPrev={noop}
        onNext={noop}
        onSelectOption={noop}
        onRevealCurrentObjective={noop}
        onSelectReadingOption={noop}
        onFillBlankChange={noop}
        onTextChange={noop}
        aiReview={null}
        aiQuestionReviewMap={{}}
        aiExplainMap={{}}
        aiExplainMode="standard"
        aiPracticeModal={null}
        onChangeAiExplainMode={noop}
        onExplainQuestion={noop}
        onExplainWhyWrong={noop}
        onGenerateSimilarQuestions={noop}
        onCloseAiPracticeModal={noop}
        onSubmit={noop}
        onSelectCompositeOption={noop}
        onCompositeFillBlankChange={noop}
        onCompositeTextChange={noop}
        onRevealCompositeQuestion={noop}
      />
    )

    expect(container.textContent).toContain('当前试卷没有可渲染的题目')

    await act(async () => {
      root.unmount()
    })
  })
})
