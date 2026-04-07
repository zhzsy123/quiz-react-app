import React, { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BarChart3, BookOpen, BookX, Database, FolderOpen, LayoutDashboard, Pencil, Plus, Star, User2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts, loadFavoriteEntries } from '../boundaries/storageFacade'
import { SUBJECT_REGISTRY } from '../config/subjects'

function Sparkline({ values }) {
  if (!values.length) return <div className="sparkline-empty">暂无历史成绩</div>
  const width = 220
  const height = 64
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 8) - 4
    return `${x},${y}`
  }).join(' ')
  return <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
}

export default function DashboardSplitPage() {
  const { profiles, activeProfile, activeProfileId, loading, createLocalProfile, switchProfile, renameLocalProfile } = useAppContext()
  const [newProfileName, setNewProfileName] = useState('')
  const [showCreateProfile, setShowCreateProfile] = useState(false)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const [dashboardState, setDashboardState] = useState({ attempts: [], totalQuestionVolume: 0, totalWrong: 0 })

  useEffect(() => {
    let cancelled = false
    async function loadDashboard() {
      if (!activeProfileId) return
      const [attempts, favorites] = await Promise.all([
        listAttempts(activeProfileId),
        loadFavoriteEntries(activeProfileId, 'english'),
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
    loadDashboard()
    return () => { cancelled = true }
  }, [activeProfileId])

  const subjectSummaries = useMemo(() => SUBJECT_REGISTRY.map((subject) => {
    const attempts = dashboardState.attempts.filter((item) => item.subject === subject.key)
    const latest = attempts[0] || null
    const averageRate = attempts.length ? Math.round(attempts.reduce((sum, item) => sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0), 0) / attempts.length) : 0
    const trend = attempts.slice().reverse().map((item) => (item.objectiveTotal ? Math.round((item.objectiveScore / item.objectiveTotal) * 100) : 0))
    return { ...subject, latest, averageRate, trend, attemptCount: attempts.length }
  }), [dashboardState.attempts])

  const activeModules = subjectSummaries.filter((item) => item.isAvailable)
  const pendingModules = subjectSummaries.filter((item) => !item.isAvailable)
  const primarySummary = activeModules[0] || null
  const recentAttempts = dashboardState.attempts.slice(0, 3)
  const overallAverageRate = dashboardState.attempts.length
    ? Math.round(dashboardState.attempts.reduce((sum, item) => sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0), 0) / dashboardState.attempts.length)
    : 0
  const latestAttempt = dashboardState.attempts[0] || null

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

  if (loading) {
    return <div className="app-shell"><div className="container"><section className="dashboard-hero"><div className="hero-icon"><LayoutDashboard size={30} /></div><h1>本地备考仪表盘</h1></section></div></div>
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-split-shell dashboard-split-shell-refined">
        <aside className="dashboard-left-rail">
          <section className="rail-card workspace-card compact-workspace-card">
            <div className="rail-card-head"><div className="rail-card-title"><User2 size={18} /> 本地工作区</div>{activeProfile && <button className="secondary-btn small-btn" onClick={handleRenameProfile}><Pencil size={14} /> 重命名</button>}</div>
            <div className="rail-profile-badge">当前档案：<strong>{activeProfile?.name || '未命名档案'}</strong></div>
            <div className="workspace-summary-row"><div className="workspace-mini-stat"><span>历史考试</span><strong>{dashboardState.attempts.length}</strong></div><div className="workspace-mini-stat"><span>总刷题量</span><strong>{dashboardState.totalQuestionVolume}</strong></div></div>
            <div className="profile-controls compact-profile-controls">
              <label className="form-field"><span>切换档案</span><select value={activeProfileId || ''} onChange={(e) => switchProfile(e.target.value)}>{profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}</select></label>
              <button className="ghost-btn" onClick={() => setShowCreateProfile((value) => !value)}>{showCreateProfile ? '收起新建档案' : '展开新建档案'}</button>
              {showCreateProfile && <div className="profile-create-panel"><label className="form-field grow"><span>新建档案</span><input value={newProfileName} onChange={(e) => setNewProfileName(e.target.value)} placeholder="输入新的本地用户名" /></label><button className="primary-btn profile-create-btn" onClick={handleCreateProfile}><Plus size={16} /> 新建并切换</button></div>}
            </div>
          </section>

          <section className="rail-card spotlight-rail">
            <div className="rail-section-label">高频入口</div>
            <div className="module-card-stack compact-stack">
              <Link className="module-link-card active primary-task-card wrongbook-spotlight-card" to="/wrong-book">
                <div className="module-link-card-top"><span className="module-link-name">错题本</span><span className="module-badge">优先复习</span></div>
                <div className="module-link-meta"><span>累计错题 {dashboardState.totalWrong}</span><span>立即复习</span></div>
              </Link>
              <Link className="module-link-card active favorite-spotlight-card" to="/favorites">
                <div className="module-link-card-top"><span className="module-link-name"><Star size={15} /> 收藏夹</span><span className="module-badge">常用</span></div>
                <div className="module-link-meta"><span>当前收藏 {favoriteCount}</span><span>立即进入</span></div>
              </Link>
            </div>
          </section>

          <section className="rail-card primary-task-rail">
            <div className="rail-section-label">主任务</div>
            <div className="module-card-stack compact-stack">
              {activeModules.map((subject) => (
                <Link key={subject.key} className="module-link-card active primary-task-card" to={subject.route}>
                  <div className="module-link-card-top"><span className="module-link-name">{subject.label}</span><span className="module-badge">可用</span></div>
                  <div className="module-link-meta"><span>历史考试 {subject.attemptCount}</span><span>平均率 {subject.averageRate}%</span></div>
                  <div className="primary-task-footer"><span>进入模块</span><ArrowRight size={16} /></div>
                </Link>
              ))}
            </div>
          </section>

          {pendingModules.length > 0 && (
            <section className="rail-card reserve-rail">
              <div className="rail-section-label">预留模块</div>
              <div className="module-card-stack compact-stack">
                {pendingModules.map((subject) => <article key={subject.key} className="module-link-card pending reserve-card"><div className="module-link-card-top"><span className="module-link-name">{subject.label}</span><span className="module-badge pending">预留</span></div><div className="module-link-meta"><span>历史考试 {subject.attemptCount}</span><span>平均率 {subject.averageRate}%</span></div></article>)}
              </div>
            </section>
          )}
        </aside>

        <main className="dashboard-right-pane">
          <section className="dashboard-board-hero compact-board-hero">
            <div className="dashboard-board-head compact-board-head"><div><div className="dashboard-board-kicker">监控面板</div><h1>本地备考仪表盘</h1></div><div className="dashboard-board-links"><Link className="secondary-btn small-btn" to="/history">历史记录</Link><Link className="secondary-btn small-btn" to="/wrong-book">错题本</Link><Link className="secondary-btn small-btn" to="/favorites">收藏夹</Link></div></div>
            <div className="dashboard-overview-grid dense-overview-grid"><div className="overview-tile"><span className="overview-label">当前档案</span><strong>{activeProfile?.name || '未命名档案'}</strong></div><div className="overview-tile"><span className="overview-label">历史考试</span><strong>{dashboardState.attempts.length} 次</strong></div><div className="overview-tile"><span className="overview-label">总刷题量</span><strong>{dashboardState.totalQuestionVolume}</strong></div><div className="overview-tile"><span className="overview-label">平均率</span><strong>{overallAverageRate}%</strong></div></div>
          </section>
          <section className="stats-grid dashboard-stats-grid dense-stats-grid"><article className="metric-card"><div className="metric-head"><BookOpen size={18} /> 最近一次考试</div><div className="metric-value">{latestAttempt ? `${latestAttempt.objectiveScore}/${latestAttempt.objectiveTotal}` : '--'}</div></article><article className="metric-card"><div className="metric-head"><BarChart3 size={18} /> 历史平均分</div><div className="metric-value">{overallAverageRate}%</div></article><article className="metric-card"><div className="metric-head"><FolderOpen size={18} /> 总刷题量</div><div className="metric-value">{dashboardState.totalQuestionVolume}</div></article><article className="metric-card"><div className="metric-head"><Database size={18} /> 累计错题</div><div className="metric-value">{dashboardState.totalWrong}</div></article></section>
          <section className="dashboard-bottom-grid"><section className="trend-card"><div className="section-header-row"><h2><BarChart3 size={18} /> {primarySummary?.shortLabel || '英语'}历史平均分趋势</h2><span className="section-header-tip">最近 {primarySummary?.attemptCount || 0} 次</span></div><div className="trend-body"><Sparkline values={primarySummary?.trend || []} /></div></section><section className="record-list-card recent-activity-card"><div className="section-header-row"><h2><LayoutDashboard size={18} /> 最近活动</h2><span className="section-header-tip">最近 3 次考试</span></div>{recentAttempts.length === 0 ? <div className="local-library-empty">暂无记录</div> : <div className="recent-attempt-list">{recentAttempts.map((attempt) => { const rate = attempt.objectiveTotal ? Math.round((attempt.objectiveScore / attempt.objectiveTotal) * 100) : 0; return <article key={attempt.id} className="recent-attempt-item"><div className="recent-attempt-title">{attempt.title || '未命名试卷'}</div><div className="recent-attempt-meta"><span>{new Date(attempt.submittedAt).toLocaleString()}</span><span>{attempt.objectiveScore}/{attempt.objectiveTotal}</span><span>{rate}%</span></div></article>})}</div>}</section></section>
        </main>
      </div>
    </div>
  )
}
