import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listAllFavoriteEntries } from '../../../entities/favorite/api/favoriteRepository'
import { listHistoryEntries } from '../../../entities/history/api/historyRepository'
import { SUBJECT_REGISTRY } from '../../../entities/subject/model/subjects'
import { getDeepSeekConfig, updateDeepSeekConfig } from '../../../shared/api/deepseekClient'

export const DASHBOARD_DOWNLOAD_OPTIONS = [
  {
    key: 'ds-db-schema',
    title: '数据库&数据结构解析规范',
    description: '适用于数据库 / 数据结构试卷解析，包含题型映射、composite 规则、JSON 示例和 DeepSeek 提示模板。',
    href: './数据库&数据结构解析规范.JSON',
    filename: '数据库&数据结构解析规范.JSON',
  },
  {
    key: 'trade-sample',
    title: '国际贸易混合样卷',
    description: '单个 JSON 混合多种国际贸易题型，每类题保留 3 个示例。',
    href: './sample-international-trade.json',
    filename: 'sample-international-trade.json',
  },
]

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

      if (!cancelled) {
        setDashboardState({
          attempts,
          totalQuestionVolume: attempts.reduce((sum, item) => sum + (item.questionCount || 0), 0),
          totalWrong: attempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0),
        })
        setFavoriteCount(favorites.length)
      }
    }

    void loadDashboard()
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const subjectSummaries = useMemo(() => {
    return SUBJECT_REGISTRY.map((subject) => {
      const attempts = dashboardState.attempts.filter((item) => item.subject === subject.key)
      const averageRate = attempts.length
        ? Math.round(
            attempts.reduce((sum, item) => {
              return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
            }, 0) / attempts.length
          )
        : 0

      return {
        ...subject,
        attemptCount: attempts.length,
        averageRate,
      }
    })
  }, [dashboardState.attempts])

  const latestAttempt = dashboardState.attempts[0] || null
  const overallAverageRate = dashboardState.attempts.length
    ? Math.round(
        dashboardState.attempts.reduce((sum, item) => {
          return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
        }, 0) / dashboardState.attempts.length
      )
    : 0

  const spotlightStats = [
    { label: '历史考试', value: `${dashboardState.attempts.length} 次` },
    { label: '平均正确率', value: `${overallAverageRate}%` },
    { label: '错题', value: `${dashboardState.totalWrong}` },
    { label: '收藏', value: `${favoriteCount}` },
  ]

  const handleCreateProfile = async () => {
    await createLocalProfile(newProfileName)
    setNewProfileName('')
    setShowCreateProfile(false)
  }

  const handleRenameProfile = async () => {
    if (!activeProfile) return
    const nextName = window.prompt('璇疯緭鍏ユ柊鐨勬湰鍦版。妗堝悕绉帮細', activeProfile.name)
    if (!nextName) return
    await renameLocalProfile(activeProfile.id, nextName)
  }

  const handleUpdateApiKey = () => {
    const currentConfig = getDeepSeekConfig()
    const nextKey = window.prompt('请输入新的 DeepSeek API Key，留空则取消。', currentConfig.apiKey || '')
    if (nextKey === null) return
    updateDeepSeekConfig({ apiKey: nextKey })
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
    downloadOptions: DASHBOARD_DOWNLOAD_OPTIONS,
    switchProfile,
    handleCreateProfile,
    handleRenameProfile,
    handleUpdateApiKey,
  }
}

