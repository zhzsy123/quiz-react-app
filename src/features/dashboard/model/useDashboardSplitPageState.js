import { useEffect, useMemo, useState } from 'react'
import { useAppContext } from '../../../app/providers/AppContext'
import { listAllFavoriteEntries } from '../../../entities/favorite/api/favoriteRepository'
import { listHistoryEntries } from '../../../entities/history/api/historyRepository'
import { SUBJECT_REGISTRY, getSubjectDownloadGroups } from '../../../entities/subject/model/subjects'
import { getDeepSeekConfig, updateDeepSeekConfig } from '../../../shared/api/deepseekClient'
import { exportLocalBackup, importLocalBackup } from '../../../shared/storage/backup/localBackup'
import { downloadTextFile } from '../../../shared/lib/export/downloadFile'
import { requestConfirmDialog, requestPromptDialog } from '../../../shared/ui/dialogs/dialogService'

export const DASHBOARD_DOWNLOAD_GROUPS = getSubjectDownloadGroups()

function getAverageRate(attempts = []) {
  if (!attempts.length) return 0

  return Math.round(
    attempts.reduce((sum, item) => {
      return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
    }, 0) / attempts.length
  )
}

function formatBackupFilename() {
  const now = new Date()
  const pad = (value) => String(value).padStart(2, '0')
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `vorin-local-backup-${stamp}.json`
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
    reloadStorageState,
  } = useAppContext()

  const [newProfileName, setNewProfileName] = useState('')
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [showDownloadDialog, setShowDownloadDialog] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [backupFeedback, setBackupFeedback] = useState('')
  const [isBackupBusy, setIsBackupBusy] = useState(false)
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
    const nextName = await requestPromptDialog({
      title: '重命名本地档案',
      message: '请输入新的本地档案名称：',
      defaultValue: activeProfile.name,
      confirmLabel: '保存',
    })
    if (!nextName) return
    await renameLocalProfile(activeProfile.id, nextName)
  }

  const handleUpdateApiKey = async () => {
    const currentConfig = getDeepSeekConfig()
    const nextKey = await requestPromptDialog({
      title: '更新 DeepSeek API Key',
      message: '请输入新的 DeepSeek API Key。点击取消则不修改，留空则清空当前 Key。',
      defaultValue: currentConfig.apiKey || '',
      confirmLabel: '保存',
      placeholder: 'sk-...',
    })
    if (nextKey === null) return
    updateDeepSeekConfig({ apiKey: nextKey.trim() })
  }

  const handleExportLocalBackup = async () => {
    setIsBackupBusy(true)
    setBackupFeedback('')
    try {
      const backup = await exportLocalBackup()
      downloadTextFile(
        formatBackupFilename(),
        JSON.stringify(backup, null, 2),
        'application/json;charset=utf-8'
      )
      setBackupFeedback(`已导出本地记录，共 ${Object.values(backup.stores || {}).reduce((sum, entries) => sum + (entries?.length || 0), 0)} 条记录。`)
    } catch (error) {
      setBackupFeedback(`导出失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsBackupBusy(false)
    }
  }

  const handleImportBackupFile = async (file) => {
    if (!file) return

    const confirmed = await requestConfirmDialog({
      title: '导入本地记录',
      message: '导入会用备份包覆盖当前浏览器中的同类本地记录。建议先导出当前设备的数据再继续。是否确认导入？',
      confirmLabel: '继续导入',
    })

    if (!confirmed) return

    setIsBackupBusy(true)
    setBackupFeedback('')

    try {
      const raw = await file.text()
      const payload = JSON.parse(raw)
      const summary = await importLocalBackup(payload)
      await reloadStorageState()
      setBackupFeedback(`导入完成：${summary.importedStoreCount} 个数据分区，${summary.importedRecordCount} 条记录。`)
    } catch (error) {
      setBackupFeedback(`导入失败：${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsBackupBusy(false)
    }
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
    handleExportLocalBackup,
    handleImportBackupFile,
    backupFeedback,
    isBackupBusy,
  }
}
