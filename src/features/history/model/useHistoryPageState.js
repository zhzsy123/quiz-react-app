import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listHistoryEntries, removeHistoryEntry, updateHistoryEntry } from '../../../entities/history/api/historyRepository'
import {
  formatOptionLabel,
  getObjectiveAnswerLabel,
  formatObjectiveCorrectAnswerLabel,
  isObjectiveResponseCorrect,
} from '../../../entities/quiz/lib/objectiveAnswers'
import { buildQuestionDisplayModel, formatSchemaSummary } from '../../../entities/quiz/lib/display/questionDisplayModel'
import { requestConfirmDialog, requestPromptDialog } from '../../../shared/ui/dialogs/dialogService'

export function attemptDisplayTitle(attempt) {
  return attempt.customTitle?.trim() || attempt.title || '未命名试卷'
}

function isObjectiveLikeQuestion(item = {}) {
  return (
    item?.answer?.type === 'objective' ||
    ['single_choice', 'multiple_choice', 'true_false', 'fill_blank', 'function_fill_blank', 'cloze'].includes(item?.type)
  )
}

function buildObjectiveHistoryRow(item, response, { key = '', parentTitle = '', prompt = '' } = {}) {
  return {
    key: key || item.id,
    parentTitle,
    prompt: prompt || item.prompt,
    type: 'objective',
    userLabel: getObjectiveAnswerLabel(item, response, '未作答'),
    correctLabel: formatObjectiveCorrectAnswerLabel(item, '未作答'),
    rationale:
      item.type === 'fill_blank'
        ? item.blanks.map((blank, index) => `空${index + 1}：${blank.rationale || '暂无解析'}`).join('；')
        : item.answer?.rationale || '暂无解析',
    isCorrect: isObjectiveResponseCorrect(item, response),
  }
}

function buildSubjectiveHistoryRow(
  item,
  response,
  review,
  { key = '', parentTitle = '', prompt = '', contextTitle, contextText, reviewStatus = '' } = {}
) {
  const display = buildQuestionDisplayModel(item, response, { contextTitle, contextText })

  return {
    key: key || item.id,
    parentTitle,
    prompt: prompt || item.prompt,
    type: 'subjective',
    displayType: display.displayType,
    codeLike: display.codeLike,
    contextCodeLike: display.contextCodeLike,
    contextTitle: display.contextTitle,
    contextText: display.contextText,
    userText: display.userText,
    referenceText: display.referenceText,
    requirements: display.requirements,
    scoringPoints: display.scoringPoints,
    reviewScore: Number(review?.score || 0),
    reviewMaxScore: Number(review?.maxScore || item.score || 0),
    reviewFeedback: review?.feedback || '',
    reviewStrengths: Array.isArray(review?.strengths) ? review.strengths : [],
    reviewWeaknesses: Array.isArray(review?.weaknesses) ? review.weaknesses : [],
    reviewSuggestions: Array.isArray(review?.suggestions) ? review.suggestions : [],
    reviewStatus: review?.status || reviewStatus || '',
  }
}

export function buildAnswerRows(attempt) {
  const items = Array.isArray(attempt.itemsSnapshot) ? attempt.itemsSnapshot : []
  const answers = attempt.answersSnapshot || {}
  const aiReviewMap = attempt.aiReview?.questionReviews || {}
  const rows = []

  items.forEach((item) => {
    if (item.type === 'reading') {
      const readingAnswers = answers[item.id] || {}
      item.questions.forEach((question) => {
        rows.push({
          key: `${item.id}:${question.id}`,
          parentTitle: item.passage?.title || item.title || '阅读理解',
          prompt: question.prompt,
          type: 'objective',
          userLabel: formatOptionLabel(question.options || [], readingAnswers[question.id] || '', '未作答'),
          correctLabel: formatOptionLabel(question.options || [], question.answer?.correct || '', '未作答'),
          rationale: question.answer?.rationale || '暂无解析',
          isCorrect: (readingAnswers[question.id] || '') === question.answer?.correct,
        })
      })
      return
    }

    if (item.type === 'composite') {
      const compositeAnswers = answers[item.id] && typeof answers[item.id] === 'object' ? answers[item.id] : {}
      const parentTitle = item.material_title || item.title || item.prompt || '综合题'
      const baseContextTitle = item.material_title || item.context_title || ''
      const baseContextText = item.material || item.context || ''

      ;(item.questions || []).forEach((question) => {
        const response = compositeAnswers[question.id]
        const review = aiReviewMap[`${item.id}:${question.id}`] || aiReviewMap[question.id] || null
        const contextTitle = question.context_title || baseContextTitle
        const contextText = question.context || baseContextText

        if (isObjectiveLikeQuestion(question)) {
          rows.push(
            buildObjectiveHistoryRow(question, response, {
              key: `${item.id}:${question.id}`,
              parentTitle,
            })
          )
          return
        }

        rows.push(
          buildSubjectiveHistoryRow(question, response, review, {
            key: `${item.id}:${question.id}`,
            parentTitle,
            contextTitle,
            contextText,
            reviewStatus: attempt.aiReview?.status || '',
          })
        )
      })
      return
    }

    if (item.type === 'relational_algebra') {
      const responseMap =
        answers[item.id] && typeof answers[item.id] === 'object' && typeof answers[item.id].responses === 'object'
          ? answers[item.id].responses
          : {}
      const parentTitle = item.title || item.prompt || '关系代数题'
      const relationSchemas = formatSchemaSummary(item.schemas)

      ;(item.subquestions || item.questions || []).forEach((subquestion) => {
        const review = aiReviewMap[`${item.id}:${subquestion.id}`] || aiReviewMap[subquestion.id] || null
        rows.push(
          buildSubjectiveHistoryRow(
            {
              ...subquestion,
              type: 'relational_algebra',
              schemas: item.schemas,
              answer: {
                reference_answer: subquestion.reference_answer || subquestion.answer?.reference_answer || '',
                scoring_points: item.answer?.scoring_points || [],
              },
            },
            responseMap[subquestion.id] || '',
            review,
            {
              key: `${item.id}:${subquestion.id}`,
              parentTitle,
              prompt: subquestion.label ? `${subquestion.label} ${subquestion.prompt}` : subquestion.prompt,
              contextTitle: '关系模式',
              contextText: relationSchemas,
              reviewStatus: attempt.aiReview?.status || '',
            }
          )
        )
      })
      return
    }

    if (item.answer?.type === 'objective') {
      rows.push(buildObjectiveHistoryRow(item, answers[item.id]))
      return
    }

    const review = aiReviewMap[item.id] || null
    rows.push(buildSubjectiveHistoryRow(item, answers[item.id], review, { reviewStatus: attempt.aiReview?.status || '' }))
  })

  return rows
}

export function getAttemptScoreSummary(attempt) {
  const objectiveScore = Number(attempt.objectiveScore || 0)
  const objectiveTotal = Number(attempt.objectiveTotal || 0)
  const subjectivePendingTotal = Number(attempt.subjectivePendingTotal || 0)
  const subjectiveScore = Number(attempt.aiReview?.totalSubjectiveScore || 0)
  const totalScore = objectiveScore + subjectiveScore
  const totalMax = Number(attempt.paperTotal || objectiveTotal + subjectivePendingTotal)
  const aiCompleted = attempt.aiReview?.status === 'completed'
  const effectiveScore = aiCompleted ? totalScore : objectiveScore
  const effectiveMax =
    aiCompleted ? totalMax : subjectivePendingTotal > 0 ? objectiveTotal : totalMax
  const rate = effectiveMax > 0 ? Math.round((effectiveScore / effectiveMax) * 100) : 0

  return {
    objectiveScore,
    objectiveTotal,
    subjectiveScore,
    subjectivePendingTotal,
    totalScore,
    totalMax,
    effectiveScore,
    effectiveMax,
    rate,
    aiCompleted,
  }
}

export function useHistoryPageState() {
  const { activeProfileId } = useAppContext()
  const [attempts, setAttempts] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [expandedAttemptId, setExpandedAttemptId] = useState(null)

  const refreshAttempts = async () => {
    if (!activeProfileId) return
    const rows = await listHistoryEntries(activeProfileId)
    setAttempts(rows.filter((item) => item.includeInHistory !== false))
  }

  useEffect(() => {
    void refreshAttempts()
  }, [activeProfileId])

  const filteredAttempts = useMemo(() => {
    if (subjectFilter === 'all') return attempts
    return attempts.filter((item) => item.subject === subjectFilter)
  }, [attempts, subjectFilter])

  const trendValues = useMemo(() => {
    return filteredAttempts
      .slice()
      .reverse()
      .map((item) => getAttemptScoreSummary(item).rate)
  }, [filteredAttempts])

  const summary = useMemo(() => {
    const totalAttempts = filteredAttempts.length
    const totalQuestions = filteredAttempts.reduce((sum, item) => sum + (item.questionCount || 0), 0)
    const totalWrong = filteredAttempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0)
    const ratedAttempts = filteredAttempts
      .map((item) => getAttemptScoreSummary(item))
      .filter((item) => item.effectiveMax > 0)
    const averageRate = ratedAttempts.length
      ? Math.round(ratedAttempts.reduce((sum, item) => sum + item.rate, 0) / ratedAttempts.length)
      : 0
    return { totalAttempts, totalQuestions, totalWrong, averageRate }
  }, [filteredAttempts])

  const handleEditAttempt = async (attempt) => {
    const nextTitle = await requestPromptDialog({
      title: '编辑标题',
      defaultValue: attempt.customTitle?.trim() || attempt.title || '',
      confirmLabel: '保存',
    })
    if (nextTitle === null) return
    const nextNotes = await requestPromptDialog({
      title: '编辑备注',
      defaultValue: attempt.notes || '',
      confirmLabel: '保存',
    })
    if (nextNotes === null) return
    await updateHistoryEntry(attempt.id, { customTitle: nextTitle, notes: nextNotes })
    await refreshAttempts()
  }

  const handleDeleteAttempt = async (attempt) => {
    const ok = await requestConfirmDialog({
      title: '删除历史记录',
      message: `确定删除这条历史记录吗？\n\n${attemptDisplayTitle(attempt)}`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      tone: 'danger',
    })
    if (!ok) return
    await removeHistoryEntry(attempt.id)
    if (expandedAttemptId === attempt.id) setExpandedAttemptId(null)
    await refreshAttempts()
  }

  return {
    filteredAttempts,
    summary,
    trendValues,
    subjectFilter,
    setSubjectFilter,
    expandedAttemptId,
    setExpandedAttemptId,
    handleEditAttempt,
    handleDeleteAttempt,
    attemptDisplayTitle,
    buildAnswerRows,
    getAttemptScoreSummary,
  }
}
