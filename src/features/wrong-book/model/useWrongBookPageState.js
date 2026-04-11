import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import {
  formatObjectiveCorrectAnswerLabel,
  isObjectiveAnswered,
  isObjectiveResponseCorrect,
  normalizeChoiceArray,
} from '../../../entities/quiz/lib/objectiveAnswers'
import {
  getQuestionTypeMeta,
  getSubjectQuestionTypeOptions,
  normalizeQuestionTypeKey,
} from '../../../entities/subject/model/subjects'
import {
  listAllWrongbookEntries,
  removeWrongbookEntries,
  removeWrongbookEntry,
} from '../../../entities/wrongbook/api/wrongbookRepository'
import { requestConfirmDialog } from '../../../shared/ui/dialogs/dialogService'

function inferWrongItemType(item = {}) {
  const candidates = [item.type, item.sourceType, item.source_type, item.parentType]
  const explicit = candidates.map(normalizeQuestionTypeKey).find((value) => value && value !== 'unknown')
  if (explicit && getQuestionTypeMeta(explicit).key !== 'unknown') return explicit

  const blanks = Array.isArray(item?.blanks) ? item.blanks : []
  if (String(item.contextTitle || '').includes('完形')) return 'cloze'
  if (blanks.length > 0 && blanks.every((blank) => Array.isArray(blank.options) && String(blank.correct || '').trim())) {
    return 'cloze'
  }
  if (blanks.length > 0) return 'fill_blank'
  return 'single_choice'
}

function isFillBlankLikeWrongItem(item) {
  const category = item?.category || item?.type
  return ['fill_blank', 'function_fill_blank'].includes(category)
}

function isClozeWrongItem(item) {
  return inferWrongItemType(item) === 'cloze'
}

function isMultipleChoiceWrongItem(item) {
  return inferWrongItemType(item) === 'multiple_choice'
}

export function buildWrongBookPracticeItem(item = {}) {
  const category = inferWrongItemType(item)

  if (category === 'multiple_choice') {
    const expected = Array.isArray(item.correctAnswer)
      ? item.correctAnswer
      : Array.isArray(item.correctAnswers)
        ? item.correctAnswers
        : String(item.correctAnswer || '')
            .split(/[、,/\s]+/)
            .map((value) => value.trim())
            .filter(Boolean)
    return {
      type: 'multiple_choice',
      options: item.options || [],
      answer: { correct: expected },
    }
  }

  if (category === 'cloze') {
    return {
      type: 'cloze',
      blanks: item.blanks || [],
    }
  }

  if (isFillBlankLikeWrongItem(item)) {
    return {
      type: category,
      blanks: item.blanks || [],
    }
  }

  return {
    type: category,
    options: item.options || [],
    answer: { correct: String(item.correctAnswer || '').trim() },
  }
}

export function getWrongBookPracticeResponse(item, { selectedAnswer = '', selectedChoices = [], blankAnswers = {} } = {}) {
  if (isMultipleChoiceWrongItem(item)) {
    return normalizeChoiceArray(selectedChoices)
  }

  if (isClozeWrongItem(item) || isFillBlankLikeWrongItem(item)) {
    return blankAnswers
  }

  return selectedAnswer
}

export function buildWrongBookBlankFeedback(item, answers = {}) {
  const practiceItem = buildWrongBookPracticeItem(item)
  const blanks = Array.isArray(practiceItem?.blanks) ? practiceItem.blanks : []

  return blanks.map((blank, index) => {
    const value = String(answers[blank.blank_id] || '').trim()
    const usesOptions = Array.isArray(blank.options) && blank.options.length > 0
    const matched = usesOptions
      ? value.length > 0 && value === String(blank.correct || '').trim()
      : (blank.accepted_answers || []).some(
          (candidate) => String(candidate).trim().toLowerCase() === value.toLowerCase()
        )

    return {
      blankId: blank.blank_id,
      label: `空 ${index + 1}`,
      value,
      matched,
      correctLabel: usesOptions
        ? formatObjectiveCorrectAnswerLabel({ type: 'cloze', blanks: [blank] })
        : (blank.accepted_answers || []).join(' / '),
      rationale: blank.rationale || '',
      options: blank.options || [],
    }
  })
}

export function getWrongItemCategory(item) {
  return inferWrongItemType(item || {})
}

export function getWrongItemCategoryLabel(category) {
  return getQuestionTypeMeta(category).label
}

export function renderWrongBookOptionLabel(option) {
  if (typeof option === 'string') return option
  if (!option || typeof option !== 'object') return ''
  const key = String(option.key || '').trim()
  const text = String(option.text || '').trim()
  return key ? `${key}. ${text}` : text
}

export function isRenderableWrongBookEntry(row) {
  return Boolean(row && typeof row === 'object' && (row.questionKey || row.questionId || row.prompt))
}

export function sanitizeWrongBookEntry(row = {}) {
  return {
    ...row,
    questionKey: row.questionKey || row.questionId || `${row.subject || 'unknown'}:${Date.now()}:${Math.random()}`,
    prompt: String(row.prompt || row.questionPrompt || row.title || '未命名题目').trim(),
    options: Array.isArray(row.options) ? row.options : [],
    tags: Array.isArray(row.tags) ? row.tags : [],
    paperTitle: String(row.paperTitle || row.paper_title || '未命名试卷').trim(),
    subject: String(row.subject || '').trim() || 'english',
  }
}

export function useWrongBookPageState() {
  const { activeProfileId } = useAppContext()
  const [entries, setEntries] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [selectedChoices, setSelectedChoices] = useState([])
  const [blankAnswers, setBlankAnswers] = useState({})
  const [feedback, setFeedback] = useState('')
  const [holdSolvedItem, setHoldSolvedItem] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])

  const refreshEntries = async () => {
    if (!activeProfileId) return
    try {
      const rows = await listAllWrongbookEntries(activeProfileId)
      const nextEntries = (Array.isArray(rows) ? rows : [])
        .filter(isRenderableWrongBookEntry)
        .map((row) => {
          const safeRow = sanitizeWrongBookEntry(row)
          return { ...safeRow, category: getWrongItemCategory(safeRow) }
        })
      setEntries(nextEntries)
    } catch (error) {
      console.error('加载错题本失败', error)
      setEntries([])
    }
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const typeOptions = useMemo(() => getSubjectQuestionTypeOptions(subjectFilter), [subjectFilter])

  const filteredWrongItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()

    return entries.filter((item) => {
      const subjectMatched = subjectFilter === 'all' || item.subject === subjectFilter
      const typeMatched = typeFilter === 'all' || item.category === typeFilter
      const bucket = [item.prompt, item.contextTitle, item.contextSnippet, ...(item.tags || [])].join(' ').toLowerCase()
      const queryMatched = !lowered || bucket.includes(lowered)
      return subjectMatched && typeMatched && queryMatched
    })
  }, [entries, query, subjectFilter, typeFilter])

  const currentPracticeItem = practiceMode ? filteredWrongItems[practiceIndex] || null : null
  const displayPracticeItem = holdSolvedItem || currentPracticeItem
  const isBlankPracticeItem = isFillBlankLikeWrongItem(displayPracticeItem)
  const isClozePracticeItem = isClozeWrongItem(displayPracticeItem)
  const isMultipleChoicePracticeItem = isMultipleChoiceWrongItem(displayPracticeItem)
  const blankFeedback =
    isBlankPracticeItem || isClozePracticeItem ? buildWrongBookBlankFeedback(displayPracticeItem, blankAnswers) : []

  useEffect(() => {
    if (!practiceMode) return
    if (practiceIndex >= filteredWrongItems.length) {
      setPracticeIndex(Math.max(filteredWrongItems.length - 1, 0))
    }
  }, [filteredWrongItems.length, practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedAnswer('')
    setSelectedChoices([])
    setBlankAnswers({})
    setFeedback('')
  }, [practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((questionKey) => entries.some((item) => item.questionKey === questionKey)))
  }, [entries])

  useEffect(() => {
    if (typeFilter !== 'all' && !typeOptions.some((item) => item.key === typeFilter)) {
      setTypeFilter('all')
    }
  }, [typeFilter, typeOptions])

  const handleRemove = async (item) => {
    if (!activeProfileId) return
    await removeWrongbookEntry(activeProfileId, item.subject, item.questionKey)
    await refreshEntries()
  }

  const handleToggleSelected = (questionKey) => {
    setSelectedKeys((prev) =>
      prev.includes(questionKey) ? prev.filter((item) => item !== questionKey) : [...prev, questionKey]
    )
  }

  const handleSelectAllFiltered = () => {
    setSelectedKeys(filteredWrongItems.map((item) => item.questionKey))
  }

  const handleClearSelected = () => {
    setSelectedKeys([])
  }

  const removeItemsBulk = async (items) => {
    if (!activeProfileId || !items.length) return

    const grouped = items.reduce((map, item) => {
      if (!map[item.subject]) map[item.subject] = []
      map[item.subject].push(item.questionKey)
      return map
    }, {})

    for (const [subject, questionKeys] of Object.entries(grouped)) {
      await removeWrongbookEntries(activeProfileId, subject, questionKeys)
    }

    await refreshEntries()
  }

  const handleRemoveSelected = async () => {
    const targets = filteredWrongItems.filter((item) => selectedKeys.includes(item.questionKey))
    if (!targets.length) return
    const ok = await requestConfirmDialog({
      title: '删除已选错题',
      message: `确定删除已选中的 ${targets.length} 道错题吗？`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      tone: 'danger',
    })
    if (!ok) return
    await removeItemsBulk(targets)
    setSelectedKeys([])
  }

  const handleRemoveAllFiltered = async () => {
    if (!filteredWrongItems.length) return
    const ok = await requestConfirmDialog({
      title: '清空当前筛选错题',
      message: `确定删除当前筛选结果中的全部 ${filteredWrongItems.length} 道错题吗？`,
      confirmLabel: '删除',
      cancelLabel: '取消',
      tone: 'danger',
    })
    if (!ok) return
    await removeItemsBulk(filteredWrongItems)
    setSelectedKeys([])
  }

  const markPracticeSolved = async () => {
    setFeedback('回答正确，已从错题本中移除。')
    setHoldSolvedItem(displayPracticeItem)
    await handleRemove(displayPracticeItem)
  }

  const markPracticeWrong = (message = '回答错误，请查看解析后继续复习。') => {
    setFeedback(message)
  }

  const handlePracticeAnswer = async (optionKey) => {
    if (!displayPracticeItem || holdSolvedItem || isBlankPracticeItem || isClozePracticeItem || isMultipleChoicePracticeItem) {
      return
    }

    setSelectedAnswer(optionKey)
    const practiceItem = buildWrongBookPracticeItem(displayPracticeItem)
    if (isObjectiveResponseCorrect(practiceItem, optionKey)) {
      await markPracticeSolved()
      return
    }

    markPracticeWrong()
  }

  const handleTogglePracticeChoice = (optionKey) => {
    if (!displayPracticeItem || holdSolvedItem || !isMultipleChoicePracticeItem) return
    setSelectedChoices((current) =>
      current.includes(optionKey) ? current.filter((item) => item !== optionKey) : [...current, optionKey]
    )
  }

  const handlePracticeBlankChange = (blankId, value) => {
    if (!displayPracticeItem || holdSolvedItem || (!isBlankPracticeItem && !isClozePracticeItem)) return
    setBlankAnswers((current) => ({
      ...current,
      [blankId]: value,
    }))
  }

  const handlePracticeClozeAnswer = (blankId, optionKey) => {
    if (!displayPracticeItem || holdSolvedItem || !isClozePracticeItem) return
    setBlankAnswers((current) => ({
      ...current,
      [blankId]: optionKey,
    }))
  }

  const handleCheckPracticeBlank = async () => {
    if (!displayPracticeItem || holdSolvedItem || (!isBlankPracticeItem && !isClozePracticeItem)) return

    const practiceItem = buildWrongBookPracticeItem(displayPracticeItem)
    if (!isObjectiveAnswered(practiceItem, blankAnswers)) {
      setFeedback('请先完成作答，再进行检查。')
      return
    }

    if (isObjectiveResponseCorrect(practiceItem, blankAnswers)) {
      await markPracticeSolved()
      return
    }

    markPracticeWrong('仍有空答案错误，请根据参考答案继续复习。')
  }

  const handleCheckPracticeObjective = async () => {
    if (!displayPracticeItem || holdSolvedItem || !isMultipleChoicePracticeItem) return

    const practiceItem = buildWrongBookPracticeItem(displayPracticeItem)
    const response = getWrongBookPracticeResponse(displayPracticeItem, { selectedChoices })
    if (!isObjectiveAnswered(practiceItem, response)) {
      setFeedback('请先完成作答，再进行检查。')
      return
    }

    if (isObjectiveResponseCorrect(practiceItem, response)) {
      await markPracticeSolved()
      return
    }

    markPracticeWrong()
  }

  const handleAdvanceAfterSolved = () => {
    setHoldSolvedItem(null)
    setSelectedAnswer('')
    setSelectedChoices([])
    setBlankAnswers({})
    setFeedback('')
    if (practiceIndex >= filteredWrongItems.length && filteredWrongItems.length > 0) {
      setPracticeIndex(filteredWrongItems.length - 1)
    }
  }

  const resetPractice = () => {
    setSelectedAnswer('')
    setSelectedChoices([])
    setBlankAnswers({})
    setFeedback('')
    setHoldSolvedItem(null)
  }

  const wrongSummary = {
    totalWrongRecords: entries.reduce((sum, item) => sum + (item.wrongTimes || 1), 0),
    uniqueWrongQuestions: entries.length,
    filteredCount: filteredWrongItems.length,
    latestWrongAt: filteredWrongItems[0]?.lastWrongAt || null,
  }

  return {
    entries,
    filteredWrongItems,
    subjectFilter,
    setSubjectFilter,
    typeFilter,
    setTypeFilter,
    typeOptions,
    query,
    setQuery,
    practiceMode,
    setPracticeMode,
    practiceIndex,
    setPracticeIndex,
    selectedAnswer,
    selectedChoices,
    blankAnswers,
    blankFeedback,
    feedback,
    displayPracticeItem,
    holdSolvedItem,
    isBlankPracticeItem,
    isClozePracticeItem,
    isMultipleChoicePracticeItem,
    selectedKeys,
    wrongSummary,
    handleRemove,
    handleToggleSelected,
    handleSelectAllFiltered,
    handleClearSelected,
    handleRemoveSelected,
    handleRemoveAllFiltered,
    handlePracticeAnswer,
    handleTogglePracticeChoice,
    handlePracticeBlankChange,
    handlePracticeClozeAnswer,
    handleCheckPracticeBlank,
    handleCheckPracticeObjective,
    handleAdvanceAfterSolved,
    resetPractice,
  }
}
