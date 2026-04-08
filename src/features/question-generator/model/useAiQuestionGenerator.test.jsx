/* @vitest-environment jsdom */

import React, { useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'
import { useAiQuestionGenerator } from './useAiQuestionGenerator'

function Harness({ options, onState }) {
  const state = useAiQuestionGenerator(options)

  useEffect(() => {
    onState(state)
  }, [onState, state])

  return null
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function mountHarness(options = {}) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const stateRef = { current: null }

  await act(async () => {
    root.render(<Harness options={options} onState={(state) => { stateRef.current = state }} />)
  })

  return { root, container, stateRef }
}

describe('useAiQuestionGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('streams questions through quizPipeline normalization and marks draft statuses', async () => {
    const generateQuestions = vi.fn(async ({ onQuestion, onComplete }) => {
      onQuestion({
        id: 'q1',
        type: 'single_choice',
        prompt: 'Pick one',
        options: ['A. One', 'B. Two'],
        answer: { correct: 'B' },
      })
      onQuestion(
        {
          id: 'q2',
          type: 'unknown_type',
          prompt: 'Broken question',
        },
        {
          entry: {
            status: 'invalid',
            rawQuestion: {
              id: 'q2',
              type: 'unknown_type',
              prompt: 'Broken question',
            },
            normalizedQuestion: null,
            normalizedItems: [],
            preview: {
              id: 'q2',
              type: 'unknown_type',
              subject: 'english',
            },
            error: 'invalid generated question',
          },
        }
      )
      onComplete({ status: 'ready' })
    })

    const { root, container, stateRef } = await mountHarness({ generateQuestions })

    await act(async () => {
      await stateRef.current.startGeneration({
        config: { title: 'Draft paper', subject: 'english' },
        meta: { source: 'ai' },
      })
    })

    await flushAsyncWork()

    expect(generateQuestions).toHaveBeenCalledTimes(1)
    expect(stateRef.current.status).toBe('ready')
    expect(stateRef.current.open).toBe(true)
    expect(stateRef.current.draftQuestions).toHaveLength(2)
    expect(stateRef.current.draftQuestions[0]).toEqual(
      expect.objectContaining({
        status: 'valid',
        preview: expect.objectContaining({
          id: 'q1',
          type: 'single_choice',
          subject: 'english',
        }),
      })
    )
    expect(stateRef.current.draftQuestions[1]).toEqual(
      expect.objectContaining({
        status: 'invalid',
        error: 'invalid generated question',
      })
    )
    expect(stateRef.current.summary).toEqual({
      total: 2,
      valid: 1,
      warning: 0,
      invalid: 1,
    })

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('blocks saving when no valid generated question remains, then saves once a valid question exists', async () => {
    const onSaveGeneratedPaper = vi.fn(async (draftPaper) => ({
      saved: true,
      draftPaper,
      id: 'paper-1',
    }))
    const buildDraftPaper = vi.fn(({ draftQuestions = [] }) => ({
      questions: draftQuestions.filter((entry) => entry?.status === 'valid').map((entry) => entry.rawQuestion),
      items: draftQuestions.filter((entry) => entry?.status === 'valid').map((entry) => entry.rawQuestion),
      title: 'Generated paper',
    }))
    const generateQuestions = vi.fn(async ({ onQuestion, onComplete }) => {
      onQuestion({
        id: 'q1',
        type: 'single_choice',
        prompt: 'Pick the correct option',
        options: ['A. One', 'B. Two'],
        answer: { correct: 'B' },
      })
      onComplete({ status: 'ready' })
    })

    const { root, container, stateRef } = await mountHarness({
      generateQuestions,
      onSaveGeneratedPaper,
      buildDraftPaper,
    })

    await act(async () => {
      await stateRef.current.startGeneration({
        config: { title: 'Paper', subject: 'english' },
      })
    })

    await act(async () => {
      stateRef.current.removeQuestion('q1')
    })

    expect(stateRef.current.draftQuestions).toHaveLength(0)

    let emptySaveError = null
    try {
      await stateRef.current.saveGeneratedPaper()
    } catch (error) {
      emptySaveError = error
    }

    expect(emptySaveError).toBeTruthy()
    expect(emptySaveError.message).toContain('当前没有可保存的有效题目')
    expect(onSaveGeneratedPaper).toHaveBeenCalledTimes(0)
    expect(buildDraftPaper).toHaveBeenCalled()

    await act(async () => {
      await stateRef.current.startGeneration({
        config: { title: 'Paper', subject: 'english' },
      })
    })

    await flushAsyncWork()
    expect(stateRef.current.draftQuestions).toHaveLength(1)

    let saveResult = null
    await act(async () => {
      saveResult = await stateRef.current.saveGeneratedPaper()
    })

    expect(saveResult).toEqual(
      expect.objectContaining({
        saved: true,
        id: 'paper-1',
      })
    )
    expect(buildDraftPaper).toHaveBeenCalledTimes(2)
    expect(onSaveGeneratedPaper).toHaveBeenCalledTimes(1)
    expect(stateRef.current.status).toBe('saved')
    expect(stateRef.current.saveResult).toEqual(
      expect.objectContaining({
        saved: true,
        id: 'paper-1',
      })
    )

    await act(async () => {
      stateRef.current.stopGeneration()
    })
    expect(stateRef.current.status).toBe('stopped')

    await act(async () => {
      stateRef.current.resetGenerator()
    })
    expect(stateRef.current.open).toBe(false)
    expect(stateRef.current.status).toBe('idle')
    expect(stateRef.current.draftQuestions).toHaveLength(0)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
