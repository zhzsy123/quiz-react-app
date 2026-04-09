import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listAllFavoriteEntries } from '../../../entities/favorite/api/favoriteRepository'
import { listHistoryEntries } from '../../../entities/history/api/historyRepository'
import { SUBJECT_REGISTRY, getSubjectDownloadGroups } from '../../../entities/subject/model/subjects'
import { getDeepSeekConfig, updateDeepSeekConfig } from '../../../shared/api/deepseekClient'

export const DASHBOARD_DOWNLOAD_GROUPS = getSubjectDownloadGroups()

function getAverageRate(attempts = []) {
  if (!attempts.length) return 0

  return Math.round(
    attempts.reduce((sum, item) => {
      return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
    }, 0) / attempts.length
  )
}

export function useDashboardSplitPageState() {
  const {
    profiles,
    activeProfile,
    activeProfileId,
    loading,
    createLocalProfile,
    switchProfile,
    renameLocalProfile,
  } = useAppContext()

  const [newProfileName, setNewProfileName] = useState('')
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [dashboardState, setDashboardState] = useState({
    attempts: [],
    totalQuestionVolume: 0,
    totalWrong: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!activeProfileId) return

      const [favorites, attempts] = await Promise.all([
        listAllFavoriteEntries(activeProfileId),
        listHistoryEntries(activeProfileId),
      ])

      if (cancelled) return

      setDashboardState({
        attempts,
        totalQuestionVolume: attempts.reduce((sum, item) => sum + (item.questionCount || 0), 0),
        totalWrong: attempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0),
      })
      setFavoriteCount(favorites.length)
    }

    void loadDashboard()

    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const subjectSummaries = useMemo(() => {
    return SUBJECT_REGISTRY.map((subject) => {
      const attempts = dashboardState.attempts.filter((item) => item.subject === subject.key)

      return {
        ...subject,
        attemptCount: attempts.length,
        averageRate: getAverageRate(attempts),
      }
    })
  }, [dashboardState.attempts])

  const latestAttempt = dashboardState.attempts[0] || null
  const overallAverageRate = getAverageRate(dashboardState.attempts)

  const spotlightStats = [
    { label: '历史考试', value: `${dashboardState.attempts.length} 次` },
    { label: '平均正确率', value: `${overallAverageRate}%` },
    { label: '错题数', value: `${dashboardState.totalWrong}` },
    { label: '收藏题目', value: `${favoriteCount}` },
  ]

  const handleCreateProfile = async () => {
    await createLocalProfile(newProfileName)
    setNewProfileName('')
    setShowCreateProfile(false)
  }

  const handleRenameProfile = async () => {
    if (!activeProfile) return
    const nextName = window.prompt('请输入新的本地档案名称：', activeProfile.name)
    if (!nextName) return
    await renameLocalProfile(activeProfile.id, nextName)
  }

  const handleUpdateApiKey = () => {
    const currentConfig = getDeepSeekConfig()
    const nextKey = window.prompt(
      '请输入新的 DeepSeek API Key。点击取消则不修改，留空则清空当前 Key。',
      currentConfig.apiKey || ''
    )
    if (nextKey === null) return
    updateDeepSeekConfig({ apiKey: nextKey.trim() })
  }

  return {
    profiles,
    activeProfile,
    activeProfileId,
    loading,
    newProfileName,
    setNewProfileName,
    showCreateProfile,
    setShowCreateProfile,
    showDownloadDialog,
    setShowDownloadDialog,
    dashboardState,
    subjectSummaries,
    latestAttempt,
    spotlightStats,
    downloadGroups: DASHBOARD_DOWNLOAD_GROUPS,
    switchProfile,
    handleCreateProfile,
    handleRenameProfile,
    handleUpdateApiKey,
  }
}
