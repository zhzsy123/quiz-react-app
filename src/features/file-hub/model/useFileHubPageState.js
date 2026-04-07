import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import { buildPaperId } from '../../../entities/quiz/lib/paperId'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/quizSchema'
import { getSubjectMetaByRouteParam } from '../../../entities/subject/model/subjects'
import {
  deleteLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  upsertLibraryEntry,
} from '../../../shared/lib/storage/storageFacade'

export function useFileHubPageState() {
  const { subjectParam = 'english' } = useParams()
  const subjectMeta = getSubjectMetaByRouteParam(subjectParam)
  const subjectKey = subjectMeta.key

  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const refreshEntries = async () => {
    if (!activeProfileId) return
    setLoading(true)
    try {
      const rows = await listLibraryEntries(activeProfileId, subjectKey)
      setEntries(rows)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId, subjectKey])

  const filteredEntries = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((entry) => {
      if (!lowered) return true
      const bucket = [entry.title, ...(entry.tags || []), entry.schemaVersion || ''].join(' ').toLowerCase()
      return bucket.includes(lowered)
    })
  }, [entries, query])

  const handleQuizLoaded = async ({ parsed, rawText }) => {
    if (!activeProfile?.id) return
    const scoreBreakdown = getQuizScoreBreakdown(parsed.items || [])
    const expectedPaperTotal = Number(subjectMeta.expectedPaperTotal) || 0

    if (expectedPaperTotal > 0 && scoreBreakdown.paperTotal !== expectedPaperTotal) {
      const shouldContinue = window.confirm(
        `褰撳墠${subjectMeta.shortLabel}璇曞嵎鎬诲垎涓?${scoreBreakdown.paperTotal} 鍒嗭紝涓嶆槸 ${expectedPaperTotal} 鍒嗐€傚彲鑳芥槸 JSON 缂哄皯 score 鎴栭鍨嬪垎鍊煎紓甯革紝鏄惁缁х画瀵煎叆锛焋`
      )
      if (!shouldContinue) return false
    }

    const nextPaperId = buildPaperId(rawText)
    await upsertLibraryEntry({
      profileId: activeProfile.id,
      subject: subjectKey,
      paperId: nextPaperId,
      title: parsed.title || '鏈懡鍚嶆枃浠?',
      rawText,
      tags: parsed.compatibility?.skippedTypes?.length ? ['鍏煎瀵煎叆'] : [],
      schemaVersion: parsed.compatibility?.sourceSchema || 'unknown',
      questionCount: parsed.items?.length || 0,
    })
    await refreshEntries()
    return true
  }

  const handleRename = async (entry) => {
    const nextTitle = window.prompt('璇疯緭鍏ユ柊鐨勬枃浠跺悕绉帮細', entry.title)
    if (!nextTitle) return
    await updateLibraryEntry(entry.id, { title: nextTitle })
    await refreshEntries()
  }

  const handleTags = async (entry) => {
    const raw = window.prompt(
      '璇疯緭鍏ユ爣绛撅紝浣跨敤鑻辨枃閫楀彿鍒嗛殧锛?',
      Array.isArray(entry.tags) ? entry.tags.join(', ') : ''
    )
    if (raw === null) return
    const nextTags = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    await updateLibraryEntry(entry.id, { tags: nextTags })
    await refreshEntries()
  }

  const handleDelete = async (entry) => {
    const ok = window.confirm(`纭畾鍒犻櫎銆?${entry.title}銆嬪悧锛焋`)
    if (!ok) return
    await deleteLibraryEntry(entry.id)
    await refreshEntries()
  }

  const openWorkspace = (entry, mode) => {
    navigate(`/workspace/${subjectMeta.routeSlug}?paper=${encodeURIComponent(entry.paperId)}&mode=${mode}`)
  }

  return {
    activeProfile,
    subjectMeta,
    loading,
    query,
    setQuery,
    filteredEntries,
    handleQuizLoaded,
    handleRename,
    handleTags,
    handleDelete,
    openWorkspace,
  }
}
