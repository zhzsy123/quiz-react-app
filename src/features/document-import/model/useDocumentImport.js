import { useCallback, useMemo, useRef, useState } from 'react'
import {
  DOCUMENT_IMPORT_PREVIEW_POLICY,
  createDocumentImportError,
} from '../../../entities/document-import/lib/documentImportContracts'
import {
  importDocumentWithAi as importDocumentWithAiDefault,
  repairImportedQuestionWithAi as repairImportedQuestionWithAiDefault,
} from '../api/documentImportService'
import { extractDocumentDraft as extractDocumentDraftDefault } from '../../../shared/document'
import { rebuildDocumentImportResult } from './documentImportResultState'

const BUSY_STATUSES = new Set([
  'reading_file',
  'extracting_text',
  'calling_ai',
  'validating',
  'saving',
  'launching',
])

function buildFileMeta(file) {
  if (!file) return null
  return {
    name: file.name || '',
    size: Number(file.size) || 0,
    mimeType: file.type || '',
  }
}

export function createInitialDocumentImportState({ open = false, subject = '' } = {}) {
  return {
    open,
    status: 'idle',
    file: null,
    fileMeta: null,
    subject,
    extractedText: '',
    documentDraft: null,
    importResult: null,
    preview: null,
    progressLog: [],
    warnings: [],
    errors: [],
    invalidReasons: [],
    failedStage: '',
    saveResult: null,
    repairingQuestionIds: [],
  }
}

function appendLog(currentLogs = [], message) {
  if (!message) return currentLogs
  return [...currentLogs, message]
}

function deriveState(state) {
  const hasBlockingErrors = Array.isArray(state.errors) && state.errors.length > 0
  const hasBlockingInvalidReasons =
    !DOCUMENT_IMPORT_PREVIEW_POLICY.canSaveWithInvalidQuestions &&
    Array.isArray(state.invalidReasons) &&
    state.invalidReasons.length > 0

  const canSave =
    (state.status === 'preview_ready' || state.status === 'completed') &&
    !!state.importResult &&
    !hasBlockingErrors &&
    !hasBlockingInvalidReasons

  const canStartPractice =
    !!state.saveResult ||
    (DOCUMENT_IMPORT_PREVIEW_POLICY.reuseSavedPaperForPractice && canSave)

  return {
    ...state,
    canSave,
    canStartPractice,
    isBusy: BUSY_STATUSES.has(state.status),
  }
}

export function useDocumentImport({
  initialOpen = false,
  initialSubject = '',
  extractDocumentDraft = extractDocumentDraftDefault,
  importDocumentWithAi = importDocumentWithAiDefault,
  repairImportedQuestionWithAi = repairImportedQuestionWithAiDefault,
  onSaveImportedPaper,
  onStartPracticeWithImportedPaper,
} = {}) {
  const [state, setState] = useState(() =>
    createInitialDocumentImportState({ open: initialOpen, subject: initialSubject })
  )

  const sessionRef = useRef({
    id: 0,
    controller: null,
    cancelled: false,
  })

  const updateState = useCallback((updater) => {
    setState((current) => (typeof updater === 'function' ? updater(current) : updater))
  }, [])

  const setOpen = useCallback((open) => {
    updateState((current) => ({ ...current, open: Boolean(open) }))
  }, [updateState])

  const setSubject = useCallback((subject) => {
    updateState((current) => ({
      ...current,
      subject: subject || '',
      failedStage: '',
      errors: [],
    }))
  }, [updateState])

  const selectFile = useCallback((file) => {
    updateState((current) => ({
      ...current,
      file: file || null,
      fileMeta: buildFileMeta(file),
      status: file ? 'file_selected' : 'idle',
      extractedText: '',
      documentDraft: null,
      importResult: null,
      preview: null,
      progressLog: file ? [`已选择文件：${file.name || '未命名文件'}`] : [],
      warnings: [],
      errors: [],
      invalidReasons: [],
      failedStage: '',
      saveResult: null,
      repairingQuestionIds: [],
    }))
  }, [updateState])

  const resetImport = useCallback(() => {
    if (sessionRef.current.controller) {
      sessionRef.current.cancelled = true
      sessionRef.current.controller.abort()
    }
    setState(createInitialDocumentImportState({ open: state.open, subject: state.subject }))
    sessionRef.current = {
      id: 0,
      controller: null,
      cancelled: false,
    }
  }, [state.open, state.subject])

  const cancelImport = useCallback(() => {
    if (!sessionRef.current.controller) return
    sessionRef.current.cancelled = true
    sessionRef.current.controller.abort()
    updateState((current) => ({
      ...current,
      status: current.file ? 'file_selected' : 'idle',
      progressLog: appendLog(current.progressLog, '已取消当前导入流程。'),
    }))
  }, [updateState])

  const failImport = useCallback((error) => {
    const normalizedError =
      error instanceof Error ? error : createDocumentImportError('validating', String(error || '导入失败'))

    updateState((current) => ({
      ...current,
      status: 'failed',
      failedStage: normalizedError.failedStage || 'validating',
      errors: [normalizedError.message],
      progressLog: appendLog(current.progressLog, `失败：${normalizedError.message}`),
    }))

    return normalizedError
  }, [updateState])

  const startImport = useCallback(async () => {
    const file = state.file
    const subject = state.subject

    if (!file) {
      return failImport(createDocumentImportError('reading_file', '请先选择一个 PDF 或 DOCX 文件。'))
    }

    if (DOCUMENT_IMPORT_PREVIEW_POLICY.requireExplicitSubjectSelection && !subject) {
      return failImport(createDocumentImportError('validating', '请先选择科目，再开始解析。'))
    }

    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null
    const sessionId = sessionRef.current.id + 1
    sessionRef.current = {
      id: sessionId,
      controller,
      cancelled: false,
    }

    updateState((current) => ({
      ...current,
      status: 'reading_file',
      failedStage: '',
      errors: [],
      warnings: [],
      invalidReasons: [],
      importResult: null,
      preview: null,
      saveResult: null,
      progressLog: appendLog(current.progressLog, '开始读取文件'),
    }))

    let extractionResult = null
    try {
      await Promise.resolve()
      if (sessionRef.current.cancelled) return null

      updateState((current) => ({
        ...current,
        status: 'extracting_text',
        progressLog: appendLog(current.progressLog, '正在提取文档文本'),
      }))

      extractionResult = await extractDocumentDraft(file, {
        subject,
      })
    } catch (error) {
      return failImport(error)
    }

    if (sessionRef.current.cancelled) return null

    const documentDraft = extractionResult?.documentDraft || null
    const extractionWarnings = extractionResult?.warnings || []

    updateState((current) => ({
      ...current,
      status: 'calling_ai',
      extractedText: documentDraft?.plainText || '',
      documentDraft,
      warnings: extractionWarnings,
      progressLog: appendLog(
        appendLog(
          current.progressLog,
          `文本提取完成：${documentDraft?.stats?.characterCount || 0} 字，${documentDraft?.stats?.pageCount || 0} 页`
        ),
        '准备调用 AI 解析试卷结构'
      ),
    }))

    try {
      const result = await importDocumentWithAi({
        documentDraft,
        subjectKey: subject,
        signal: controller?.signal,
        onStageChange: (stage, message) => {
          if (sessionRef.current.id !== sessionId || sessionRef.current.cancelled) return
          updateState((current) => ({
            ...current,
            status: stage,
            progressLog: appendLog(current.progressLog, message),
          }))
        },
      })

      if (sessionRef.current.cancelled) return null

      updateState((current) => ({
        ...current,
        status: 'preview_ready',
        importResult: result,
        preview: result.preview,
        warnings: result.warnings || extractionWarnings,
        errors: result.errors || [],
        invalidReasons: result.invalidReasons || [],
        progressLog: appendLog(current.progressLog, '解析完成，可预览并保存题库。'),
      }))

      return result
    } catch (error) {
      if (controller?.signal?.aborted && sessionRef.current.cancelled) {
        return null
      }
      return failImport(error)
    } finally {
      if (sessionRef.current.id === sessionId) {
        sessionRef.current.controller = null
      }
    }
  }, [extractDocumentDraft, failImport, importDocumentWithAi, state.file, state.subject, updateState])

  const saveImportedPaper = useCallback(async () => {
    if (state.saveResult && DOCUMENT_IMPORT_PREVIEW_POLICY.reuseSavedPaperForPractice) {
      return state.saveResult
    }

    if (!state.importResult) {
      throw failImport(createDocumentImportError('saving', '当前没有可保存的导入结果。'))
    }

    if (!onSaveImportedPaper) {
      throw failImport(createDocumentImportError('saving', '当前未注入题库保存能力。'))
    }

    updateState((current) => ({
      ...current,
      status: 'saving',
      errors: [],
      progressLog: appendLog(current.progressLog, '正在保存到题库'),
    }))

    try {
      const result = await onSaveImportedPaper({
        importResult: state.importResult,
        documentDraft: state.documentDraft,
        subject: state.subject,
      })

      updateState((current) => ({
        ...current,
        status: 'completed',
        saveResult: result || null,
        progressLog: appendLog(current.progressLog, '已保存到题库'),
      }))

      return result
    } catch (error) {
      throw failImport(
        createDocumentImportError('saving', error?.message || '保存到题库失败。', {
          cause: error,
        })
      )
    }
  }, [failImport, onSaveImportedPaper, state.documentDraft, state.importResult, state.saveResult, state.subject, updateState])

  const startPracticeWithImportedPaper = useCallback(async () => {
    let saved = state.saveResult

    if (!saved) {
      saved = await saveImportedPaper()
    }

    if (!saved) return null

    if (!onStartPracticeWithImportedPaper) {
      updateState((current) => ({
        ...current,
        status: 'completed',
        progressLog: appendLog(current.progressLog, '已完成保存，可在下一步进入练习。'),
      }))
      return saved
    }

    updateState((current) => ({
      ...current,
      status: 'launching',
      errors: [],
      progressLog: appendLog(current.progressLog, '正在进入练习模式'),
    }))

    try {
      const result = await onStartPracticeWithImportedPaper({
        saveResult: saved,
        importResult: state.importResult,
        documentDraft: state.documentDraft,
        subject: state.subject,
      })

      updateState((current) => ({
        ...current,
        status: 'completed',
        progressLog: appendLog(current.progressLog, '已进入练习模式'),
      }))

      return result || saved
    } catch (error) {
      throw failImport(
        createDocumentImportError('launching', error?.message || '进入练习模式失败。', {
          cause: error,
        })
      )
    }
  }, [
    failImport,
    onStartPracticeWithImportedPaper,
    saveImportedPaper,
    state.documentDraft,
    state.importResult,
    state.saveResult,
    state.subject,
    updateState,
  ])

  const applyImportResultMutation = useCallback(
    (mutate) => {
      updateState((current) => {
        if (!current.importResult?.normalizedDocument?.quiz) {
          return current
        }

        const quiz = current.importResult.normalizedDocument.quiz
        const nextItems = mutate(quiz.items || [])
        if (!Array.isArray(nextItems)) {
          return current
        }

        const nextImportResult = rebuildDocumentImportResult({
          importResult: {
            ...current.importResult,
            normalizedDocument: {
              ...current.importResult.normalizedDocument,
              quiz: {
                ...quiz,
                items: nextItems,
              },
            },
          },
          subjectKey: current.subject,
          warnings: current.warnings,
          errors: current.errors,
          invalidReasons: current.invalidReasons,
        })

        return {
          ...current,
          importResult: nextImportResult,
          preview: nextImportResult.preview,
          warnings: nextImportResult.warnings,
          errors: nextImportResult.errors,
          invalidReasons: nextImportResult.invalidReasons,
          saveResult: null,
          progressLog: appendLog(current.progressLog, '已更新导入预览。'),
        }
      })
    },
    [updateState]
  )

  const removeQuestion = useCallback(
    (questionId) => {
      applyImportResultMutation((items) => items.filter((item) => item.id !== questionId))
    },
    [applyImportResultMutation]
  )

  const updateQuestion = useCallback(
    (questionId, patch = {}) => {
      applyImportResultMutation((items) =>
        items.map((item) => {
          if (item.id !== questionId) return item

          const nextPrompt = patch.prompt ?? item.prompt
          const nextScore = patch.score === undefined ? item.score : Number(patch.score) || 0
          const nextContent = patch.content

          let nextItem = {
            ...item,
            prompt: nextPrompt,
            score: nextScore,
          }

          if (item.type === 'reading') {
            nextItem = {
              ...nextItem,
              passage: {
                ...item.passage,
                content: nextContent === undefined ? item.passage?.content : nextContent,
              },
            }
          } else if (item.type === 'cloze') {
            nextItem = {
              ...nextItem,
              article: nextContent === undefined ? item.article : nextContent,
            }
          } else if (item.type === 'composite') {
            nextItem = {
              ...nextItem,
              material: nextContent === undefined ? item.material : nextContent,
            }
          } else if (nextContent !== undefined) {
            nextItem = {
              ...nextItem,
              context: nextContent,
            }
          }

          return nextItem
        })
      )
    },
    [applyImportResultMutation]
  )

  const repairQuestion = useCallback(
    async (questionId) => {
      const targetQuestion = state.importResult?.normalizedDocument?.quiz?.items?.find((item) => item.id === questionId)
      const targetPreview = state.preview?.questionPreviews?.find((item) => item.id === questionId)
      if (!targetQuestion || !targetPreview || !state.documentDraft) {
        throw failImport(createDocumentImportError('validating', '当前题目不存在，无法执行局部重解析。'))
      }

      updateState((current) => ({
        ...current,
        repairingQuestionIds: [...new Set([...(current.repairingQuestionIds || []), questionId])],
        progressLog: appendLog(current.progressLog, `正在重新解析第 ${targetPreview.index} 题`),
      }))

      try {
        const result = await repairImportedQuestionWithAi({
          documentDraft: state.documentDraft,
          subjectKey: state.subject,
          question: targetQuestion,
          questionPreview: targetPreview,
        })

        applyImportResultMutation((items) =>
          items.map((item) => (item.id === questionId ? result.repairedQuestion : item))
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : '局部重解析失败。'
        updateState((current) => ({
          ...current,
          errors: [message],
          progressLog: appendLog(current.progressLog, `局部重解析失败：${message}`),
        }))
        return null
      } finally {
        updateState((current) => ({
          ...current,
          repairingQuestionIds: (current.repairingQuestionIds || []).filter((id) => id !== questionId),
        }))
      }
    },
    [
      applyImportResultMutation,
      failImport,
      repairImportedQuestionWithAi,
      state.documentDraft,
      state.importResult,
      state.preview,
      state.subject,
      updateState,
    ]
  )

  const derivedState = useMemo(() => deriveState(state), [state])

  return {
    state: derivedState,
    setOpen,
    setSubject,
    selectFile,
    startImport,
    cancelImport,
    resetImport,
    saveImportedPaper,
    startPracticeWithImportedPaper,
    removeQuestion,
    updateQuestion,
    repairQuestion,
  }
}
