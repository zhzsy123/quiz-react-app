import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import { listAllFavoriteEntries, removeFavoriteEntry } from '../../../entities/favorite/api/favoriteRepository'
import { getQuestionTypeMeta, getSubjectMeta } from '../../../entities/subject/model/subjects'

export function formatFavoriteType(entry) {
  const typeKey = entry.sourceType === 'cloze' ? 'cloze' : entry.itemType || entry.sourceType
  return getQuestionTypeMeta(typeKey).label
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

  const startPracticeSubjectKey = useMemo(() => {
    if (subjectFilter !== 'all') return subjectFilter
    const uniqueSubjects = [...new Set(filteredEntries.map((entry) => entry.subject).filter(Boolean))]
    return uniqueSubjects.length === 1 ? uniqueSubjects[0] : ''
  }, [filteredEntries, subjectFilter])

  const canStartPractice = Boolean(startPracticeSubjectKey)

  const handleRemove = async (entry) => {
    if (!activeProfileId) return
    await removeFavoriteEntry(activeProfileId, entry.subject, entry.questionKey)
    await refreshEntries()
  }

  const handleStartPractice = () => {
    if (!canStartPractice) return
    const subjectMeta = getSubjectMeta(startPracticeSubjectKey)
    navigate(`/workspace/${subjectMeta.routeSlug}?source=favorites&mode=practice`)
  }

  return {
    activeProfile,
    filteredEntries,
    query,
    setQuery,
    subjectFilter,
    setSubjectFilter,
    canStartPractice,
    handleRemove,
    handleStartPractice,
  }
}
