import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listHistoryEntries, removeHistoryEntry, updateHistoryEntry } from '../../../entities/history/api/historyRepository'

function attemptDisplayTitle(attempt) {
  return attempt.customTitle?.trim() || attempt.title || '未命名答卷'
}

function normalizeChoiceArray(value) {
  if (!Array.isArray(value)) return []
  return [...new Set(value.map((item) => String(item).trim()).filter(Boolean))].sort()
}

function optionLabel(options = [], key = '') {
  if (!key) return '未作答'
  const match = options.find((option) => option?.key === key)
  if (!match) return key
  return `${match.key}. ${match.text}`
}

function objectiveLabel(item, response) {
  if (item.type === 'multiple_choice') {
    const values = normalizeChoiceArray(response)
    return values.length ? values.map((value) => optionLabel(item.options || [], value)).join(' / ') : '未作答'
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return '未作答'
    return (
      item.blanks
        .map((blank) => String(response[blank.blank_id] || '').trim())
        .filter(Boolean)
        .join(' / ') || '未作答'
    )
  }
  return optionLabel(item.options || [], response || '')
}

function objectiveCorrectLabel(item) {
  if (item.type === 'multiple_choice') {
    return normalizeChoiceArray(item.answer?.correct)
      .map((value) => optionLabel(item.options || [], value))
      .join(' / ')
  }
  if (item.type === 'fill_blank') {
    return item.blanks.map((blank) => blank.accepted_answers.join(' / ')).join(' | ')
  }
  return optionLabel(item.options || [], item.answer?.correct || '')
}

function isObjectiveCorrect(item, response) {
  if (item.type === 'multiple_choice') {
    const actual = normalizeChoiceArray(response)
    const expected = normalizeChoiceArray(item.answer?.correct)
    return actual.length > 0 && actual.length === expected.length && actual.every((value, index) => value === expected[index])
  }
  if (item.type === 'fill_blank') {
    if (!response || typeof response !== 'object') return false
    return item.blanks.every((blank) => {
      const userValue = String(response[blank.blank_id] || '').trim().toLowerCase()
      return blank.accepted_answers.some((candidate) => String(candidate).trim().toLowerCase() === userValue)
    })
  }
  return (response || '') === item.answer?.correct
}

function buildAnswerRows(attempt) {
  const items = Array.isArray(attempt.itemsSnapshot) ? attempt.itemsSnapshot : []
  const answers = attempt.answersSnapshot || {}
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
          userLabel: optionLabel(question.options || [], readingAnswers[question.id] || ''),
          correctLabel: optionLabel(question.options || [], question.answer?.correct || ''),
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
        userLabel: objectiveLabel(item, userValue),
        correctLabel: objectiveCorrectLabel(item),
        rationale:
          item.type === 'fill_blank'
            ? item.blanks.map((blank, index) => `空 ${index + 1}：${blank.rationale || '暂无解析'}`).join('；')
            : item.answer?.rationale || '暂无解析',
        isCorrect: isObjectiveCorrect(item, userValue),
      })
      return
    }

    const userText = answers[item.id]?.text || ''
    rows.push({
      key: item.id,
      prompt: item.prompt,
      type: 'subjective',
      userText,
      referenceText: item.answer?.reference_answer || '',
    })
  })

  return rows
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
      .map((item) => (item.objectiveTotal ? Math.round((item.objectiveScore / item.objectiveTotal) * 100) : 0))
  }, [filteredAttempts])

  const summary = useMemo(() => {
    const totalAttempts = filteredAttempts.length
    const totalQuestions = filteredAttempts.reduce((sum, item) => sum + (item.questionCount || 0), 0)
    const totalWrong = filteredAttempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0)
    const averageRate = totalAttempts
      ? Math.round(
          filteredAttempts.reduce((sum, item) => {
            if (!item.objectiveTotal) return sum
            return sum + (item.objectiveScore / item.objectiveTotal) * 100
          }, 0) / totalAttempts
        )
      : 0
    return { totalAttempts, totalQuestions, totalWrong, averageRate }
  }, [filteredAttempts])

  const handleEditAttempt = async (attempt) => {
    const nextTitle = window.prompt('请输入新的展示标题：', attempt.customTitle?.trim() || attempt.title || '')
    if (nextTitle === null) return
    const nextNotes = window.prompt('请输入备注：', attempt.notes || '')
    if (nextNotes === null) return
    await updateHistoryEntry(attempt.id, { customTitle: nextTitle, notes: nextNotes })
    await refreshAttempts()
  }

  const handleDeleteAttempt = async (attempt) => {
    const ok = window.confirm(`确定删除这条历史记录吗？\n\n${attemptDisplayTitle(attempt)}`)
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
  }
}
