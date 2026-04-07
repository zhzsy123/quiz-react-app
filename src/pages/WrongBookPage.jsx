import React, { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BookOpen, BookX, CheckCircle2, Filter, Play, RotateCcw, Search, Trash2, XCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import { loadWrongBookEntries, removeWrongBookEntries, removeWrongBookEntry } from '../boundaries/storageFacade'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../config/subjects'

function getWrongItemCategory(item) {
  if (item.parentType === 'reading' || item.sourceType === 'reading') return 'reading'
  if (
    item.sourceType === 'cloze' ||
    item.source_type === 'cloze' ||
    String(item.contextTitle || '').includes('完形') ||
    (item.tags || []).some((tag) => String(tag).toLowerCase() === 'cloze')
  ) {
    return 'cloze'
  }
  return 'single_choice'
}

function renderOptionLabel(option) {
  if (typeof option === 'string') return option
  return `${option.key}. ${option.text}`
}

export default function WrongBookPage() {
  const { activeProfileId } = useAppContext()
  const [entries, setEntries] = useState([])
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [practiceMode, setPracticeMode] = useState(false)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [holdSolvedItem, setHoldSolvedItem] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState([])

  const refreshEntries = async () => {
    if (!activeProfileId) return
    const groups = await Promise.all(SUBJECT_REGISTRY.map((subject) => loadWrongBookEntries(activeProfileId, subject.key)))
    const rows = groups.flat().sort((a, b) => (b.lastWrongAt || 0) - (a.lastWrongAt || 0))
    setEntries(rows.map((row) => ({ ...row, category: getWrongItemCategory(row) })))
  }

  useEffect(() => {
    void refreshEntries()
  }, [activeProfileId])

  const filteredWrongItems = useMemo(() => {
    const lowered = query.trim().toLowerCase()
    return entries.filter((item) => {
      const subjectMatched = subjectFilter === 'all' || item.subject === subjectFilter
      const typeMatched = typeFilter === 'all' || item.category === typeFilter
      const bucket = [item.prompt, item.contextTitle, item.contextSnippet, ...(item.tags || [])].join(' ').toLowerCase()
      const queryMatched = !lowered || bucket.includes(lowered)
      return subjectMatched && typeMatched && queryMatched
    })
  }, [entries, subjectFilter, typeFilter, query])

  const currentPracticeItem = practiceMode ? filteredWrongItems[practiceIndex] || null : null
  const displayPracticeItem = holdSolvedItem || currentPracticeItem

  useEffect(() => {
    if (!practiceMode) return
    if (practiceIndex >= filteredWrongItems.length) {
      setPracticeIndex(Math.max(filteredWrongItems.length - 1, 0))
    }
  }, [filteredWrongItems.length, practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedAnswer('')
    setFeedback('')
  }, [practiceIndex, practiceMode])

  useEffect(() => {
    setSelectedKeys((prev) => prev.filter((questionKey) => entries.some((item) => item.questionKey === questionKey)))
  }, [entries])

  const handleRemove = async (item) => {
    if (!activeProfileId) return
    await removeWrongBookEntry(activeProfileId, item.subject, item.questionKey)
    await refreshEntries()
  }

  const handleToggleSelected = (questionKey) => {
    setSelectedKeys((prev) =>
      prev.includes(questionKey) ? prev.filter((item) => item !== questionKey) : [...prev, questionKey]
    )
  }

  const handleSelectAllFiltered = () => {
    setSelectedKeys(filteredWrongItems.map((item) => item.questionKey))
  }

  const handleClearSelected = () => {
    setSelectedKeys([])
  }

  const removeItemsBulk = async (items) => {
    if (!activeProfileId || !items.length) return
    const grouped = items.reduce((map, item) => {
      if (!map[item.subject]) map[item.subject] = []
      map[item.subject].push(item.questionKey)
      return map
    }, {})

    for (const [subject, questionKeys] of Object.entries(grouped)) {
      await removeWrongBookEntries(activeProfileId, subject, questionKeys)
    }

    await refreshEntries()
  }

  const handleRemoveSelected = async () => {
    const targets = filteredWrongItems.filter((item) => selectedKeys.includes(item.questionKey))
    if (!targets.length) return
    const ok = window.confirm(`确定删除已选中的 ${targets.length} 道错题吗？`)
    if (!ok) return
    await removeItemsBulk(targets)
    setSelectedKeys([])
  }

  const handleRemoveAllFiltered = async () => {
    if (!filteredWrongItems.length) return
    const ok = window.confirm(`确定删除当前筛选结果中的全部 ${filteredWrongItems.length} 道错题吗？`)
    if (!ok) return
    await removeItemsBulk(filteredWrongItems)
    setSelectedKeys([])
  }

  const handlePracticeAnswer = async (optionKey) => {
    if (!displayPracticeItem || holdSolvedItem) return
    setSelectedAnswer(optionKey)
    if (optionKey === displayPracticeItem.correctAnswer) {
      setFeedback('回答正确，已从错题本移除。')
      setHoldSolvedItem(displayPracticeItem)
      await handleRemove(displayPracticeItem)
      return
    }
    setFeedback('回答错误，可以继续尝试。')
  }

  const handleAdvanceAfterSolved = () => {
    setHoldSolvedItem(null)
    setSelectedAnswer('')
    setFeedback('')
    if (practiceIndex >= filteredWrongItems.length && filteredWrongItems.length > 0) {
      setPracticeIndex(filteredWrongItems.length - 1)
    }
  }

  const resetPractice = () => {
    setPracticeIndex(0)
    setSelectedAnswer('')
    setFeedback('')
    setHoldSolvedItem(null)
  }

  const wrongSummary = {
    totalWrongRecords: entries.reduce((sum, item) => sum + (item.wrongTimes || 1), 0),
    uniqueWrongQuestions: entries.length,
    filteredCount: filteredWrongItems.length,
    latestWrongAt: filteredWrongItems[0]?.lastWrongAt || null,
  }

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline"><BookX size={28} /> 错题本</h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/"><ArrowLeft size={16} /> 返回首页</Link>
              <Link className="secondary-btn small-btn" to="/history">历史记录</Link>
              <Link className="secondary-btn small-btn" to="/exam/english"><BookOpen size={16} /> 文件列表</Link>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2><Filter size={18} /> 筛选与搜索</h2>
            <div className="dashboard-action-row">
              {practiceMode ? (
                <button className="secondary-btn small-btn" onClick={() => setPracticeMode(false)}>
                  <RotateCcw size={14} />
                  退出练习
                </button>
              ) : (
                <button
                  className="primary-btn small-btn"
                  onClick={() => {
                    setPracticeMode(true)
                    setPracticeIndex(0)
                  }}
                  disabled={filteredWrongItems.length === 0}
                >
                  <Play size={14} />
                  开始刷错题
                </button>
              )}
              {!practiceMode && (
                <>
                  <button className="secondary-btn small-btn" onClick={handleSelectAllFiltered} disabled={filteredWrongItems.length === 0}>
                    全选当前筛选
                  </button>
                  <button className="secondary-btn small-btn" onClick={handleClearSelected} disabled={selectedKeys.length === 0}>
                    清空选择
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveSelected} disabled={selectedKeys.length === 0}>
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveAllFiltered} disabled={filteredWrongItems.length === 0}>
                    <Trash2 size={14} />
                    全部删除
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="wrongbook-filter-grid">
            <label className="form-field">
              <span>科目</span>
              <select value={subjectFilter} onChange={(e) => setSubjectFilter(e.target.value)}>
                <option value="all">全部科目</option>
                {SUBJECT_REGISTRY.map((subject) => <option key={subject.key} value={subject.key}>{subject.label}</option>)}
              </select>
            </label>
            <label className="form-field">
              <span>题型</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">全部题型</option>
                <option value="single_choice">单项选择</option>
                <option value="cloze">完形填空</option>
                <option value="reading">阅读理解</option>
              </select>
            </label>
            <label className="form-field grow">
              <span>关键词</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索题干、阅读标题、标签或上下文" />
            </label>
          </div>
        </section>

        <section className="wrongbook-summary-grid">
          <article className="metric-card"><div className="metric-head"><BookX size={18} /> 错题记录总数</div><div className="metric-value">{wrongSummary.totalWrongRecords}</div></article>
          <article className="metric-card"><div className="metric-head"><Search size={18} /> 唯一错题数</div><div className="metric-value">{wrongSummary.uniqueWrongQuestions}</div></article>
          <article className="metric-card"><div className="metric-head"><Filter size={18} /> 当前筛选结果</div><div className="metric-value">{wrongSummary.filteredCount}</div></article>
          <article className="metric-card"><div className="metric-head"><BookOpen size={18} /> 最近错题时间</div><div className="metric-value small-metric-value">{wrongSummary.latestWrongAt ? new Date(wrongSummary.latestWrongAt).toLocaleDateString() : '--'}</div></article>
        </section>

        {practiceMode && (
          <section className="record-list-card wrongbook-practice-panel">
            <div className="section-header-row"><h2><Play size={18} /> 错题练习器</h2><span className="section-header-tip">{filteredWrongItems.length > 0 ? `第 ${Math.min(practiceIndex + 1, Math.max(filteredWrongItems.length, 1))} / ${filteredWrongItems.length}` : '已无待练习错题'}</span></div>
            {!displayPracticeItem ? (
              <div className="local-library-empty">当前筛选条件下已经没有待练习错题了。</div>
            ) : (
              <div className="wrongbook-practice-card">
                <div className="wrongbook-card-head">
                  <div>
                    <div className="wrongbook-card-title">{displayPracticeItem.prompt}</div>
                    <div className="wrongbook-meta">
                      <span>{getSubjectMeta(displayPracticeItem.subject).shortLabel}</span>
                      <span>题型：{displayPracticeItem.category === 'reading' ? '阅读理解' : displayPracticeItem.category === 'cloze' ? '完形填空' : '单项选择'}</span>
                      <span>来源：{displayPracticeItem.paperTitle}</span>
                    </div>
                  </div>
                  <button className="danger-btn small-btn" onClick={() => handleRemove(displayPracticeItem)}>
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>
                {displayPracticeItem.contextTitle && <div className="wrongbook-context"><strong>{displayPracticeItem.contextTitle}</strong>{displayPracticeItem.contextSnippet ? `：${displayPracticeItem.contextSnippet}` : ''}</div>}
                <div className="options">
                  {(displayPracticeItem.options || []).map((option, index) => {
                    const selected = selectedAnswer === option.key
                    let className = 'option'
                    let icon = null
                    const lockAnswering = Boolean(holdSolvedItem)
                    if (selected) className += ' selected'
                    if (selectedAnswer) {
                      if (option.key === displayPracticeItem.correctAnswer) {
                        className += ' correct'
                        icon = <CheckCircle2 size={18} />
                      } else if (selected) {
                        className += ' wrong'
                        icon = <XCircle size={18} />
                      }
                    }
                    return <button key={index} className={className} disabled={lockAnswering} onClick={() => handlePracticeAnswer(option.key)}><span>{renderOptionLabel(option)}</span>{icon}</button>
                  })}
                </div>
                {feedback && <div className="practice-feedback">{feedback}</div>}
                {selectedAnswer && selectedAnswer !== displayPracticeItem.correctAnswer && <div className="analysis-box"><div><strong>正确答案：</strong>{displayPracticeItem.correctAnswerLabel || displayPracticeItem.correctAnswer || '--'}</div><div><strong>解析：</strong>{displayPracticeItem.rationale || '暂无解析'}</div></div>}
                <div className="question-actions">
                  <button className="secondary-btn" onClick={() => setPracticeIndex((value) => Math.max(value - 1, 0))} disabled={practiceIndex <= 0 || Boolean(holdSolvedItem)}>上一题</button>
                  {holdSolvedItem ? (
                    <button className="secondary-btn" onClick={handleAdvanceAfterSolved}>下一题</button>
                  ) : (
                    <button className="secondary-btn" onClick={() => setPracticeIndex((value) => Math.min(value + 1, Math.max(filteredWrongItems.length - 1, 0)))} disabled={practiceIndex >= filteredWrongItems.length - 1}>下一题</button>
                  )}
                  <button className="secondary-btn" onClick={resetPractice}><RotateCcw size={14} /> 重新开始</button>
                </div>
              </div>
            )}
          </section>
        )}

        {!practiceMode && (
          <section className="record-list-card">
            <div className="section-header-row"><h2><BookX size={18} /> 错题列表</h2><span className="section-header-tip">按最近出错时间倒序排列</span></div>
            {filteredWrongItems.length === 0 ? (
              <div className="local-library-empty">当前还没有可展示的错题。</div>
            ) : (
              <div className="wrongbook-list">
                {filteredWrongItems.map((item) => {
                  const subjectMeta = getSubjectMeta(item.subject)
                  return (
                    <article key={item.questionKey} className="wrongbook-card">
                      <div className="wrongbook-card-head">
                        <div>
                          <label className="wrongbook-select-row">
                            <input
                              type="checkbox"
                              checked={selectedKeys.includes(item.questionKey)}
                              onChange={() => handleToggleSelected(item.questionKey)}
                            />
                            <span>选中此题</span>
                          </label>
                          <div className="wrongbook-card-title">{item.prompt}</div>
                          <div className="wrongbook-meta">
                            <span>{subjectMeta.shortLabel}</span>
                            <span>题型：{item.category === 'reading' ? '阅读理解' : item.category === 'cloze' ? '完形填空' : '单项选择'}</span>
                            <span>错题次数 {item.wrongTimes || 1}</span>
                            <span>最近出错：{item.lastWrongAt ? new Date(item.lastWrongAt).toLocaleString() : '--'}</span>
                            <span>来源：{item.paperTitle}</span>
                          </div>
                        </div>
                        <button className="danger-btn small-btn" onClick={() => handleRemove(item)}>
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                      {item.contextTitle && <div className="wrongbook-context"><strong>{item.contextTitle}</strong>{item.contextSnippet ? `：${item.contextSnippet}` : ''}</div>}
                      <div className="wrongbook-answer-compare"><div className="wrongbook-answer-pill wrong"><span>你的答案</span><strong>{item.userAnswerLabel || '未作答'}</strong></div><div className="wrongbook-answer-pill correct"><span>正确答案</span><strong>{item.correctAnswerLabel || item.correctAnswer || '--'}</strong></div></div>
                      <div className="wrongbook-rationale">解析：{item.rationale || '暂无解析'}</div>
                    </article>
                  )
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
