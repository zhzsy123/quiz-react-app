import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import {
  listAllWrongBookEntries,
  removeWrongBookEntries,
  removeWrongBookEntry,
} from '../../../entities/wrong-book/api/wrongBookRepository'

export function getWrongItemCategory(item) {
  if (item.parentType === 'reading' || item.sourceType === 'reading') return 'reading'
  if (
    item.sourceType === 'cloze' ||
    item.source_type === 'cloze' ||
    String(item.contextTitle || '').includes('完形') ||
    (item.tags || []).some((tag) => String(tag).toLowerCase() === 'cloze')
  ) {
    return 'cloze'
  }
  return 'single_choice'
}

export function getWrongItemCategoryLabel(category) {
  if (category === 'reading') return '阅读理解'
  if (category === 'cloze') return '完形填空'
  return '客观题'
}

export function renderWrongBookOptionLabel(option) {
  if (typeof option === 'string') return option
  return `${option.key}. ${option.text}`
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
  const [feedback, setFeedback] = useState('')
  const [holdSolvedItem, setHoldSolvedItem] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const rows = await listAllWrongBookEntries(activeProfileId)
    setEntries(rows.map((row) => ({ ...row, category: getWrongItemCategory(row) })))
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const filteredWrongItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((item) => {
      const subjectMatched = subjectFilter === 'all' || item.subject === subjectFilter
      const typeMatched = typeFilter === 'all' || item.category === typeFilter
      const bucket = [item.prompt, item.contextTitle, item.contextSnippet, ...(item.tags || [])].join(' ').toLowerCase()
      const queryMatched = !lowered || bucket.includes(lowered)
      return subjectMatched && typeMatched && queryMatched
    })
  }, [entries, subjectFilter, typeFilter, query])

  const currentPracticeItem = practiceMode ? filteredWrongItems[practiceIndex] || null : null
  const displayPracticeItem = holdSolvedItem || currentPracticeItem

  useEffect(() => {
    if (!practiceMode) return
    if (practiceIndex >= filteredWrongItems.length) {
      setPracticeIndex(Math.max(filteredWrongItems.length - 1, 0))
    }
  }, [filteredWrongItems.length, practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedAnswer('')
    setFeedback('')
  }, [practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((questionKey) => entries.some((item) => item.questionKey === questionKey)))
  }, [entries])

  const handleRemove = async (item) => {
    if (!activeProfileId) return
    await removeWrongBookEntry(activeProfileId, item.subject, item.questionKey)
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
      await removeWrongBookEntries(activeProfileId, subject, questionKeys)
    }

    await refreshEntries()
  }

  const handleRemoveSelected = async () => {
    const targets = filteredWrongItems.filter((item) => selectedKeys.includes(item.questionKey))
    if (!targets.length) return
    const ok = window.confirm(`确定删除已选中的 ${targets.length} 道错题吗？`)
    if (!ok) return
    await removeItemsBulk(targets)
    setSelectedKeys([])
  }

  const handleRemoveAllFiltered = async () => {
    if (!filteredWrongItems.length) return
    const ok = window.confirm(`确定删除当前筛选结果中的全部 ${filteredWrongItems.length} 道错题吗？`)
    if (!ok) return
    await removeItemsBulk(filteredWrongItems)
    setSelectedKeys([])
  }

  const handlePracticeAnswer = async (optionKey) => {
    if (!displayPracticeItem || holdSolvedItem) return
    setSelectedAnswer(optionKey)
    if (optionKey === displayPracticeItem.correctAnswer) {
      setFeedback('回答正确，已从错题本中移除。')
      setHoldSolvedItem(displayPracticeItem)
      await handleRemove(displayPracticeItem)
      return
    }
    setFeedback('回答错误，请继续查看解析。')
  }

  const handleAdvanceAfterSolved = () => {
    setHoldSolvedItem(null)
    setSelectedAnswer('')
    setFeedback('')
    if (practiceIndex >= filteredWrongItems.length && filteredWrongItems.length > 0) {
      setPracticeIndex(filteredWrongItems.length - 1)
    }
  }

  const resetPractice = () => {
    setPracticeIndex(0)
    setSelectedAnswer('')
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
    query,
    setQuery,
    practiceMode,
    setPracticeMode,
    practiceIndex,
    setPracticeIndex,
    selectedAnswer,
    feedback,
    displayPracticeItem,
    holdSolvedItem,
    selectedKeys,
    wrongSummary,
    handleRemove,
    handleToggleSelected,
    handleSelectAllFiltered,
    handleClearSelected,
    handleRemoveSelected,
    handleRemoveAllFiltered,
    handlePracticeAnswer,
    handleAdvanceAfterSolved,
    resetPractice,
  }
}
