import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Download,
  History,
  LayoutDashboard,
  Pencil,
  Plus,
  Star,
  User2,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts, loadFavoriteEntries } from '../boundaries/storageFacade'
import { SUBJECT_REGISTRY } from '../config/subjects'
import { getDeepSeekConfig, maskApiKey, updateDeepSeekConfig } from '../services/ai/deepseekClient'

function getSubjectDisplay(subject) {
  switch (subject.key) {
    case 'english':
      return {
        title: '英语',
        description: '导入题库、刷题、模考、历史记录与错题回看。',
      }
    case 'data_structure':
      return {
        title: '数据结构',
        description: '支持结构化题、图题、树题和过程题练习。',
      }
    case 'database_principles':
      return {
        title: '数据库原理',
        description: '支持 SQL、设计题、事务与恢复相关练习。',
      }
    default:
      return {
        title: subject.shortLabel || subject.key,
        description: subject.description || '',
      }
  }
}

function getAttemptTitle(attempt) {
  return attempt?.customTitle?.trim() || attempt?.title || '未命名试卷'
}

function WorkflowBand() {
  return (
    <section className="dashboard-band-card">
      <div className="dashboard-band-copy">
        <span className="dashboard-eyebrow">JSON Workflow</span>
        <h2>下载资料包，把协议和试卷一起发给 DeepSeek</h2>
        <p>推荐流程：下载资料包 → 把试卷原文和协议一起发给 AI → 拿回 JSON → 导入本站刷题。</p>
      </div>

      <div className="dashboard-band-steps">
        <span>试卷原文</span>
        <ArrowRight size={14} />
        <span>AI 输出 JSON</span>
        <ArrowRight size={14} />
        <span>导入练习</span>
      </div>

      <div className="dashboard-band-actions import-kit-actions">
        <a className="primary-btn small-btn" href="./exam-import-kit.zip" download>
          <Download size={14} />
          导入资料包
        </a>
        <a className="secondary-btn small-btn" href="./json-schema.md" download>
          <Download size={14} />
          协议说明
        </a>
        <a className="secondary-btn small-btn" href="./exam-import.schema.json" download>
          <Download size={14} />
          JSON Schema
        </a>
        <a className="secondary-btn small-btn" href="./exam-import.example.json" download>
          <Download size={14} />
          示例 JSON
        </a>
      </div>
    </section>
  )
}

export default function DashboardSplitPage() {
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
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [aiConfig, setAiConfig] = useState(() => getDeepSeekConfig())
  const [dashboardState, setDashboardState] = useState({
    attempts: [],
    totalQuestionVolume: 0,
    totalWrong: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!activeProfileId) return

      const favoriteRows = await Promise.all(
        SUBJECT_REGISTRY.map((subject) => loadFavoriteEntries(activeProfileId, subject.key))
      )
      const attempts = await listAttempts(activeProfileId)

      if (!cancelled) {
        setDashboardState({
          attempts,
          totalQuestionVolume: attempts.reduce((sum, item) => sum + (item.questionCount || 0), 0),
          totalWrong: attempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0),
        })
        setFavoriteCount(favoriteRows.reduce((sum, rows) => sum + rows.length, 0))
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
        display: getSubjectDisplay(subject),
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
    const nextName = newProfileName.trim()
    await createLocalProfile(nextName)
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
    const nextKey = window.prompt('请输入新的 DeepSeek API Key。留空则取消。', aiConfig.apiKey || '')
    if (nextKey === null) return
    const nextConfig = updateDeepSeekConfig({ apiKey: nextKey })
    setAiConfig(nextConfig)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="dashboard-hero">
            <div className="hero-icon">
              <LayoutDashboard size={30} />
            </div>
            <h1>智能在线模考系统 2.0</h1>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-minimal-shell">
        <section className="dashboard-showcase">
          <div className="dashboard-showcase-copy">
            <span className="dashboard-eyebrow">Study Workspace</span>
            <h1>智能在线模考系统 2.0</h1>
            <p>支持题库导入、刷题训练、考试模式、AI 辅助讲解与错题回看。</p>

            <div className="dashboard-showcase-actions import-kit-actions">
              <Link className="primary-btn" to="/exam/english">
                进入题库
              </Link>
              <a className="secondary-btn" href="./exam-import-kit.zip" download>
                下载导入资料包
              </a>
              <a className="secondary-btn" href="./json-schema.md" download>
                查看协议说明
              </a>
              <button type="button" className="secondary-btn" onClick={handleUpdateApiKey}>
                更新 API Key
              </button>
            </div>

            <div className="dashboard-stat-strip">
              {spotlightStats.map((item) => (
                <article key={item.label} className="dashboard-stat-pill">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-showcase-panel">
            <div className="dashboard-profile-panel">
              <div className="dashboard-panel-head">
                <span className="dashboard-panel-title">
                  <User2 size={16} />
                  当前档案
                </span>
                {activeProfile && (
                  <button className="secondary-btn small-btn" onClick={handleRenameProfile}>
                    <Pencil size={14} />
                    重命名
                  </button>
                )}
              </div>

              <strong>{activeProfile?.name || '未命名档案'}</strong>
              <p>本地档案彼此隔离，适合按备考阶段或不同目标学校区分使用。</p>

              <label className="form-field">
                <span>切换档案</span>
                <select value={activeProfileId || ''} onChange={(event) => switchProfile(event.target.value)}>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              </label>

              <button className="ghost-btn" onClick={() => setShowCreateProfile((value) => !value)}>
                {showCreateProfile ? '收起新建档案' : '新建档案'}
              </button>

              {showCreateProfile && (
                <div className="profile-create-panel">
                  <label className="form-field grow">
                    <span>新档案名称</span>
                    <input
                      value={newProfileName}
                      onChange={(event) => setNewProfileName(event.target.value)}
                      placeholder="输入新的本地档案名称"
                    />
                  </label>
                  <button className="primary-btn profile-create-btn" onClick={handleCreateProfile}>
                    <Plus size={16} />
                    新建并切换
                  </button>
                </div>
              )}
            </div>

            <div className="dashboard-quick-panel">
              <button className="dashboard-quick-link" type="button" onClick={handleUpdateApiKey}>
                <Star size={16} />
                <span>AI Key：{maskApiKey(aiConfig.apiKey) || '未设置'}</span>
              </button>
              <Link className="dashboard-quick-link" to="/wrong-book">
                <BookOpen size={16} />
                <span>错题复习</span>
              </Link>
              <Link className="dashboard-quick-link" to="/favorites">
                <Star size={16} />
                <span>收藏夹</span>
              </Link>
              <Link className="dashboard-quick-link" to="/history">
                <History size={16} />
                <span>历史记录</span>
              </Link>
            </div>
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Modules</span>
              <h2>科目模块</h2>
            </div>
          </div>

          <div className="dashboard-module-grid">
            {subjectSummaries.map((subject) => (
              <Link key={subject.key} className="dashboard-module-card" to={subject.route}>
                <div className="dashboard-module-top">
                  <strong>{subject.display.title}</strong>
                  <span className="dashboard-module-tag">{subject.isAvailable ? '可用' : '待开放'}</span>
                </div>
                <p>{subject.display.description}</p>
                <div className="dashboard-module-meta">
                  <span>总考试次数 {subject.attemptCount}</span>
                  <span>平均正确率 {subject.averageRate}%</span>
                </div>
                <div className="dashboard-module-entry">
                  <span>进入模块</span>
                  <ArrowRight size={16} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <WorkflowBand />

        <section className="dashboard-summary-row">
          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">最近一次考试</span>
            <strong>{latestAttempt ? `${latestAttempt.objectiveScore}/${latestAttempt.objectiveTotal}` : '--'}</strong>
            <p>{latestAttempt ? getAttemptTitle(latestAttempt) : '当前还没有提交记录。'}</p>
          </article>

          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">总刷题量</span>
            <strong>{dashboardState.totalQuestionVolume}</strong>
            <p>累计参与练习和考试的题目数量。</p>
          </article>

          <article className="dashboard-summary-card">
            <span className="dashboard-summary-label">当前重点</span>
            <strong>{dashboardState.totalWrong} 道错题</strong>
            <p>建议优先从错题本开始，先修正薄弱点再刷新题。</p>
          </article>
        </section>
      </div>
    </div>
  )
}
