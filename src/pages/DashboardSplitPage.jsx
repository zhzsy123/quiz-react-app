import React, { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Database,
  Download,
  FileJson,
  FolderOpen,
  LayoutDashboard,
  Pencil,
  Plus,
  Star,
  User2,
  WandSparkles,
} from 'lucide-react'
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
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
      const y = height - ((value - min) / range) * (height - 8) - 4
      return `${x},${y}`
    })
    .join(' ')

  return (
    <svg className="sparkline" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function WorkflowCard() {
  return (
    <section className="dashboard-section-card dashboard-workflow-card">
      <div className="section-header-row">
        <h2>
          <FileJson size={18} />
          JSON 规范与导入工作流
        </h2>
        <span className="section-header-tip">先让 AI 清洗，再导入本站</span>
      </div>

      <div className="workflow-step-grid">
        <article className="workflow-step-card">
          <span className="workflow-step-index">01</span>
          <h3>准备原始试卷</h3>
          <p>把 PDF 或 DOCX 试卷整理好，尽量保证题号、选项和答案区块完整。</p>
        </article>

        <article className="workflow-step-card">
          <span className="workflow-step-index">02</span>
          <h3>让 AI 输出 JSON</h3>
          <p>把试卷和 JSON Schema v2 一起发给 AI，让它只返回符合规范的 JSON 数据。</p>
        </article>

        <article className="workflow-step-card">
          <span className="workflow-step-index">03</span>
          <h3>导入并开始练习</h3>
          <p>在题库页导入 JSON，之后就可以进入练习、考试、错题复习和收藏流程。</p>
        </article>
      </div>

      <div className="workflow-download-strip">
        <a className="secondary-btn small-btn" href="./json-schema-v2.md" download>
          <Download size={14} />
          下载 JSON 规范
        </a>
        <a className="secondary-btn small-btn" href="./sample-schema-v2.json" download>
          <Download size={14} />
          下载 v2 示例
        </a>
        <a className="secondary-btn small-btn" href="./sample-schema-v1.json" download>
          <Download size={14} />
          下载 v1 示例
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
  const [dashboardState, setDashboardState] = useState({
    attempts: [],
    totalQuestionVolume: 0,
    totalWrong: 0,
  })

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
    return () => {
      cancelled = true
    }
  }, [activeProfileId])

  const subjectSummaries = useMemo(
    () =>
      SUBJECT_REGISTRY.map((subject) => {
        const attempts = dashboardState.attempts.filter((item) => item.subject === subject.key)
        const latest = attempts[0] || null
        const averageRate = attempts.length
          ? Math.round(
              attempts.reduce((sum, item) => {
                return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
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
      }),
    [dashboardState.attempts]
  )

  const activeModules = subjectSummaries.filter((item) => item.isAvailable)
  const primarySummary = activeModules[0] || null
  const recentAttempts = dashboardState.attempts.slice(0, 4)
  const overallAverageRate = dashboardState.attempts.length
    ? Math.round(
        dashboardState.attempts.reduce((sum, item) => {
          return sum + (item.objectiveTotal ? (item.objectiveScore / item.objectiveTotal) * 100 : 0)
        }, 0) / dashboardState.attempts.length
      )
    : 0
  const latestAttempt = dashboardState.attempts[0] || null

  const heroStats = [
    {
      label: '历史考试',
      value: `${dashboardState.attempts.length} 次`,
      hint: '已完成的正式提交记录',
    },
    {
      label: '总刷题量',
      value: dashboardState.totalQuestionVolume,
      hint: '累计处理过的题目数量',
    },
    {
      label: '平均正确率',
      value: `${overallAverageRate}%`,
      hint: '按客观题得分率计算',
    },
    {
      label: '收藏题目',
      value: favoriteCount,
      hint: '当前档案下的收藏内容',
    },
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

  if (loading) {
    return (
      <div className="app-shell">
        <div className="container">
          <section className="dashboard-hero">
            <div className="hero-icon">
              <LayoutDashboard size={30} />
            </div>
            <h1>本地备考仪表盘</h1>
          </section>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-home-shell">
        <section className="dashboard-hero-panel">
          <div className="dashboard-hero-copy">
            <div className="dashboard-board-kicker">Study Control Center</div>
            <h1>把题库、练习、错题和历史记录放到同一个工作台里。</h1>
            <p>
              这里优先承载个人使用场景：用 AI 把试卷清洗成 JSON，导入后继续在本地完成练习、考试、收藏与复习。
            </p>

            <div className="dashboard-hero-actions">
              <Link className="primary-btn" to="/exam/english">
                进入主科目
              </Link>
              <Link className="secondary-btn" to="/history">
                查看历史记录
              </Link>
              <Link className="secondary-btn" to="/wrong-book">
                打开错题本
              </Link>
            </div>

            <div className="dashboard-hero-stats">
              {heroStats.map((item) => (
                <article key={item.label} className="hero-stat-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.hint}</small>
                </article>
              ))}
            </div>
          </div>

          <div className="dashboard-hero-aside">
            <article className="hero-aside-card hero-profile-card">
              <div className="hero-aside-label">
                <User2 size={16} />
                当前工作档案
              </div>
              <strong>{activeProfile?.name || '未命名档案'}</strong>
              <p>首页优先展示你最常用的入口，减少跳转和找功能的时间。</p>
            </article>

            <div className="hero-action-grid">
              <Link className="hero-action-card hero-action-card-danger" to="/wrong-book">
                <div className="hero-action-title">
                  <BookOpen size={18} />
                  错题复习
                </div>
                <strong>{dashboardState.totalWrong}</strong>
                <span>优先消化累计错题</span>
              </Link>

              <Link className="hero-action-card hero-action-card-accent" to="/favorites">
                <div className="hero-action-title">
                  <Star size={18} />
                  收藏题单
                </div>
                <strong>{favoriteCount}</strong>
                <span>回看重点和待复习题目</span>
              </Link>
            </div>

            <article className="hero-aside-card hero-next-step-card">
              <div className="hero-aside-label">
                <WandSparkles size={16} />
                推荐下一步
              </div>
              <p>先下载 JSON 规范，把 PDF / DOCX 交给 AI 清洗，再导入题库开始练习。</p>
              <a className="secondary-btn small-btn" href="./json-schema-v2.md" download>
                <Download size={14} />
                下载规范
              </a>
            </article>
          </div>
        </section>

        <div className="dashboard-main-grid">
          <aside className="dashboard-control-column">
            <section className="dashboard-section-card workspace-card dashboard-profile-card">
              <div className="rail-card-head">
                <div className="rail-card-title">
                  <User2 size={18} />
                  本地档案
                </div>
                {activeProfile && (
                  <button className="secondary-btn small-btn" onClick={handleRenameProfile}>
                    <Pencil size={14} />
                    重命名
                  </button>
                )}
              </div>

              <div className="rail-profile-badge">
                当前档案：<strong>{activeProfile?.name || '未命名档案'}</strong>
              </div>

              <div className="workspace-summary-row">
                <div className="workspace-mini-stat">
                  <span>历史考试</span>
                  <strong>{dashboardState.attempts.length}</strong>
                </div>
                <div className="workspace-mini-stat">
                  <span>总刷题量</span>
                  <strong>{dashboardState.totalQuestionVolume}</strong>
                </div>
              </div>

              <div className="profile-controls compact-profile-controls">
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
                  {showCreateProfile ? '收起新建档案' : '展开新建档案'}
                </button>

                {showCreateProfile && (
                  <div className="profile-create-panel">
                    <label className="form-field grow">
                      <span>新建档案</span>
                      <input
                        value={newProfileName}
                        onChange={(event) => setNewProfileName(event.target.value)}
                        placeholder="输入新的本地用户名称"
                      />
                    </label>
                    <button className="primary-btn profile-create-btn" onClick={handleCreateProfile}>
                      <Plus size={16} />
                      新建并切换
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section className="dashboard-section-card dashboard-mini-panel">
              <div className="section-header-row">
                <h2>
                  <LayoutDashboard size={18} />
                  快捷入口
                </h2>
              </div>

              <div className="dashboard-mini-links">
                <Link className="mini-link-card" to="/history">
                  <BarChart3 size={16} />
                  历史记录
                </Link>
                <Link className="mini-link-card" to="/wrong-book">
                  <BookOpen size={16} />
                  错题本
                </Link>
                <Link className="mini-link-card" to="/favorites">
                  <Star size={16} />
                  收藏夹
                </Link>
              </div>
            </section>
          </aside>

          <main className="dashboard-content-column">
            <section className="dashboard-section-card dashboard-modules-card">
              <div className="section-header-row">
                <h2>
                  <FolderOpen size={18} />
                  科目入口
                </h2>
                <span className="section-header-tip">把高频动作放在首页第一屏</span>
              </div>

              <div className="subject-module-grid">
                {activeModules.map((subject) => (
                  <Link key={subject.key} className="subject-module-card" to={subject.route}>
                    <div className="subject-module-head">
                      <div>
                        <strong>{subject.shortLabel}</strong>
                        <p>{subject.description}</p>
                      </div>
                      <span className="module-badge">可用</span>
                    </div>

                    <div className="subject-module-meta">
                      <span>历史考试 {subject.attemptCount}</span>
                      <span>平均正确率 {subject.averageRate}%</span>
                    </div>

                    <div className="primary-task-footer">
                      <span>进入模块</span>
                      <ArrowRight size={16} />
                    </div>
                  </Link>
                ))}
              </div>
            </section>

            <WorkflowCard />

            <section className="stats-grid dashboard-stats-grid">
              <article className="metric-card">
                <div className="metric-head">
                  <BookOpen size={18} />
                  最近一次考试
                </div>
                <div className="metric-value">
                  {latestAttempt ? `${latestAttempt.objectiveScore}/${latestAttempt.objectiveTotal}` : '--'}
                </div>
                <div className="metric-subtext">
                  {latestAttempt?.title || '当前还没有提交记录'}
                </div>
              </article>

              <article className="metric-card">
                <div className="metric-head">
                  <BarChart3 size={18} />
                  历史平均分
                </div>
                <div className="metric-value">{overallAverageRate}%</div>
                <div className="metric-subtext">按所有历史记录的客观题得分率计算</div>
              </article>

              <article className="metric-card">
                <div className="metric-head">
                  <FolderOpen size={18} />
                  总刷题量
                </div>
                <div className="metric-value">{dashboardState.totalQuestionVolume}</div>
                <div className="metric-subtext">累计参与练习和考试的题目数量</div>
              </article>

              <article className="metric-card">
                <div className="metric-head">
                  <Database size={18} />
                  累计错题
                </div>
                <div className="metric-value">{dashboardState.totalWrong}</div>
                <div className="metric-subtext">来自已提交记录中的错题统计</div>
              </article>
            </section>

            <section className="dashboard-bottom-grid">
              <section className="trend-card dashboard-section-card">
                <div className="section-header-row">
                  <h2>
                    <BarChart3 size={18} />
                    {primarySummary?.shortLabel || '英语'} 成绩趋势
                  </h2>
                  <span className="section-header-tip">最近 {primarySummary?.attemptCount || 0} 次</span>
                </div>

                <div className="trend-body">
                  <Sparkline values={primarySummary?.trend || []} />
                </div>
              </section>

              <section className="dashboard-section-card recent-activity-card">
                <div className="section-header-row">
                  <h2>
                    <LayoutDashboard size={18} />
                    最近活动
                  </h2>
                  <span className="section-header-tip">最近 4 次考试</span>
                </div>

                {recentAttempts.length === 0 ? (
                  <div className="local-library-empty">暂无记录</div>
                ) : (
                  <div className="recent-attempt-list">
                    {recentAttempts.map((attempt) => {
                      const rate = attempt.objectiveTotal
                        ? Math.round((attempt.objectiveScore / attempt.objectiveTotal) * 100)
                        : 0

                      return (
                        <article key={attempt.id} className="recent-attempt-item">
                          <div className="recent-attempt-title">{attempt.title || '未命名试卷'}</div>
                          <div className="recent-attempt-meta">
                            <span>{new Date(attempt.submittedAt).toLocaleString()}</span>
                            <span>
                              {attempt.objectiveScore}/{attempt.objectiveTotal}
                            </span>
                            <span>{rate}%</span>
                          </div>
                        </article>
                      )
                    })}
                  </div>
                )}
              </section>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}
