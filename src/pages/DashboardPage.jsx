import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, Database, FolderOpen, LayoutDashboard, Plus, User2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts, listLibraryEntries } from '../utils/indexedDb'

function Sparkline({ values }) {
  if (!values.length) {
    return <div className="sparkline-empty">暂无历史成绩</div>
  }

  const width = 220
  const height = 64
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function DashboardPage() {
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
  const [dashboardState, setDashboardState] = useState({
    englishAttempts: [],
    englishFiles: [],
    totalQuestionVolume: 0,
    totalWrong: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!activeProfileId) return
      const englishAttempts = await listAttempts(activeProfileId, 'english')
      const englishFiles = await listLibraryEntries(activeProfileId, 'english')
      const allAttempts = await listAttempts(activeProfileId)

      if (!cancelled) {
        setDashboardState({
          englishAttempts,
          englishFiles,
          totalQuestionVolume: allAttempts.reduce((sum, item) => sum + (item.questionCount || 0), 0),
          totalWrong: allAttempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0),
        })
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const englishLatest = dashboardState.englishAttempts[0] || null
  const englishTrend = useMemo(() => {
    return dashboardState.englishAttempts
      .slice()
      .reverse()
      .map((item) => {
        if (!item.objectiveTotal) return 0
        return Math.round((item.objectiveScore / item.objectiveTotal) * 100)
      })
  }, [dashboardState.englishAttempts])

  const englishAverage = useMemo(() => {
    if (!englishTrend.length) return 0
    return Math.round(englishTrend.reduce((sum, value) => sum + value, 0) / englishTrend.length)
  }, [englishTrend])

  const handleCreateProfile = async () => {
    await createLocalProfile(newProfileName)
    setNewProfileName('')
  }

  const handleRenameProfile = async () => {
    if (!activeProfile) return
    const nextName = window.prompt('请输入新的本地档案名称：', activeProfile.name)
    if (!nextName) return
    await renameLocalProfile(activeProfile.id, nextName)
  }

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="dashboard-hero">
            <div className="hero-icon">
              <LayoutDashboard size={30} />
            </div>
            <h1>本地备考仪表盘</h1>
            <p>正在加载本地档案与历史记录...</p>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero">
          <div className="hero-icon">
            <LayoutDashboard size={30} />
          </div>
          <h1>本地备考仪表盘</h1>
          <p>多档案、本地题库、成绩记录都保存在浏览器本地。当前系统已接入英语在线模拟考试 V1.0，并为后续扩展数据结构、数据库原理等模块预留接口。</p>
        </section>

        <section className="profile-card">
          <div className="section-header-row">
            <h2><User2 size={18} /> 本地档案</h2>
            {activeProfile && (
              <button className="secondary-btn small-btn" onClick={handleRenameProfile}>重命名当前档案</button>
            )}
          </div>

          <div className="profile-controls">
            <label className="form-field">
              <span>当前档案</span>
              <select value={activeProfileId || ''} onChange={(e) => switchProfile(e.target.value)}>
                {profiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>{profile.name}</option>
                ))}
              </select>
            </label>

            <div className="profile-create-row">
              <label className="form-field grow">
                <span>新建档案</span>
                <input
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  placeholder="输入新的本地用户名"
                />
              </label>
              <button className="primary-btn profile-create-btn" onClick={handleCreateProfile}>
                <Plus size={16} /> 新建并切换
              </button>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="metric-card">
            <div className="metric-head"><BookOpen size={18} /> 英语最近一次考试</div>
            <div className="metric-value">
              {englishLatest ? `${englishLatest.objectiveScore}/${englishLatest.objectiveTotal}` : '--'}
            </div>
            <div className="metric-subtext">
              {englishLatest ? `最近一次作答：${new Date(englishLatest.submittedAt).toLocaleString()}` : '还没有历史记录'}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-head"><BarChart3 size={18} /> 英语历史平均分</div>
            <div className="metric-value">{englishAverage}%</div>
            <div className="metric-subtext">按客观题得分率统计</div>
          </article>

          <article className="metric-card">
            <div className="metric-head"><FolderOpen size={18} /> 总刷题量</div>
            <div className="metric-value">{dashboardState.totalQuestionVolume}</div>
            <div className="metric-subtext">已写入本地历史记录的题量总和</div>
          </article>

          <article className="metric-card">
            <div className="metric-head"><Database size={18} /> 累计错题</div>
            <div className="metric-value">{dashboardState.totalWrong}</div>
            <div className="metric-subtext">基于客观题自动评分统计</div>
          </article>
        </section>

        <section className="trend-card">
          <div className="section-header-row">
            <h2><BarChart3 size={18} /> 英语历史平均分趋势</h2>
            <span className="section-header-tip">最近 {dashboardState.englishAttempts.length} 次记录</span>
          </div>
          <div className="trend-body">
            <Sparkline values={englishTrend} />
          </div>
        </section>

        <section className="modules-grid">
          <article className="module-card module-card-active">
            <div className="module-badge">已接入</div>
            <h3>英语在线模拟考试 V1.0</h3>
            <p>支持本地档案、历史题库、自动保存进度与交卷记录。</p>
            <div className="module-meta">本地题库：{dashboardState.englishFiles.length} 份 / 历史考试：{dashboardState.englishAttempts.length} 次</div>
            <Link className="primary-btn module-link" to="/exam/english">进入英语模块</Link>
          </article>

          <article className="module-card module-card-pending">
            <div className="module-badge pending">预留接口</div>
            <h3>数据结构</h3>
            <p>系统路由与本地数据库已为该科目预留扩展位。</p>
            <div className="module-meta">下一阶段可平滑接入</div>
          </article>

          <article className="module-card module-card-pending">
            <div className="module-badge pending">预留接口</div>
            <h3>数据库原理</h3>
            <p>后续可复用当前的本地档案、题库与成绩记录框架。</p>
            <div className="module-meta">下一阶段可平滑接入</div>
          </article>
        </section>
      </div>
    </div>
  )
}
