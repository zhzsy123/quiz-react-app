import { buildDraftPaper as buildModelDraftPaper } from '../model/questionGeneratorDraftPaper.js'
import { buildGenerationDraftEntry } from '../../../entities/quiz-generation/lib/buildGenerationDraftEntry.js'
import {
  buildGenerationPrompt,
  normalizeGenerationParams,
} from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'
import {
  buildQuestionSignature,
  getRecentSignatures,
  hasDuplicateSignature,
  rememberSignature,
} from '../../../entities/quiz-generation/lib/generationSignatures.js'
import { sanitizeGeneratedQuestion } from '../../../entities/quiz-generation/lib/generatedQuestionSanitizer.js'
import { requestAiJson } from '../../../shared/api/aiGateway.js'
import {
  buildQuestionGenerationDraftPaper,
  buildQuestionGenerationResult,
  createQuestionGenerationMeta,
  createQuestionGenerationRequestId,
  emitQuestionGenerationProgress,
  runQuestionGenerationPool,
} from './questionGenerationRuntime.js'

export function buildDraftPaper({
  config = {},
  meta = {},
  draftQuestions = [],
  saveResult = null,
  requestId = '',
} = {}) {
  return buildQuestionGenerationDraftPaper({
    buildModelDraftPaper,
    config,
    meta,
    draftQuestions,
    saveResult,
    requestId,
  })
}

export async function startQuestionGeneration({
  config = {},
  meta = {},
  onQuestion,
  onProgress,
  onComplete,
  onError,
  signal,
} = {}) {
  const subjectKey = config.subject || meta.subject || ''
  const requestId = meta.requestId || createQuestionGenerationRequestId(subjectKey || 'paper')
  const { subjectMeta, normalized, generationPlan } = normalizeGenerationParams(subjectKey, config)
  const generationMeta = createQuestionGenerationMeta(subjectMeta, normalized, requestId, generationPlan)
  const draftQuestions = new Array(generationPlan.length)
  const warnings = []
  const signatureMap = new Map()

  if (!generationPlan.length) {
    const emptyError = new Error('未配置可生成的题型计划。')
    const emptyResult = {
      status: 'failed',
      requestId,
      receivedCount: 0,
      meta: generationMeta,
      warnings,
      draftQuestions: [],
      draftPaper: buildDraftPaper({
        config: { ...normalized, subject: subjectMeta.key, title: generationMeta.paperTitle },
        meta: generationMeta,
        draftQuestions: [],
        requestId,
      }),
      error: emptyError,
    }
    onError?.(emptyError)
    return emptyResult
  }

  try {
    await runQuestionGenerationPool(
      generationPlan,
      async (planItem, planIndex) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        try {
          let finalizedEntry = null
          let duplicateError = null
          let previousErrorMessage = ''

          emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
            status: 'running',
            summary: '正在生成题目',
            detail: `正在调用模型生成 ${planItem.label}`,
          })

          for (let attempt = 0; attempt < 2; attempt += 1) {
            const { systemPrompt, userPrompt } = buildGenerationPrompt({
              subjectKey,
              params: config,
              requestId,
              planItem,
              questionIndex: planIndex + 1,
              totalQuestions: generationPlan.length,
              avoidQuestionSignatures: getRecentSignatures(signatureMap, planItem.typeKey),
              previousErrorMessage,
            })

            const response = await requestAiJson({
              provider: 'deepseek',
              feature: 'question_generation',
              title: generationMeta.paperTitle,
              subject: subjectMeta.key,
              systemPrompt,
              userPrompt,
              temperature: attempt === 0 ? 0.2 : 0.1,
            })

            const candidate = sanitizeGeneratedQuestion(response.content, {
              ...planItem,
              index: planIndex + 1,
            })
            const signature = buildQuestionSignature(candidate)

            if (hasDuplicateSignature(signatureMap, planItem.typeKey, signature)) {
              duplicateError = new Error('生成题目与同批已生成内容重复度过高，请重试。')
              emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
                status: 'running',
                summary: '检测到重复，正在自动重试',
                detail: '当前题目与同批已生成内容过于接近，系统正在重新生成。',
              })
              continue
            }

            const entry = buildGenerationDraftEntry(candidate, {
              requestId,
              subjectKey: subjectMeta.key,
              paperTitle: generationMeta.paperTitle,
              durationMinutes: generationMeta.durationMinutes,
              streamIndex: planIndex + 1,
            })

            if (entry.status === 'invalid') {
              previousErrorMessage = entry.errors?.[0] || entry.error || '题目结构无效，请修正后重新生成。'
              emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
                status: 'running',
                summary: '结构校验未通过，正在自动修复',
                detail: previousErrorMessage,
              })
              continue
            }

            rememberSignature(signatureMap, planItem.typeKey, signature)
            finalizedEntry = entry
            break
          }

          if (!finalizedEntry) {
            throw duplicateError || new Error(previousErrorMessage || 'AI 生成失败')
          }

          draftQuestions[planIndex] = finalizedEntry
          emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
            status: finalizedEntry.status === 'warning' ? 'warning' : 'completed',
            summary: finalizedEntry.preview?.previewText || finalizedEntry.preview?.title || '题目已生成',
            details: [...(finalizedEntry.validation?.warnings || []), ...(finalizedEntry.errors || [])],
            previewText: finalizedEntry.preview?.previewText || finalizedEntry.preview?.title || '',
            questionId: finalizedEntry.rawQuestion?.id || finalizedEntry.normalizedQuestion?.id || '',
          })
          onQuestion?.(finalizedEntry.rawQuestion, {
            requestId,
            streamIndex: planIndex + 1,
            meta: generationMeta,
            planItem,
            entry: finalizedEntry,
          })
        } catch (error) {
          const message = String(error?.message || '').trim() || 'AI 生成失败'
          const entry = buildGenerationDraftEntry(
            {
              id: `gq_${planIndex + 1}`,
              type: planItem.typeKey,
              prompt: `${planItem.label}生成失败`,
              score: planItem.score,
              answer: { type: 'subjective', reference_answer: '', scoring_points: [] },
            },
            {
              requestId,
              subjectKey: subjectMeta.key,
              paperTitle: generationMeta.paperTitle,
              durationMinutes: generationMeta.durationMinutes,
              streamIndex: planIndex + 1,
              errorMessage: message,
            }
          )

          entry.status = 'invalid'
          entry.errors = [message]
          draftQuestions[planIndex] = entry
          warnings.push({
            index: planIndex + 1,
            typeKey: planItem.typeKey,
            message,
          })
          emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
            status: 'failed',
            summary: message,
            detail: message,
            questionId: entry.rawQuestion?.id || '',
          })
          onQuestion?.(entry.rawQuestion, {
            requestId,
            streamIndex: planIndex + 1,
            meta: generationMeta,
            planItem,
            entry,
          })
        }
      },
      normalized.mode === 'practice' ? 6 : 3
    )

    const result = buildQuestionGenerationResult({
      buildModelDraftPaper,
      normalized,
      subjectMeta,
      generationMeta,
      draftQuestions,
      requestId,
      warnings,
    })

    if (result.status === 'completed') {
      onComplete?.(result)
    } else {
      result.error = new Error('当前没有可保存的有效题目，请调整配置后重试。')
      onError?.(result.error)
    }
    return result
  } catch (error) {
    const result = {
      ...buildQuestionGenerationResult({
        buildModelDraftPaper,
        normalized,
        subjectMeta,
        generationMeta,
        draftQuestions,
        requestId,
        warnings,
      }),
      status: 'failed',
      error,
    }

    onError?.(error)
    return result
  }
}
