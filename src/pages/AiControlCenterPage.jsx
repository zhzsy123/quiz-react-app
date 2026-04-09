import React from 'react'
import { ArrowLeft, Bot, Coins, Cpu, KeyRound, RefreshCw, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAiControlCenterState } from '../features/ai-center/model/useAiControlCenterState'

export default function AiControlCenterPage() {
  const {
    activeProfile,
    loading,
    error,
    config,
    setConfig,
    savingConfig,
    summary,
    summaryCards,
    pricingCards,
    pricingEffectiveDate,
    availableModels,
    maskedApiKey,
    usageRows,
    tokenizerText,
    setTokenizerText,
    tokenizerState,
    handleSaveConfig,
    handleClearRecords,
    handleCountTokens,
    refreshRecords,
  } = useAiControlCenterState()

  return (
    <div className="app-shell">
      <div className="container dashboard-page ai-center-shell">
        <section className="dashboard-hero left-hero compact-page-hero">
          <div className="section-header-row no-margin">
            <h1 className="page-title-inline">
              <Bot size={28} />
              AI 控制中心
            </h1>
            <div className="dashboard-action-row">
              <button type="button" className="secondary-btn small-btn" onClick={refreshRecords}>
                <RefreshCw size={14} />
                刷新
              </button>
              <Link className="secondary-btn small-btn" to="/">
                <ArrowLeft size={16} />
                返回首页
              </Link>
            </div>
          </div>

          <div className="hub-topbar-meta">
            <div className="profile-inline-badge">
              <KeyRound size={16} />
              {activeProfile?.name || '未命名档案'}
            </div>
            <div className="hub-mode-pill">DeepSeek 默认模型：{config.model || 'deepseek-reasoner'}</div>
          </div>

          <p className="dashboard-hero-copy">
            统一管理 DeepSeek 接入配置、统计每次 AI 调用的 token / 缓存命中 / 成本，并提供本地 tokenizer 估算器。
          </p>
        </section>

        <section className="profile-card compact-card">
          <div className="section-header-row">
            <h2>
              <KeyRound size={18} />
              接口配置
            </h2>
            <span className="section-header-tip">当前 Key：{maskedApiKey}</span>
          </div>

          <div className="ai-center-config-grid">
            <label className="form-field grow">
              <span>DeepSeek API Key</span>
              <input
                value={config.apiKey}
                onChange={(event) => setConfig((current) => ({ ...current, apiKey: event.target.value }))}
                placeholder="sk-..."
              />
            </label>
            <label className="form-field grow">
              <span>Base URL</span>
              <input
                value={config.baseUrl}
                onChange={(event) => setConfig((current) => ({ ...current, baseUrl: event.target.value }))}
                placeholder="https://api.deepseek.com"
              />
            </label>
            <label className="form-field">
              <span>默认模型</span>
              <select
                value={config.model}
                onChange={(event) => setConfig((current) => ({ ...current, model: event.target.value }))}
              >
                {availableModels.map((modelKey) => (
                  <option key={modelKey} value={modelKey}>
                    {modelKey}
                  </option>
                ))}
              </select>
            </label>
            <label className="form-field">
              <span>美元兑人民币汇率</span>
              <input
                value={config.usdCnyRate}
                onChange={(event) => setConfig((current) => ({ ...current, usdCnyRate: event.target.value }))}
                placeholder="7.2"
              />
            </label>
          </div>

          <div className="question-generator-footer">
            <button type="button" className="secondary-btn" onClick={handleClearRecords}>
              <Trash2 size={14} />
              清空当前档案记录
            </button>
            <button type="button" className="primary-btn" onClick={handleSaveConfig} disabled={savingConfig}>
              {savingConfig ? '保存中...' : '保存 AI 配置'}
            </button>
          </div>

          {error ? <div className="generated-question-list-error">{error}</div> : null}
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Usage Overview</span>
              <h2>调用概览</h2>
            </div>
          </div>

          <div className="dashboard-stat-strip">
            {summaryCards.map((item) => (
              <article key={item.label} className="dashboard-stat-pill">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </article>
            ))}
          </div>

          <div className="ai-center-usage-detail">
            <div className="generated-question-item-meta">
              <span>Prompt Tokens：{summary.promptTokens}</span>
              <span>Completion Tokens：{summary.completionTokens}</span>
              <span>Reasoning Tokens：{summary.reasoningTokens}</span>
              <span>缓存命中：{summary.promptCacheHitTokens}</span>
              <span>缓存未命中：{summary.promptCacheMissTokens}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Pricing</span>
              <h2>DeepSeek 价格模型</h2>
            </div>
            <span className="section-header-tip">按 {pricingEffectiveDate} 官方定价估算</span>
          </div>

          <div className="dashboard-stat-strip">
            {pricingCards.map((item) => (
              <article key={item.label} className="dashboard-stat-pill">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <small>{item.help}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Tokenizer</span>
              <h2>DeepSeek Token 估算器</h2>
            </div>
            <span className="section-header-tip">基于嵌入站点的 deepseek_v3_tokenizer</span>
          </div>

          <div className="ai-center-tokenizer-grid">
            <label className="form-field grow">
              <span>输入待估算文本</span>
              <textarea
                className="subjective-textarea"
                value={tokenizerText}
                onChange={(event) => setTokenizerText(event.target.value)}
                placeholder="粘贴提示词、题面或整段文档，用于本地估算 token。"
              />
            </label>
            <div className="question-generator-section">
              <div className="generated-question-item-meta">
                <span>字符数：{tokenizerText.length}</span>
                <span>Token：{tokenizerState.tokenCount}</span>
              </div>
              {tokenizerState.error ? <div className="generated-question-list-error">{tokenizerState.error}</div> : null}
              <div className="question-generator-footer">
                <button type="button" className="primary-btn" onClick={handleCountTokens} disabled={tokenizerState.loading}>
                  <Cpu size={14} />
                  {tokenizerState.loading ? '计算中...' : '计算 Token'}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section-block">
          <div className="dashboard-section-head">
            <div>
              <span className="dashboard-eyebrow">Audit Trail</span>
              <h2>AI 调用记录</h2>
            </div>
            <span className="section-header-tip">每次 AI 功能调用都会在这里累计</span>
          </div>

          {loading ? (
            <div className="local-library-empty">正在加载 AI 调用记录...</div>
          ) : usageRows.length === 0 ? (
            <div className="local-library-empty">当前档案还没有 AI 调用记录。</div>
          ) : (
            <div className="ai-center-record-list">
              {usageRows.map((row) => (
                <article key={row.id} className="generated-question-item">
                  <div className="generated-question-item-head">
                    <div className="generated-question-item-title">
                      <strong>{row.featureLabel}</strong>
                      <span>{row.title || row.subject || '未命名调用'}</span>
                    </div>
                    <span className={`tag ${row.status === 'completed' ? 'green' : 'red'}`}>
                      {row.status === 'completed' ? '已完成' : '失败'}
                    </span>
                  </div>

                  <div className="generated-question-item-meta">
                    <span>时间：{row.startedAtLabel}</span>
                    <span>模型：{row.model || '--'}</span>
                    <span>模式：{row.mode === 'stream' ? '流式' : 'JSON'}</span>
                    <span>Prompt：{row.usage?.promptTokens || 0}</span>
                    <span>Completion：{row.usage?.completionTokens || 0}</span>
                    <span>缓存命中：{row.usage?.promptCacheHitTokens || 0}</span>
                    <span>成本：{row.totalCnyLabel}</span>
                  </div>

                  {row.errorMessage ? <div className="generated-question-item-error">{row.errorMessage}</div> : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
