import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../../../entities/subject/model/subjects'
import { loadFavoriteEntries, removeFavoriteEntry } from '../../../shared/lib/storage/storageFacade'

export function formatFavoriteType(entry) {
  if (entry.itemType === 'reading') return '闃呰鐞嗚В'
  if (entry.itemType === 'translation') return '缈昏瘧棰?'
  if (entry.itemType === 'short_answer') return '绠€绛旈'
  if (entry.itemType === 'case_analysis') return '妗堜緥鍒嗘瀽'
  if (entry.itemType === 'calculation') return '璁＄畻棰?'
  if (entry.itemType === 'operation') return '鎿嶄綔棰?'
  if (entry.itemType === 'essay') return '浣滄枃棰?'
  if (entry.sourceType === 'cloze') return '瀹屽舰濉┖'
  return '鍗曢」閫夋嫨'
}

export function useFavoritesPageState() {
  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [query, setQuery] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const groups = await Promise.all(SUBJECT_REGISTRY.map((subject) => loadFavoriteEntries(activeProfileId, subject.key)))
    setEntries(groups.flat().sort((a, b) => (b.favoritedAt || 0) - (a.favoritedAt || 0)))
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
