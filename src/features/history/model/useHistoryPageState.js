import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listHistoryEntries, removeHistoryEntry, updateHistoryEntry } from '../../../entities/history/api/historyRepository'
import {
  formatOptionLabel,
  getObjectiveAnswerLabel,
  formatObjectiveCorrectAnswerLabel,
  isObjectiveResponseCorrect,
} from '../../../entities/quiz/lib/objectiveAnswers'
import { requestConfirmDialog, requestPromptDialog } from '../../../shared/ui/dialogs/dialogService'

export function attemptDisplayTitle(attempt) {
  return attempt.customTitle?.trim() || attempt.title || '未命名试卷'
}

function formatSubjectiveUserText(item, response) {
  if (item?.type === 'relational_algebra') {
    const responses = response?.responses && typeof response.responses === 'object' ? response.responses : {}
    return Object.entries(responses)
      .sort(([left], [right]) => String(left).localeCompare(String(right), 'zh-Hans-CN'))
      .map(([subquestionId, value]) => `(${subquestionId}) ${value || '未作答'}`)
      .join('\n')
  }

  if (typeof response?.text === 'string') return response.text
  return ''
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

    if (item.answer?.type === 'objective') {
      const userValue = answers[item.id]
      rows.push({
        key: item.id,
        prompt: item.prompt,
        type: 'objective',
        userLabel: getObjectiveAnswerLabel(item, userValue, '未作答'),
        correctLabel: formatObjectiveCorrectAnswerLabel(item, '未作答'),
        rationale:
          item.type === 'fill_blank'
            ? item.blanks.map((blank, index) => `空${index + 1}：${blank.rationale || '暂无解析'}`).join('；')
            : item.answer?.rationale || '暂无解析',
        isCorrect: isObjectiveResponseCorrect(item, userValue),
      })
      return
    }

    const userText = formatSubjectiveUserText(item, answers[item.id])
    const review = aiReviewMap[item.id] || null
    rows.push({
      key: item.id,
      prompt: item.prompt,
      type: 'subjective',
      userText,
      referenceText: item.answer?.reference_answer || '',
      reviewStatus: attempt.aiReview?.status || '',
      reviewScore: Number(review?.score || 0),
      reviewMaxScore: Number(review?.maxScore || item.score || 0),
      reviewFeedback: review?.feedback || '',
      reviewStrengths: Array.isArray(review?.strengths) ? review.strengths : [],
      reviewWeaknesses: Array.isArray(review?.weaknesses) ? review.weaknesses : [],
      reviewSuggestions: Array.isArray(review?.suggestions) ? review.suggestions : [],
    })
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
