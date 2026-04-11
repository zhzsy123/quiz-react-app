import React from 'react'
import {
  ArrowLeft,
  BookOpen,
  BookX,
  CheckCircle2,
  Filter,
  Play,
  RotateCcw,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAppContext } from '../app/providers/AppContext'
import { SUBJECT_REGISTRY, getSubjectMeta } from '../entities/subject/model/subjects'
import { listAllWrongbookEntries } from '../entities/wrongbook/api/wrongbookRepository'
import {
  formatWrongBookDisplayValue,
  getWrongItemCategoryLabel,
  renderWrongBookOptionLabel,
  isRenderableWrongBookEntry,
  sanitizeWrongBookEntry,
  useWrongBookPageState,
} from '../features/wrong-book/model/useWrongBookPageState'

function WrongBookRecoveryPanel() {
  const { activeProfileId } = useAppContext()
  const [loading, setLoading] = React.useState(true)
  const [entries, setEntries] = React.useState([])

  React.useEffect(() => {
    let disposed = false

    async function load() {
      if (!activeProfileId) {
        if (!disposed) {
          setEntries([])
          setLoading(false)
        }
        return
      }

      try {
        const rows = await listAllWrongbookEntries(activeProfileId)
        const nextEntries = (Array.isArray(rows) ? rows : [])
          .filter(isRenderableWrongBookEntry)
          .map((item) => sanitizeWrongBookEntry(item))

        if (!disposed) {
          setEntries(nextEntries)
          setLoading(false)
        }
      } catch (error) {
        console.error('错题本安全模式加载失败', error)
        if (!disposed) {
          setEntries([])
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      disposed = true
    }
  }, [activeProfileId])

  if (loading) {
    return <div className="local-library-empty">正在以安全模式加载错题本…</div>
  }

  if (entries.length === 0) {
    return <div className="local-library-empty">安全模式下未加载到可显示的错题记录。</div>
  }

  return (
    <div className="wrongbook-list">
      {entries.slice(0, 20).map((item) => (
        <article key={item.questionKey} className="wrongbook-item-card">
          <div className="wrongbook-card-head">
            <span className="wrongbook-card-title">{item.prompt}</span>
          </div>
          <div className="wrongbook-meta">
            <span>{getSubjectMeta(item.subject).shortLabel}</span>
            <span>题型：{getWrongItemCategoryLabel(item.category)}</span>
            {item.paperTitle ? <span>来源：{item.paperTitle}</span> : null}
          </div>
          {item.contextTitle && (
            <div className="wrongbook-context">
              <strong>{item.contextTitle}</strong>
              {item.contextSnippet ? `：${item.contextSnippet}` : ''}
            </div>
          )}
          <div className="analysis-box compact-analysis-box">
            <div>
              正确答案：
              <strong>{formatWrongBookDisplayValue(item.correctAnswerLabel || item.correctAnswer, '见题目配置')}</strong>
            </div>
            <div>解析：{formatWrongBookDisplayValue(item.rationale, '暂无解析')}</div>
          </div>
        </article>
      ))}
    </div>
  )
}

class WrongBookPageErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('错题本页面渲染失败', error)
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-shell">
          <div className="container dashboard-page">
            <section className="record-list-card">
              <div className="section-header-row">
                <h2>
                  <BookX size={18} /> 错题本暂时无法渲染
                </h2>
              </div>
              <div className="local-library-empty">
                当前错题本里存在异常数据，页面已阻止白屏。你可以先重试打开；如果问题持续，继续清洗历史错题记录。
              </div>
              <div className="dashboard-action-row">
                <button type="button" className="primary-btn small-btn" onClick={this.handleRetry}>
                  重新加载
                </button>
                <Link className="secondary-btn small-btn" to="/">
                  返回首页
                </Link>
              </div>
              <div style={{ marginTop: 20 }}>
                <WrongBookRecoveryPanel />
              </div>
            </section>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

function BlankPracticePanel({
  item,
  blankAnswers,
  blankFeedback,
  isCloze,
  disabled,
  holdSolvedItem,
  feedback,
  onBlankChange,
  onClozeAnswer,
  onCheck,
}) {
  return (
    <>
      <div className="answer-review-grid">
        {(item.blanks || []).map((blank, index) => (
          <article key={blank.blank_id} className="answer-review-card">
            <div className="answer-review-prompt">空 {index + 1}</div>
            {isCloze ? (
              <div className="options compact-options">
                {(blank.options || []).map((option, optionIndex) => {
                  const selected = blankAnswers[blank.blank_id] === option.key
                  let className = 'option'

                  if (selected) className += ' selected'
                  if (feedback) {
                    if (option.key === blank.correct) className += ' correct'
                    else if (selected) className += ' wrong'
                    else className += ' muted'
                  }

                  return (
                    <button
                      key={optionIndex}
                      type="button"
                      className={className}
                      disabled={disabled || Boolean(holdSolvedItem)}
                      onClick={() => onClozeAnswer(blank.blank_id, option.key)}
                    >
                      <span>{renderWrongBookOptionLabel(option)}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <input
                className="subjective-textarea"
                value={blankAnswers[blank.blank_id] || ''}
                onChange={(event) => onBlankChange(blank.blank_id, event.target.value)}
                disabled={disabled || Boolean(holdSolvedItem)}
                placeholder="请输入答案"
              />
            )}
          </article>
        ))}
      </div>

      <div className="question-inline-actions">
        <button type="button" className="secondary-btn small-btn" disabled={Boolean(holdSolvedItem)} onClick={onCheck}>
          检查答案
        </button>
      </div>

      {feedback && <div className="practice-feedback">{feedback}</div>}

      {blankFeedback.length > 0 && feedback && (
        <div className="answer-review-grid">
          {blankFeedback.map((blank) => (
            <article
              key={blank.blankId}
              className={`answer-review-card ${blank.matched ? 'correct' : 'wrong'}`}
            >
              <div className="answer-review-prompt">{blank.label}</div>
              <div className="answer-review-line">
                <strong>你的答案</strong>
                {blank.value || '未作答'}
              </div>
              <div className="answer-review-line">
                <strong>参考答案</strong>
                {blank.correctLabel || '暂无'}
              </div>
              <div className="answer-review-line">
                <strong>解析</strong>
                {blank.rationale || '暂无解析'}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}

function MultipleChoicePracticePanel({
  item,
  selectedChoices,
  feedback,
  holdSolvedItem,
  onToggleChoice,
  onCheck,
}) {
  return (
    <>
      <div className="options">
        {(item.options || []).map((option, index) => {
          const selected = selectedChoices.includes(option.key)
          const correctValues = Array.isArray(item.correctAnswer) ? item.correctAnswer : []
          let className = 'option'
          let icon = null

          if (selected) className += ' selected'
          if (feedback) {
            if (correctValues.includes(option.key)) {
              className += ' correct'
              icon = <CheckCircle2 size={18} />
            } else if (selected) {
              className += ' wrong'
              icon = <XCircle size={18} />
            } else {
              className += ' muted'
            }
          }

          return (
            <button
              key={index}
              type="button"
              className={className}
              disabled={Boolean(holdSolvedItem)}
              onClick={() => onToggleChoice(option.key)}
            >
              <span>{renderWrongBookOptionLabel(option)}</span>
              {icon}
            </button>
          )
        })}
      </div>

      <div className="question-inline-actions">
        <button type="button" className="secondary-btn small-btn" disabled={Boolean(holdSolvedItem)} onClick={onCheck}>
          检查答案
        </button>
      </div>

      {feedback && <div className="practice-feedback">{feedback}</div>}
      {feedback && (
        <div className="analysis-box">
          <div>
            正确答案：
            <strong>
              {Array.isArray(item.correctAnswer)
                ? formatWrongBookDisplayValue(item.correctAnswer, '见题目配置')
                : '见题目配置'}
            </strong>
          </div>
          <div>解析：{formatWrongBookDisplayValue(item.rationale, '暂无解析')}</div>
        </div>
      )}
    </>
  )
}

function WrongBookPageContent() {
  const {
    filteredWrongItems,
    subjectFilter,
    setSubjectFilter,
    typeFilter,
    setTypeFilter,
    typeOptions,
    query,
    setQuery,
    practiceMode,
    setPracticeMode,
    practiceIndex,
    setPracticeIndex,
    selectedAnswer,
    selectedChoices,
    blankAnswers,
    blankFeedback,
    feedback,
    displayPracticeItem,
    holdSolvedItem,
    isBlankPracticeItem,
    isClozePracticeItem,
    isMultipleChoicePracticeItem,
    selectedKeys,
    wrongSummary,
    handleRemove,
    handleToggleSelected,
    handleSelectAllFiltered,
    handleClearSelected,
    handleRemoveSelected,
    handleRemoveAllFiltered,
    handlePracticeAnswer,
    handleTogglePracticeChoice,
    handlePracticeBlankChange,
    handlePracticeClozeAnswer,
    handleCheckPracticeBlank,
    handleCheckPracticeObjective,
    handleAdvanceAfterSolved,
    resetPractice,
  } = useWrongBookPageState()

  const safeFilteredWrongItems = React.useMemo(
    () => (Array.isArray(filteredWrongItems) ? filteredWrongItems.map((item) => sanitizeWrongBookEntry(item)) : []),
    [filteredWrongItems]
  )
  const safeDisplayPracticeItem = React.useMemo(
    () => (displayPracticeItem ? sanitizeWrongBookEntry(displayPracticeItem) : null),
    [displayPracticeItem]
  )
  const safeSelectedKeys = Array.isArray(selectedKeys) ? selectedKeys : []
  const safeWrongSummary = {
    totalWrongRecords: Number(wrongSummary?.totalWrongRecords) || 0,
    uniqueWrongQuestions: Number(wrongSummary?.uniqueWrongQuestions) || 0,
    filteredCount: Number(wrongSummary?.filteredCount) || safeFilteredWrongItems.length,
    latestWrongAt: wrongSummary?.latestWrongAt || null,
  }

  const libraryRoute =
    getSubjectMeta(subjectFilter !== 'all' ? subjectFilter : safeFilteredWrongItems[0]?.subject || SUBJECT_REGISTRY[0]?.key)
      ?.route || '/'

  return (
    <div className="app-shell">
      <div className="container dashboard-page">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline">
              <BookX size={28} />
              错题本
            </h1>
            <div className="dashboard-action-row">
              <Link className="secondary-btn small-btn" to="/">
                <ArrowLeft size={16} />
                返回首页
              </Link>
              <Link className="secondary-btn small-btn" to="/history">
                历史记录
              </Link>
              <Link className="secondary-btn small-btn" to={libraryRoute || '/'}>
                <BookOpen size={16} />
                文件列表
              </Link>
            </div>
          </div>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2>
              <Filter size={18} />
              筛选与搜索
            </h2>
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
                  disabled={safeFilteredWrongItems.length === 0}
                >
                  <Play size={14} />
                  开始刷错题
                </button>
              )}
              {!practiceMode && (
                <>
                  <button className="secondary-btn small-btn" onClick={handleSelectAllFiltered} disabled={safeFilteredWrongItems.length === 0}>
                    全选当前筛选
                  </button>
                  <button className="secondary-btn small-btn" onClick={handleClearSelected} disabled={selectedKeys.length === 0}>
                    清空选择
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveSelected} disabled={selectedKeys.length === 0}>
                    <Trash2 size={14} />
                    批量删除
                  </button>
                  <button className="danger-btn small-btn" onClick={handleRemoveAllFiltered} disabled={safeFilteredWrongItems.length === 0}>
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
                {SUBJECT_REGISTRY.map((subject) => (
                  <option key={subject.key} value={subject.key}>
                    {subject.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field">
              <span>题型</span>
              <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
                <option value="all">全部题型</option>
                {typeOptions.map((typeMeta) => (
                  <option key={typeMeta.key} value={typeMeta.key}>
                    {typeMeta.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="form-field grow">
              <span>关键词</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索题干、阅读标题、标签或上下文"
              />
            </label>
          </div>
        </section>

        <section className="wrongbook-summary-grid">
          <article className="metric-card">
            <div className="metric-head">
              <BookX size={18} /> 错题记录总数
            </div>
            <div className="metric-value">{safeWrongSummary.totalWrongRecords}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <Search size={18} /> 唯一错题数
            </div>
            <div className="metric-value">{safeWrongSummary.uniqueWrongQuestions}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <Filter size={18} /> 当前筛选结果
            </div>
            <div className="metric-value">{safeWrongSummary.filteredCount}</div>
          </article>
          <article className="metric-card">
            <div className="metric-head">
              <BookOpen size={18} /> 最近错题时间
            </div>
            <div className="metric-value small-metric-value">
              {safeWrongSummary.latestWrongAt ? new Date(safeWrongSummary.latestWrongAt).toLocaleDateString() : '--'}
            </div>
          </article>
        </section>

        {practiceMode && (
          <section className="record-list-card wrongbook-practice-panel">
            <div className="section-header-row">
              <h2>
                <Play size={18} /> 错题练习区
              </h2>
              <span className="section-header-tip">
                {safeFilteredWrongItems.length > 0
                  ? `第 ${Math.min(practiceIndex + 1, Math.max(safeFilteredWrongItems.length, 1))} / ${safeFilteredWrongItems.length}`
                  : '已无待练习错题'}
              </span>
            </div>

            {!safeDisplayPracticeItem ? (
              <div className="local-library-empty">当前筛选条件下已经没有待练习错题了。</div>
            ) : (
              <div className="wrongbook-practice-card">
                <div className="wrongbook-card-head">
                  <div>
                    <div className="wrongbook-card-title">{safeDisplayPracticeItem.prompt}</div>
                    <div className="wrongbook-meta">
                      <span>{getSubjectMeta(safeDisplayPracticeItem.subject).shortLabel}</span>
                      <span>题型：{getWrongItemCategoryLabel(safeDisplayPracticeItem.category)}</span>
                      <span>来源：{safeDisplayPracticeItem.paperTitle}</span>
                    </div>
                  </div>
                  <button className="danger-btn small-btn" onClick={() => handleRemove(safeDisplayPracticeItem)}>
                    <Trash2 size={14} />
                    删除
                  </button>
                </div>

                {safeDisplayPracticeItem.contextTitle && (
                  <div className="wrongbook-context">
                    <strong>{safeDisplayPracticeItem.contextTitle}</strong>
                    {safeDisplayPracticeItem.contextSnippet ? `：${safeDisplayPracticeItem.contextSnippet}` : ''}
                  </div>
                )}

                {isBlankPracticeItem || isClozePracticeItem ? (
                  <BlankPracticePanel
                    item={safeDisplayPracticeItem}
                    blankAnswers={blankAnswers}
                    blankFeedback={blankFeedback}
                    isCloze={isClozePracticeItem}
                    disabled={false}
                    holdSolvedItem={holdSolvedItem}
                    feedback={feedback}
                    onBlankChange={handlePracticeBlankChange}
                    onClozeAnswer={handlePracticeClozeAnswer}
                    onCheck={handleCheckPracticeBlank}
                  />
                ) : isMultipleChoicePracticeItem ? (
                  <MultipleChoicePracticePanel
                    item={safeDisplayPracticeItem}
                    selectedChoices={selectedChoices}
                    feedback={feedback}
                    holdSolvedItem={holdSolvedItem}
                    onToggleChoice={handleTogglePracticeChoice}
                    onCheck={handleCheckPracticeObjective}
                  />
                ) : (
                  <>
                    <div className="options">
                      {(safeDisplayPracticeItem.options || []).map((option, index) => {
                        const selected = selectedAnswer === option.key
                        let className = 'option'
                        let icon = null
                        const lockAnswering = Boolean(holdSolvedItem)

                        if (selected) className += ' selected'

                        if (selectedAnswer) {
                          if (option.key === safeDisplayPracticeItem.correctAnswer) {
                            className += ' correct'
                            icon = <CheckCircle2 size={18} />
                          } else if (selected) {
                            className += ' wrong'
                            icon = <XCircle size={18} />
                          } else {
                            className += ' muted'
                          }
                        }

                        return (
                          <button
                            key={index}
                            type="button"
                            className={className}
                            disabled={lockAnswering}
                            onClick={() => handlePracticeAnswer(option.key)}
                          >
                            <span>{renderWrongBookOptionLabel(option)}</span>
                            {icon}
                          </button>
                        )
                      })}
                    </div>

                    {feedback && <div className="practice-feedback">{feedback}</div>}

                    {selectedAnswer && (
                      <div className="analysis-box">
                        <div>
                          正确答案：
                          <strong>{formatWrongBookDisplayValue(safeDisplayPracticeItem.correctAnswer, '见题目配置')}</strong>
                        </div>
                        <div>解析：{formatWrongBookDisplayValue(safeDisplayPracticeItem.rationale, '暂无解析')}</div>
                      </div>
                    )}
                  </>
                )}

                <div className="question-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    disabled={practiceIndex <= 0}
                    onClick={() => {
                      setPracticeIndex((prev) => Math.max(prev - 1, 0))
                      resetPractice()
                    }}
                  >
                    上一题
                  </button>

                  {holdSolvedItem ? (
                    <button type="button" className="primary-btn" onClick={handleAdvanceAfterSolved}>
                      下一题
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="secondary-btn"
                      disabled={practiceIndex >= safeFilteredWrongItems.length - 1}
                      onClick={() => {
                        setPracticeIndex((prev) => Math.min(prev + 1, safeFilteredWrongItems.length - 1))
                        resetPractice()
                      }}
                    >
                      下一题
                    </button>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {!practiceMode && (
          <section className="record-list-card">
            <div className="section-header-row">
              <h2>
                <BookOpen size={18} /> 错题列表
              </h2>
            </div>

            {safeFilteredWrongItems.length === 0 ? (
              <div className="local-library-empty">当前筛选条件下没有错题。</div>
            ) : (
              <div className="wrongbook-list">
                {safeFilteredWrongItems.map((item) => {
                  const checked = safeSelectedKeys.includes(item.questionKey)
                  return (
                    <article key={item.questionKey} className="wrongbook-item-card">
                      <div className="wrongbook-card-head">
                        <label className="wrongbook-select-row">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleSelected(item.questionKey)}
                          />
                          <span className="wrongbook-card-title">{item.prompt}</span>
                        </label>
                        <button className="danger-btn small-btn" onClick={() => handleRemove(item)}>
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>

                      <div className="wrongbook-meta">
                        <span>{getSubjectMeta(item.subject).shortLabel}</span>
                        <span>题型：{getWrongItemCategoryLabel(item.category)}</span>
                        <span>错题次数：{item.wrongTimes || 1}</span>
                        {item.paperTitle ? <span>来源：{item.paperTitle}</span> : null}
                      </div>

                      {item.contextTitle && (
                        <div className="wrongbook-context">
                          <strong>{item.contextTitle}</strong>
                          {item.contextSnippet ? `：${item.contextSnippet}` : ''}
                        </div>
                      )}

                      <div className="analysis-box compact-analysis-box">
                        <div>
                          正确答案：
                          <strong>
                            {formatWrongBookDisplayValue(
                              item.correctAnswerLabel || item.correctAnswer,
                              '见题目配置'
                            )}
                          </strong>
                        </div>
                        <div>解析：{formatWrongBookDisplayValue(item.rationale, '暂无解析')}</div>
                      </div>
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

export default function WrongBookPage() {
  return (
    <WrongBookPageErrorBoundary>
      <WrongBookPageContent />
    </WrongBookPageErrorBoundary>
  )
}
