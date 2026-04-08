import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAppContext } from '../../../app/providers/AppContext'
import {
  deleteLibraryEntry,
  listLibraryEntries,
  updateLibraryEntry,
  upsertLibraryEntry,
} from '../../../entities/library/api/libraryRepository'
import { buildPaperId } from '../../../entities/quiz/lib/paperId'
import { getSubjectMetaByRouteParam, getSubjectQuestionTypeOptions } from '../../../entities/subject/model/subjects'
import { startQuestionGeneration } from '../../question-generator/api/questionGenerationService'
import { useAiQuestionGenerator } from '../../question-generator/model/useAiQuestionGenerator'

function buildGeneratedPaperPayload({ draftPaper, subjectKey, profileId }) {
  const rawText = JSON.stringify(draftPaper, null, 2)
  return {
    rawText,
    paperId: buildPaperId(rawText),
    subject: subjectKey,
    profileId,
    title: draftPaper.title || 'AI 生成题库',
    schemaVersion: draftPaper.schema_version || 'quiz-generation-draft-v1',
    questionCount: draftPaper.questions?.length || draftPaper.items?.length || 0,
    tags: ['AI生成'],
  }
}

function areQuestionTypesEqual(current = [], next = []) {
  return (
    Array.isArray(current) &&
    current.length === next.length &&
    current.every((typeKey, index) => typeKey === next[index])
  )
}

export function useFileHubPageState() {
  const { subjectParam = 'english' } = useParams()
  const subjectMeta = getSubjectMetaByRouteParam(subjectParam)
  const subjectKey = subjectMeta.key

  const { activeProfile, activeProfileId } = useAppContext()
  const navigate = useNavigate()

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')

  const questionTypeOptions = useMemo(() => getSubjectQuestionTypeOptions(subjectKey), [subjectKey])

  const generationDefaults = useMemo(() => {
    const generation = subjectMeta.generation || {}
    return {
      subject: subjectKey,
      mode: generation.supportedModes?.[0] || 'practice',
      difficulty: generation.defaultDifficulty || 'medium',
      count: generation.defaultCounts?.[0] || 5,
      questionTypes: generation.supportedQuestionTypes || subjectMeta.questionTypeKeys || [],
      durationMinutes: generation.defaultDurationMinutes || subjectMeta.defaultDurationMinutes || 90,
      targetPaperTotal: generation.defaultPaperTotal || subjectMeta.expectedPaperTotal || 0,
      title: `${subjectMeta.shortLabel} AI 生成题目`,
    }
  }, [subjectKey, subjectMeta])

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

  const generator = useAiQuestionGenerator({
    initialConfig: {
      subject: generationDefaults.subject,
      mode: generationDefaults.mode,
      difficulty: generationDefaults.difficulty,
      count: generationDefaults.count,
      questionTypes: generationDefaults.questionTypes,
      durationMinutes: generationDefaults.durationMinutes,
      targetPaperTotal: generationDefaults.targetPaperTotal,
    },
    initialMeta: {
      subject: generationDefaults.subject,
      title: generationDefaults.title,
    },
    generateQuestions: startQuestionGeneration,
    onSaveGeneratedPaper: async (draftPaper) => {
      if (!activeProfile?.id) {
        throw new Error('当前没有可用的本地档案')
      }

      const payload = buildGeneratedPaperPayload({
        draftPaper,
        subjectKey,
        profileId: activeProfile.id,
      })

      await upsertLibraryEntry({
        profileId: payload.profileId,
        subject: payload.subject,
        paperId: payload.paperId,
        title: payload.title,
        rawText: payload.rawText,
        tags: payload.tags,
        schemaVersion: payload.schemaVersion,
        questionCount: payload.questionCount,
      })

      await refreshEntries()
      return payload
    },
  })

  useEffect(() => {
    generator.setConfig((current) => {
      const nextConfig = {
        ...current,
        subject: generationDefaults.subject,
        mode: generationDefaults.mode,
        difficulty: generationDefaults.difficulty,
        count: generationDefaults.count,
        questionTypes: generationDefaults.questionTypes,
        durationMinutes: generationDefaults.durationMinutes,
        targetPaperTotal: generationDefaults.targetPaperTotal,
      }

      if (
        current.subject === nextConfig.subject &&
        current.mode === nextConfig.mode &&
        current.difficulty === nextConfig.difficulty &&
        current.count === nextConfig.count &&
        current.durationMinutes === nextConfig.durationMinutes &&
        current.targetPaperTotal === nextConfig.targetPaperTotal &&
        areQuestionTypesEqual(current.questionTypes, nextConfig.questionTypes)
      ) {
        return current
      }

      return nextConfig
    })

    generator.setMeta((current) => {
      if (current.subject === generationDefaults.subject && current.title === generationDefaults.title) {
        return current
      }

      return {
        ...current,
        subject: generationDefaults.subject,
        title: generationDefaults.title,
      }
    })
  }, [
    generator.setConfig,
    generator.setMeta,
    generationDefaults.subject,
    generationDefaults.mode,
    generationDefaults.difficulty,
    generationDefaults.count,
    generationDefaults.questionTypes,
    generationDefaults.durationMinutes,
    generationDefaults.targetPaperTotal,
    generationDefaults.title,
  ])

  const handleQuizLoaded = async ({ parsed, rawText, quizDocument }) => {
    if (!activeProfile?.id) return

    const scoreBreakdown = quizDocument?.scoreBreakdown || { paperTotal: 0 }
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
    const ok = window.confirm(`确定删除题库“${entry.title}”吗？`)
    if (!ok) return
    await deleteLibraryEntry(entry.id)
    await refreshEntries()
  }

  const openWorkspace = (entry, mode) => {
    navigate(`/workspace/${subjectMeta.routeSlug}?paper=${encodeURIComponent(entry.paperId)}&mode=${mode}`)
  }

  const openGeneratorDialog = () => {
    generator.setOpen(true)
  }

  const startGenerator = () =>
    generator.startGeneration({
      config: {
        ...generator.config,
        subject: subjectKey,
      },
      meta: {
        ...generator.meta,
        subject: subjectKey,
      },
    })

  const saveGeneratedPaper = () => generator.saveGeneratedPaper()

  const startPracticeWithGeneratedPaper = async () => {
    const result =
      generator.saveResult && generator.saveResult.paperId
        ? generator.saveResult
        : await generator.saveGeneratedPaper()

    if (result?.paperId) {
      generator.setOpen(false)
      navigate(`/workspace/${subjectMeta.routeSlug}?paper=${encodeURIComponent(result.paperId)}&mode=practice`)
    }

    return result
  }

  return {
    activeProfile,
    subjectMeta: {
      ...subjectMeta,
      questionTypeOptions,
    },
    loading,
    query,
    setQuery,
    filteredEntries,
    handleQuizLoaded,
    handleRename,
    handleTags,
    handleDelete,
    openWorkspace,
    generator,
    openGeneratorDialog,
    startGenerator,
    saveGeneratedPaper,
    startPracticeWithGeneratedPaper,
  }
}
