import { buildDraftPaper as buildModelDraftPaper } from '../model/questionGeneratorDraftPaper.js'
import {
  loadGenerationSignatureIndex,
  rememberGenerationSignatureEntry,
} from '../../../entities/quiz-generation/api/generationSignatureRepository.js'
import { buildGenerationDraftEntry } from '../../../entities/quiz-generation/lib/buildGenerationDraftEntry.js'
import { buildBlueprintExpansionPrompt } from '../../../entities/quiz-generation/lib/buildBlueprintExpansionPrompt.js'
import { buildBlueprintPrompt } from '../../../entities/quiz-generation/lib/buildBlueprintPrompt.js'
import {
  buildQuestionNearSignature,
  buildQuestionSignature,
  getRecentSignatures,
  hasDuplicateSignature,
  rememberSignature,
} from '../../../entities/quiz-generation/lib/generationSignatures.js'
import { sanitizeGeneratedQuestion } from '../../../entities/quiz-generation/lib/generatedQuestionSanitizer.js'
import { validateBlueprintPlan } from '../../../entities/quiz-generation/lib/validateBlueprintPlan.js'
import { requestAiJson } from '../../../shared/api/aiGateway.js'
import {
  buildQuestionGenerationDraftPaper,
  buildQuestionGenerationResult,
  createQuestionGenerationMeta,
  createQuestionGenerationRequestId,
  emitQuestionGenerationProgress,
  runQuestionGenerationPool,
} from './questionGenerationRuntime.js'
import { normalizeGenerationParams } from '../../../entities/quiz-generation/lib/buildGenerationPrompt.js'

function buildEmptyGenerationError() {
  return new Error('No supported question generation plan is configured.')
}

function buildNoValidQuestionError() {
  return new Error('No valid generated questions are available to save.')
}

function groupGenerationPlan(generationPlan = []) {
  const groups = new Map()

  generationPlan.forEach((planItem, planIndex) => {
    const typeKey = planItem?.typeKey || 'unknown'
    const current =
      groups.get(typeKey) ||
      {
        typeKey,
        label: planItem?.label || typeKey,
        count: 0,
        score: Number(planItem?.score) || 1,
        slots: [],
      }

    current.count += 1
    current.slots.push({
      planIndex,
      orderIndex: planIndex + 1,
      planItem,
    })
    groups.set(typeKey, current)
  })

  return [...groups.values()]
}

function emitBlueprintProgress(onProgress, group, patch = {}) {
  onProgress?.({
    id: `planning-${group.typeKey}`,
    index: group.slots[0]?.orderIndex || 0,
    title: `规划 ${group.label}`,
    meta: `${group.count} 题`,
    phase: 'planning',
    ...patch,
  })
}

async function seedSignatureMap(signatureMap, subjectKey, groupedPlan = []) {
  await Promise.all(
    groupedPlan.map(async (group) => {
      const signatureIndex = await loadGenerationSignatureIndex(subjectKey, group.typeKey)
      if (signatureIndex.exact.length > 0 || signatureIndex.near.length > 0) {
        signatureMap.set(group.typeKey, signatureIndex)
      }
    })
  )
}

async function planQuestionBlueprints({
  subjectKey,
  config,
  requestId,
  groupedPlan,
  generationMeta,
  onProgress,
  signal,
  warnings,
} = {}) {
  const validatedGroups = new Map()

  await runQuestionGenerationPool(
    groupedPlan,
    async (group) => {
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError')
      }

      emitBlueprintProgress(onProgress, group, {
        status: 'running',
        summary: '正在规划蓝图',
        detail: `先规划 ${group.label} 的出题蓝图，再开始逐题扩写。`,
      })

      let validated = null

      try {
        let previousWarnings = []

        for (let attempt = 1; attempt <= 2; attempt += 1) {
          const { systemPrompt, userPrompt } = buildBlueprintPrompt({
            subjectKey,
            params: config,
            requestId,
            typeKey: group.typeKey,
            count: group.count,
            score: group.score,
            startOrderIndex: group.slots[0]?.orderIndex || 1,
            previousWarnings,
            attempt,
          })

          const response = await requestAiJson({
            provider: 'deepseek',
            feature: 'question_generation_blueprint',
            title: `${generationMeta.paperTitle} blueprint`,
            subject: subjectKey,
            systemPrompt,
            userPrompt,
            temperature: 0.2,
          })

          validated = validateBlueprintPlan({
            subjectKey,
            typeKey: group.typeKey,
            requestedCount: group.count,
            score: group.score,
            difficulty: generationMeta.difficulty,
            startOrderIndex: group.slots[0]?.orderIndex || 1,
            payload: response?.content,
          })

          if (!validated?.coverage?.needsRefinement || attempt === 2) {
            break
          }

          previousWarnings = validated.warnings || []
          emitBlueprintProgress(onProgress, group, {
            status: 'running',
            summary: '覆盖率不足，正在重新规划',
            detail: `检测到 ${group.label} 的知识点或题目模式分布过于集中，正在重新规划蓝图。`,
            details: previousWarnings,
          })
        }
      } catch (error) {
        const fallback = validateBlueprintPlan({
          subjectKey,
          typeKey: group.typeKey,
          requestedCount: group.count,
          score: group.score,
          difficulty: generationMeta.difficulty,
          startOrderIndex: group.slots[0]?.orderIndex || 1,
          payload: null,
        })
        validated = {
          ...fallback,
          status: 'fallback',
          warnings: [
            ...(fallback.warnings || []),
            `规划 ${group.typeKey} 蓝图失败：${String(error?.message || error || 'unknown error')}`,
          ],
        }
      }

      const remappedItems = group.slots.map((slot, index) => {
        const item = validated.items[index] || validated.items[validated.items.length - 1]
        return {
          ...item,
          order_index: slot.orderIndex,
        }
      })

      const finalGroup = {
        ...validated,
        items: remappedItems,
      }

      validatedGroups.set(group.typeKey, finalGroup)

      if (finalGroup.warnings?.length) {
        warnings.push(
          ...finalGroup.warnings.map((message) => ({
            index: group.slots[0]?.orderIndex || 1,
            typeKey: group.typeKey,
            message,
          }))
        )
      }

      emitBlueprintProgress(onProgress, group, {
        status: finalGroup.status === 'valid' ? 'completed' : 'warning',
        summary:
          finalGroup.status === 'valid'
            ? `蓝图规划完成：${finalGroup.coverage?.distinctKnowledgePoints || group.count} 个知识点 / ${group.count} 题`
            : '蓝图规划完成，但覆盖率或结构需要关注',
        detail:
          finalGroup.status === 'valid'
            ? '系统将按蓝图逐题扩写，并尽量拉开同批题的知识点分布。'
            : '系统已尽量补齐蓝图，但本批次仍存在覆盖率或结构告警。',
        details: finalGroup.warnings || [],
      })
    },
    Math.min(4, Math.max(1, groupedPlan.length))
  )

  return groupedPlan
    .flatMap((group) => {
      const validated = validatedGroups.get(group.typeKey)
      return group.slots.map((slot, index) => ({
        ...slot.planItem,
        planIndex: slot.planIndex,
        blueprint: validated?.items[index] || null,
      }))
    })
    .sort((left, right) => left.planIndex - right.planIndex)
}

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
    const emptyError = buildEmptyGenerationError()
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
    const groupedPlan = groupGenerationPlan(generationPlan)
    generationMeta.blueprintGroupCount = groupedPlan.length

    await seedSignatureMap(signatureMap, subjectMeta.key, groupedPlan)

    const expandedPlan = await planQuestionBlueprints({
      subjectKey,
      config,
      requestId,
      groupedPlan,
      generationMeta,
      onProgress,
      signal,
      warnings,
    })

    await runQuestionGenerationPool(
      expandedPlan,
      async (planItem, planIndex) => {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError')
        }

        try {
          let finalizedEntry = null
          let duplicateError = null
          let previousErrorMessage = ''

          emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
            phase: 'expansion',
            status: 'running',
            summary: '正在按蓝图扩写题目',
            detail: `正在生成 ${planItem.label}`,
          })

          for (let attempt = 0; attempt < 2; attempt += 1) {
            const { systemPrompt, userPrompt } = buildBlueprintExpansionPrompt({
              subjectKey,
              params: config,
              requestId,
              blueprint: planItem.blueprint,
              questionIndex: planIndex + 1,
              totalQuestions: expandedPlan.length,
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
            const nearSignature = buildQuestionNearSignature(candidate)

            if (hasDuplicateSignature(signatureMap, planItem.typeKey, signature, nearSignature)) {
              duplicateError = new Error('Generated question is too similar to an existing question in this batch.')
              emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
                phase: 'expansion',
                status: 'running',
                summary: '检测到重复，正在重试',
                detail: '这道题与近期题目过于相似，系统正在按同一蓝图重新扩写。',
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
              previousErrorMessage =
                entry.errors?.[0] || entry.error || 'Generated question structure is invalid and needs repair.'
              emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
                phase: 'expansion',
                status: 'running',
                summary: '结构校验未通过，正在修复',
                detail: previousErrorMessage,
              })
              continue
            }

            rememberSignature(signatureMap, planItem.typeKey, signature, nearSignature)
            await rememberGenerationSignatureEntry(subjectMeta.key, planItem.typeKey, {
              exactSignature: signature,
              nearSignature,
            })
            finalizedEntry = entry
            break
          }

          if (!finalizedEntry) {
            throw duplicateError || new Error(previousErrorMessage || 'AI 生成失败')
          }

          draftQuestions[planIndex] = finalizedEntry
          emitQuestionGenerationProgress(onProgress, planItem, planIndex, {
            phase: 'expansion',
            status: finalizedEntry.status === 'warning' ? 'warning' : 'completed',
            summary: finalizedEntry.preview?.previewText || finalizedEntry.preview?.title || '题目生成完成',
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
              prompt: `${planItem.label} generation failed`,
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
            phase: 'expansion',
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
      result.error = buildNoValidQuestionError()
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
