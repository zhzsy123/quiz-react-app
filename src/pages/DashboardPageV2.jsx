import React, { useEffect, useMemo, useState } from 'react'
import { BarChart3, BookOpen, Database, FolderOpen, LayoutDashboard, Plus, User2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { listAttempts, listLibraryEntries } from '../utils/indexedDb'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

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

export default function DashboardPageV2() {
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
    attempts: [],
    englishFiles: [],
    totalQuestionVolume: 0,
    totalWrong: 0,
  })

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (!activeProfileId) return
      const attempts = await listAttempts(activeProfileId)
      const englishFiles = await listLibraryEntries(activeProfileId, 'english')

      if (!cancelled) {
        setDashboardState({
          attempts,
          englishFiles,
          totalQuestionVolume: attempts.reduce((sum, item) => sum + (item.questionCount || 0), 0),
          totalWrong: attempts.reduce((sum, item) => sum + (item.wrongCount || 0), 0),
        })
      }
    }

    loadDashboard()
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const subjectSummaries = useMemo(() => {
    return SUBJECT_REGISTRY.map((subject) => {
      const attempts = dashboardState.attempts.filter((item) => item.subject === subject.key)
      const latest = attempts[0] || null
      const averageRate = attempts.length
        ? Math.round(
            attempts.reduce((sum, item) => {
              if (!item.objectiveTotal) return sum
              return sum + (item.objectiveScore / item.objectiveTotal) * 100
            }, 0) / attempts.length
          )
        : 0

      const trend = attempts
        .slice()
        .reverse()
        .map((item) => (item.objectiveTotal ? Math.round((item.objectiveScore / item.objectiveTotal) * 100) : 0))

      return {
        ...subject,
        latest,
        averageRate,
        trend,
        attemptCount: attempts.length,
      }
    })
  }, [dashboardState.attempts])

  const englishSummary = subjectSummaries.find((item) => item.key === 'english') || null

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
          <div className="dashboard-action-row">
            <Link className="secondary-btn small-btn" to="/history">查看考试记录</Link>
            <Link className="secondary-btn small-btn" to="/library">打开本地题库库</Link>
          </div>
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
              {englishSummary?.latest ? `${englishSummary.latest.objectiveScore}/${englishSummary.latest.objectiveTotal}` : '--'}
            </div>
            <div className="metric-subtext">
              {englishSummary?.latest ? `最近一次作答：${new Date(englishSummary.latest.submittedAt).toLocaleString()}` : '还没有历史记录'}
            </div>
          </article>

          <article className="metric-card">
            <div className="metric-head"><BarChart3 size={18} /> 英语历史平均分</div>
            <div className="metric-value">{englishSummary?.averageRate || 0}%</div>
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
            <span className="section-header-tip">最近 {englishSummary?.attemptCount || 0} 次记录</span>
          </div>
          <div className="trend-body">
            <Sparkline values={englishSummary?.trend || []} />
          </div>
        </section>

        <section className="subject-summary-grid">
          {subjectSummaries.map((subject) => {
            const meta = getSubjectMeta(subject.key)
            return (
              <article key={subject.key} className={`subject-summary-card ${meta.isAvailable ? 'active' : 'pending'}`}>
                <div className={`module-badge ${meta.isAvailable ? '' : 'pending'}`}>
                  {meta.isAvailable ? '已接入' : '预留接口'}
                </div>
                <h3>{meta.label}</h3>
                <p>{meta.description}</p>
                <div className="subject-summary-row">
                  <span>历史考试：{subject.attemptCount}</span>
                  <span>平均分率：{subject.averageRate}%</span>
                </div>
                {meta.isAvailable && meta.route ? (
                  <Link className="primary-btn module-link" to={meta.route}>进入模块</Link>
                ) : (
                  <div className="module-meta">下一阶段可平滑接入</div>
                )}
              </article>
            )
          })}
        </section>

        <section className="modules-grid">
          <article className="module-card module-card-active">
            <div className="module-badge">已接入</div>
            <h3>英语本地题库库</h3>
            <p>支持按档案保存题库文件，后续可跨科目扩展。</p>
            <div className="module-meta">英语本地题库：{dashboardState.englishFiles.length} 份</div>
            <Link className="primary-btn module-link" to="/library">打开本地题库库</Link>
          </article>

          <article className="module-card module-card-active">
            <div className="module-badge">已接入</div>
            <h3>历史考试记录</h3>
            <p>查看最近考试、正确率趋势和错题累计。</p>
            <div className="module-meta">总记录：{dashboardState.attempts.length} 次</div>
            <Link className="primary-btn module-link" to="/history">查看考试记录</Link>
          </article>

          <article className="module-card module-card-pending">
            <div className="module-badge pending">下一阶段</div>
            <h3>多科目联动仪表盘</h3>
            <p>后续可基于同一 IndexedDB 结构平滑接入更多专业科目。</p>
            <div className="module-meta">已完成路由与数据结构预留</div>
          </article>
        </section>
      </div>
    </div>
  )
}
