import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import { listAllFavoriteEntries, removeFavoriteEntry } from '../../../entities/favorite/api/favoriteRepository'
import { getSubjectMeta } from '../../../entities/subject/model/subjects'

export function formatFavoriteType(entry) {
  if (entry.itemType === 'reading') return '阅读理解'
  if (entry.itemType === 'translation') return '翻译题'
  if (entry.itemType === 'short_answer') return '简答题'
  if (entry.itemType === 'case_analysis') return '案例分析'
  if (entry.itemType === 'calculation') return '计算题'
  if (entry.itemType === 'operation') return '操作题'
  if (entry.itemType === 'essay') return '作文题'
  if (entry.sourceType === 'cloze') return '完形填空'
  return '客观题'
}

export function useFavoritesPageState() {
  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const rows = await listAllFavoriteEntries(activeProfileId)
    setEntries(rows)
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((entry) => {
      const subjectMatched = subjectFilter === 'all' || entry.subject === subjectFilter
      if (!subjectMatched) return false
      if (!lowered) return true
      const bucket = [entry.prompt, entry.paperTitle, entry.contextTitle, ...(entry.tags || [])].join(' ').toLowerCase()
      return bucket.includes(lowered)
    })
  }, [entries, query, subjectFilter])

  const handleRemove = async (entry) => {
    if (!activeProfileId) return
    await removeFavoriteEntry(activeProfileId, entry.subject, entry.questionKey)
    await refreshEntries()
  }

  const handleStartPractice = () => {
    const targetSubjectKey = subjectFilter !== 'all' ? subjectFilter : filteredEntries[0]?.subject
    if (!targetSubjectKey) return
    const subjectMeta = getSubjectMeta(targetSubjectKey)
    navigate(`/workspace/${subjectMeta.routeSlug}?source=favorites&mode=practice`)
  }

  return {
    activeProfile,
    filteredEntries,
    query,
    setQuery,
    subjectFilter,
    setSubjectFilter,
    handleRemove,
    handleStartPractice,
  }
}
