import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import {
  deleteLibraryEntry,
  listLibraryEntries,
  upsertLibraryEntry,
  updateLibraryEntry,
} from '../../../entities/library/api/libraryRepository'
import { buildPaperId } from '../../../entities/quiz/lib/paperId'
import { getQuizScoreBreakdown } from '../../../entities/quiz/lib/quizSchema'
import { getSubjectMetaByRouteParam } from '../../../entities/subject/model/subjects'

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
        `当前 ${subjectMeta.shortLabel} 试卷总分为 ${scoreBreakdown.paperTotal}，标准总分应为 ${expectedPaperTotal}。这通常说明 JSON 中缺少 score 字段或题型分值配置不完整，是否继续导入？`
      )
      if (!shouldContinue) return false
    }

    const nextPaperId = buildPaperId(rawText)
    await upsertLibraryEntry({
      profileId: activeProfile.id,
      subject: subjectKey,
      paperId: nextPaperId,
      title: parsed.title || '未命名题库',
      rawText,
      tags: parsed.compatibility?.skippedTypes?.length ? ['存在兼容跳过'] : [],
      schemaVersion: parsed.compatibility?.sourceSchema || 'unknown',
      questionCount: parsed.items?.length || 0,
    })
    await refreshEntries()
    return true
  }

  const handleRename = async (entry) => {
    const nextTitle = window.prompt('请输入新的题库名称：', entry.title)
    if (!nextTitle) return
    await updateLibraryEntry(entry.id, { title: nextTitle })
    await refreshEntries()
  }

  const handleTags = async (entry) => {
    const raw = window.prompt('请输入标签，多个标签请用英文逗号分隔：', Array.isArray(entry.tags) ? entry.tags.join(', ') : '')
    if (raw === null) return
    const nextTags = raw
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
    await updateLibraryEntry(entry.id, { tags: nextTags })
    await refreshEntries()
  }

  const handleDelete = async (entry) => {
    const ok = window.confirm(`确定删除题库「${entry.title}」吗？`)
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
