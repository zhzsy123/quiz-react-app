import { useCallback, useMemo, useRef, useState } from 'react'
import { buildDraftPaper as buildDefaultDraftPaper } from './questionGeneratorDraftPaper'
import {
  createInitialGeneratorState,
  mergeGeneratorMeta,
  normalizeGeneratedQuestion,
  summarizeDraftQuestions,
} from './questionGeneratorState'

function cloneStateForReset(initialOpen = false) {
  return createInitialGeneratorState(initialOpen)
}

export function useAiQuestionGenerator({
  initialOpen = false,
  initialConfig = {},
  initialMeta = {},
  generateQuestions,
  buildDraftPaper = buildDefaultDraftPaper,
  onSaveGeneratedPaper,
} = {}) {
  const [open, setOpen] = useState(initialOpen)
  const [status, setStatus] = useState('idle')
  const [config, setConfig] = useState(initialConfig)
  const [meta, setMeta] = useState(initialMeta)
  const [draftQuestions, setDraftQuestions] = useState([])
  const [error, setError] = useState('')
  const [saveResult, setSaveResult] = useState(null)

  const generationRef = useRef({
    id: 0,
    abort: null,
    settled: false,
  })

  const setSessionMeta = useCallback((patch = {}) => {
    setMeta((current) => {
      const nextPatch = typeof patch === 'function' ? patch(current) : patch
      return mergeGeneratorMeta(current, nextPatch)
    })
  }, [])

  const stopGeneration = useCallback(() => {
    const session = generationRef.current
    if (session.abort) {
      session.abort()
    }
    generationRef.current = {
      id: session.id,
      abort: null,
      settled: true,
    }
    setStatus('stopped')
    setSessionMeta({ stoppedAt: Date.now() })
  }, [setSessionMeta])

  const resetGenerator = useCallback(() => {
    stopGeneration()
    const nextState = cloneStateForReset(initialOpen)
    setOpen(nextState.open)
    setStatus(nextState.status)
    setConfig(initialConfig)
    setMeta(initialMeta)
    setDraftQuestions([])
    setError('')
    setSaveResult(null)
    generationRef.current = {
      id: 0,
      abort: null,
      settled: false,
    }
  }, [initialConfig, initialMeta, initialOpen, stopGeneration])

  const removeQuestion = useCallback((target) => {
    setDraftQuestions((current) =>
      current.filter((entry, index) => {
        if (typeof target === 'number') return index !== target
        if (typeof target === 'string') return entry.rawQuestion?.id !== target && entry.normalizedQuestion?.id !== target
        if (typeof target === 'function') return !target(entry, index)
        return entry !== target
      })
    )
  }, [])

  const retryInvalidQuestion = useCallback(async (target) => {
    void target
    return null
  }, [])

  const ingestQuestion = useCallback(
    (question, context = {}) => {
      const normalizedEntry = context.entry || normalizeGeneratedQuestion(question, context.config || config, context.meta || meta)
      setDraftQuestions((current) => [...current, normalizedEntry])
      setSessionMeta((current) => ({
        receivedCount: (current.receivedCount || 0) + 1,
        lastReceivedAt: normalizedEntry.receivedAt,
      }))
      return normalizedEntry
    },
    [config, meta, setSessionMeta]
  )

  const startGeneration = useCallback(
    async (request = {}) => {
      const nextConfig = request.config ? { ...config, ...request.config } : config
      const nextMeta = request.meta ? { ...meta, ...request.meta } : meta
      const generate = request.generateQuestions || generateQuestions
      if (typeof generate !== 'function') {
        setError('未提供题目生成服务')
        setStatus('error')
        return null
      }

      const sessionId = generationRef.current.id + 1
      const abortController = typeof AbortController !== 'undefined' ? new AbortController() : null
      generationRef.current = {
        id: sessionId,
        abort: abortController ? () => abortController.abort() : null,
        settled: false,
      }

      setOpen(true)
      setStatus('generating')
      setConfig(nextConfig)
      setMeta(
        mergeGeneratorMeta(nextMeta, {
          generationId: sessionId,
          startedAt: Date.now(),
          stoppedAt: null,
          completedAt: null,
          receivedCount: 0,
          validCount: 0,
          warningCount: 0,
          invalidCount: 0,
        })
      )
      setDraftQuestions([])
      setError('')
      setSaveResult(null)

      let completed = false
      let receivedViaCallback = false

      const handleQuestion = (question) => {
        receivedViaCallback = true
        const normalizedEntry = ingestQuestion(question, { config: nextConfig, meta: nextMeta })
        setSessionMeta((current) => ({
          ...current,
          validCount: (current.validCount || 0) + (normalizedEntry.status === 'valid' ? 1 : 0),
          warningCount: (current.warningCount || 0) + (normalizedEntry.status === 'warning' ? 1 : 0),
          invalidCount: (current.invalidCount || 0) + (normalizedEntry.status === 'invalid' ? 1 : 0),
        }))
        return normalizedEntry
      }

      const handleComplete = (result = {}) => {
        completed = true
        generationRef.current.settled = true
        setStatus(result.status || 'ready')
        setSessionMeta({
          completedAt: Date.now(),
          receivedCount: result.receivedCount,
        })
        return result
      }

      const handleError = (nextError) => {
        completed = true
        generationRef.current.settled = true
        const message = nextError?.message || '题目生成失败'
        setError(message)
        setStatus('error')
        setSessionMeta({ completedAt: Date.now(), errorAt: Date.now() })
        return message
      }

      try {
        const result = await generate({
          config: nextConfig,
          meta: nextMeta,
          request,
          onQuestion: handleQuestion,
          onComplete: handleComplete,
          onError: handleError,
          signal: abortController?.signal,
        })

        if (abortController?.signal?.aborted) {
          setStatus('stopped')
          return null
        }

        if (!receivedViaCallback && Array.isArray(result)) {
          result.forEach((question) => handleQuestion(question))
          handleComplete({ status: 'ready' })
          return result
        }

        if (!receivedViaCallback && result && Array.isArray(result.questions)) {
          result.questions.forEach((question) => handleQuestion(question))
          handleComplete(result)
          return result
        }

        if (!completed) {
          handleComplete(result || { status: 'ready' })
        }

        return result
      } catch (nextError) {
        handleError(nextError)
        return null
      }
    },
    [config, generateQuestions, ingestQuestion, meta, setSessionMeta]
  )

  const saveGeneratedPaper = useCallback(
    async (request = {}) => {
      const nextConfig = request.config ? { ...config, ...request.config } : config
      const nextMeta = request.meta ? { ...meta, ...request.meta } : meta
      const nextDraftQuestions = request.draftQuestions || draftQuestions
      const draftPaper = (request.buildDraftPaper || buildDraftPaper)({
        config: nextConfig,
        meta: nextMeta,
        draftQuestions: nextDraftQuestions,
        saveResult,
      })

      setStatus('saving')
      setError('')

      try {
        const result = request.onSaveGeneratedPaper || onSaveGeneratedPaper ? await (request.onSaveGeneratedPaper || onSaveGeneratedPaper)(draftPaper, {
          config: nextConfig,
          meta: nextMeta,
          draftQuestions: nextDraftQuestions,
        }) : draftPaper

        setSaveResult(result)
        setStatus('saved')
        setSessionMeta({ savedAt: Date.now() })
        return result
      } catch (nextError) {
        const message = nextError?.message || '保存生成试卷失败'
        setError(message)
        setStatus('error')
        setSessionMeta({ saveErrorAt: Date.now() })
        throw nextError
      }
    },
    [buildDraftPaper, config, draftQuestions, meta, onSaveGeneratedPaper, saveResult, setSessionMeta]
  )

  const summary = useMemo(() => summarizeDraftQuestions(draftQuestions), [draftQuestions])

  return {
    open,
    setOpen,
    status,
    config,
    setConfig,
    meta,
    setMeta: setSessionMeta,
    draftQuestions,
    error,
    saveResult,
    summary,
    startGeneration,
    stopGeneration,
    removeQuestion,
    retryInvalidQuestion,
    saveGeneratedPaper,
    resetGenerator,
  }
}
