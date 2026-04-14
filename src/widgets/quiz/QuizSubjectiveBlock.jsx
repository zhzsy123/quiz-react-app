import React, { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  FileText,
  Languages,
  Maximize2,
  Minimize2,
  XCircle,
} from 'lucide-react'

import {
  evaluateFillBlankResponse,
  formatObjectiveCorrectAnswerLabel,
  isFillBlankOrderSensitive,
  isObjectiveAnswered,
  isObjectiveGradable,
  normalizeChoiceArray,
  renderOptionLabel,
} from '../../entities/quiz/lib/objectiveAnswers'
import {
  countWords,
  formatDisplayScore,
  getQuestionDisplayMeta,
  getReadingQuestionDisplayLabel,
  getSubjectiveText,
  renderFormattedMaterial,
} from './quizViewUtils.jsx'
import QuizClozeBlock from './QuizClozeBlock.jsx'
import ErDiagramBlock from './ErDiagramBlock.jsx'
import RelationalAlgebraBlock from './RelationalAlgebraBlock.jsx'
import SqlQuestionBlock from './SqlQuestionBlock.jsx'
import SqlSchemaPanel from './SqlSchemaPanel.jsx'

function normalizeVisibleText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isDistinctDisplayText(candidate, prompt, referenceTitle = '') {
  const normalizedCandidate = normalizeVisibleText(candidate)
  if (!normalizedCandidate) return false

  const normalizedPrompt = normalizeVisibleText(prompt)
  const normalizedReferenceTitle = normalizeVisibleText(referenceTitle)

  return normalizedCandidate !== normalizedPrompt && normalizedCandidate !== normalizedReferenceTitle
}

function TranslationBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  return (
    <div className="subjective-block translation-card">
      <div className="translation-source-meta">
        <Languages size={16} />
        <span>{item.direction === 'zh_to_en' ? '中译英' : '英译中'}</span>
      </div>
      <div className="translation-source">{item.source_text}</div>
      <textarea
        className="subjective-textarea"
        value={getSubjectiveText(userResponse)}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer ? (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      ) : null}
    </div>
  )
}

function EssayBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const wordCount = countWords(text)
  const scoringPoints = Array.isArray(item.answer?.scoring_points) ? item.answer.scoring_points : []

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{item.essay_type || 'writing'}</div>
        <div className="essay-word-count">{wordCount}</div>
      </div>
      {item.requirements?.topic ? <div className="essay-topic">{item.requirements.topic}</div> : null}
      {submitted && scoringPoints.length > 0 ? (
        <div className="analysis-box">
          <div className="analysis-section-title">评分要点</div>
          <ul className="analysis-list">
            {scoringPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={12}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer ? (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      ) : null}
    </div>
  )
}

function GenericSubjectiveBlock({ item, userResponse, disabled, submitted, onTextChange }) {
  const text = getSubjectiveText(userResponse)
  const scoreLabel = item.score ? `${formatDisplayScore(item.score)} 分` : ''
  const typeMeta = getQuestionDisplayMeta(item)
  const scoringPoints = Array.isArray(item.answer?.scoring_points) ? item.answer.scoring_points : []
  const showContextTitle = isDistinctDisplayText(item.context_title, item.prompt)
  const showContext = isDistinctDisplayText(item.context, item.prompt, item.context_title)

  return (
    <div className="subjective-block essay-card">
      <div className="essay-head">
        <div className="essay-type-chip">{typeMeta.label}</div>
        <div className="essay-word-count">{scoreLabel}</div>
      </div>
      {showContextTitle ? <div className="essay-topic">{item.context_title}</div> : null}
      {showContext ? <div className="analysis-box">{renderFormattedMaterial(item.context, item.context_format)}</div> : null}
      {Array.isArray(item.requirements?.points) && item.requirements.points.length > 0 ? (
        <div className="analysis-box">
          <div className="analysis-section-title">作答要求</div>
          <ul className="analysis-list">
            {item.requirements.points.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {submitted && scoringPoints.length > 0 ? (
        <div className="analysis-box">
          <div className="analysis-section-title">评分要点</div>
          <ul className="analysis-list">
            {scoringPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <textarea
        className="subjective-textarea essay-textarea"
        value={text}
        onChange={(event) => onTextChange(item.id, event.target.value)}
        disabled={disabled}
        rows={10}
        spellCheck={false}
        autoCorrect="off"
        autoCapitalize="off"
      />
      {submitted && item.answer?.reference_answer ? (
        <div className="analysis-box">
          <div>{item.answer.reference_answer}</div>
        </div>
      ) : null}
    </div>
  )
}

function ReadingBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
}) {
  const [immersiveReading, setImmersiveReading] = useState(false)
  const readingResponse = response || {}
  const readingQuestions = Array.isArray(item.questions) ? item.questions : []
  const questionRefs = useRef({})
  const passageTitle = item.passage?.title || item.title || '阅读材料'
  const passageContent = item.passage?.content || item.passage?.body || item.passage?.text || ''

  useEffect(() => {
    if (!focusSubQuestionId) return
    const target = questionRefs.current[focusSubQuestionId]
    if (target && typeof target.scrollIntoView === 'function') {
      target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [focusSubQuestionId])

  return (
    <div className={`reading-layout ${immersiveReading ? 'immersive' : ''}`}>
      <section className={`reading-passage-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-passage-head">
          <div className="reading-passage-title">
            <FileText size={16} />
            <span>{passageTitle}</span>
          </div>
          <button
            type="button"
            className="reading-mode-btn"
            onClick={() => setImmersiveReading((value) => !value)}
            disabled={isPaused}
          >
            {immersiveReading ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
        <div className={`reading-passage-body ${immersiveReading ? 'immersive' : ''}`}>
          {passageContent || '当前阅读题缺少材料正文。'}
        </div>
      </section>

      <section className={`reading-questions-card ${immersiveReading ? 'immersive' : ''}`}>
        <div className="reading-question-list">
          {readingQuestions.map((subQuestion, subIndex) => {
            const userAnswer = readingResponse[subQuestion.id]
            const revealKey = `${item.id}:${subQuestion.id}`
            const showFeedback = submitted || (mode === 'practice' && revealedMap[revealKey])
            const isFocused = focusSubQuestionId === subQuestion.id
            const subOptions = Array.isArray(subQuestion.options) ? subQuestion.options : []
            const isGradable = isObjectiveGradable(subQuestion)

            return (
              <div
                key={subQuestion.id}
                ref={(node) => {
                  questionRefs.current[subQuestion.id] = node
                }}
                className={`reading-question-item ${isFocused ? 'focused' : ''}`}
              >
                <div className="reading-question-title">
                  <div className="reading-question-meta">
                    <span className="tag">{getReadingQuestionDisplayLabel(item, subIndex)}</span>
                    <span className="tag score">{formatDisplayScore(subQuestion?.score)} 分</span>
                  </div>
                  <span>{subQuestion.prompt}</span>
                </div>

                <div className="options compact-options">
                  {subOptions.map((option, optionIndex) => {
                    const selected = userAnswer === option.key
                    let className = 'option compact-option'
                    let icon = null

                    if (!showFeedback || !isGradable) {
                      if (selected) className += ' selected'
                    } else if (option.key === subQuestion.answer?.correct) {
                      className += ' correct'
                      icon = <CheckCircle2 size={18} />
                    } else if (selected) {
                      className += ' wrong'
                      icon = <XCircle size={18} />
                    } else {
                      className += ' muted'
                    }

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        className={className}
                        disabled={submitted || isPaused || (mode === 'practice' && showFeedback)}
                        onClick={() => {
                          onFocusSubQuestion(subQuestion.id)
                          onSelectReadingOption(item.id, subQuestion.id, option.key)
                        }}
                      >
                        <span>{renderOptionLabel(option)}</span>
                        {icon}
                      </button>
                    )
                  })}
                </div>

                {!subOptions.length ? (
                  <div className="analysis-box compact-analysis-box">
                    <div>当前小题缺少可作答的选项，无法继续作答。</div>
                  </div>
                ) : null}

                {showFeedback ? (
                  <div className="analysis-box compact-analysis-box">
                    {isGradable ? (
                      <>
                        <div>
                          正确答案：<strong>{subQuestion.answer?.correct}</strong>
                        </div>
                        <div>解析：{subQuestion.answer?.rationale || '暂无解析'}</div>
                      </>
                    ) : (
                      <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
                    )}
                  </div>
                ) : null}
              </div>
            )
          })}

          {!readingQuestions.length ? (
            <div className="analysis-box compact-analysis-box">
              <div>当前阅读题缺少可作答的小题，无法继续作答。</div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function CompositeFillBlankBlock({
  question,
  questionResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  onFillBlankChange,
}) {
  const evaluation = evaluateFillBlankResponse(question, questionResponse || {})
  const orderSensitive = isFillBlankOrderSensitive(question)

  return (
    <div className="fill-blank-block">
      <div className="fill-blank-grid">
        {(question.blanks || []).map((blank, blankIndex) => {
          const value = (questionResponse || {})[blank.blank_id] || ''
          const blankResult = evaluation.blankResults[blankIndex]
          const acceptedAnswers = blankResult?.matchedAcceptedAnswers || blankResult?.acceptedAnswers || []
          const isCorrect = Boolean(blankResult?.isCorrect)

          return (
            <article
              key={blank.blank_id}
              className={`fill-blank-card ${objectiveReveal ? (isCorrect ? 'correct' : 'wrong') : ''}`}
            >
              <div className="fill-blank-card-head">
                <div className="fill-blank-card-label">第 {blankIndex + 1} 空</div>
                <div className={`fill-blank-card-state ${value ? 'filled' : ''}`}>{value ? '已填写' : '待填写'}</div>
              </div>
              <textarea
                className="fill-blank-input"
                value={value}
                onChange={(event) => onFillBlankChange(question.id, blank.blank_id, event.target.value)}
                disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
                rows={2}
                spellCheck={false}
                placeholder="请输入本空答案"
              />
              {objectiveReveal ? (
                <div className="fill-blank-feedback">
                  {!orderSensitive ? (
                    <div className="answer-review-line">
                      <strong>判定规则</strong>
                      本题答案不区分填写顺序，命中任一有效答案即可。
                    </div>
                  ) : null}
                  <div className="answer-review-line">
                    <strong>参考答案</strong>
                    {acceptedAnswers.join(' / ') || '暂无'}
                  </div>
                  <div className="answer-review-line">
                    <strong>解析</strong>
                    {blank.rationale || '暂无解析'}
                  </div>
                </div>
              ) : null}
            </article>
          )
        })}
      </div>
    </div>
  )
}

function CompositeObjectiveBlock({
  question,
  questionResponse,
  objectiveReveal,
  submitted,
  disabled,
  mode,
  canRevealMultiChoice,
  canRevealFillBlank,
  isGradable,
  onSelectOption,
  onRevealQuestion,
  onFillBlankChange,
}) {
  if (question.type === 'fill_blank') {
    return (
      <>
        <CompositeFillBlankBlock
          question={question}
          questionResponse={questionResponse}
          objectiveReveal={objectiveReveal}
          submitted={submitted}
          disabled={disabled}
          mode={mode}
          onFillBlankChange={onFillBlankChange}
        />
        {canRevealMultiChoice || canRevealFillBlank ? (
          <div className="question-inline-actions">
            <button type="button" className="secondary-btn small-btn" onClick={() => onRevealQuestion(question.id)}>
              检查答案
            </button>
          </div>
        ) : null}
      </>
    )
  }

  return (
    <>
      <div className="options">
        {(question.options || []).map((opt, optIndex) => {
          const option = typeof opt === 'string' ? { key: opt.charAt(0), text: opt } : opt
          const selected =
            question.type === 'multiple_choice'
              ? normalizeChoiceArray(questionResponse).includes(option.key)
              : questionResponse === option.key
          const isCorrect =
            question.type === 'multiple_choice'
              ? normalizeChoiceArray(question.answer?.correct).includes(option.key)
              : option.key === question.answer?.correct

          let className = 'option'
          let icon = null

          if (!objectiveReveal || !isGradable) {
            if (selected) className += ' selected'
          } else if (isCorrect) {
            className += ' correct'
            icon = <CheckCircle2 size={18} />
          } else if (selected) {
            className += ' wrong'
            icon = <XCircle size={18} />
          } else {
            className += ' muted'
          }

          return (
            <button
              key={optIndex}
              type="button"
              className={className}
              disabled={submitted || disabled || (mode === 'practice' && objectiveReveal)}
              onClick={() => onSelectOption(question.id, option.key)}
            >
              <span>{renderOptionLabel(option)}</span>
              {icon}
            </button>
          )
        })}
      </div>
      {canRevealMultiChoice || canRevealFillBlank ? (
        <div className="question-inline-actions">
          <button type="button" className="secondary-btn small-btn" onClick={() => onRevealQuestion(question.id)}>
            检查答案
          </button>
        </div>
      ) : null}
      {objectiveReveal ? (
        <div className="analysis-box">
          {isGradable ? (
            <>
              <div>
                正确答案：<strong>{formatObjectiveCorrectAnswerLabel(question)}</strong>
              </div>
              <div>解析：{question.answer?.rationale || '暂无解析'}</div>
            </>
          ) : (
            <div>当前小题缺少标准答案，已保留题目内容，但暂时无法自动判分。</div>
          )}
        </div>
      ) : null}
    </>
  )
}

function DatabaseCompositeBlock({
  item,
  userResponse,
  submitted,
  disabled,
  mode,
  revealedMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectOption,
  onFillBlankChange,
  onTextChange,
  onRevealQuestion,
}) {
  const responseMap = userResponse || {}
  const questions = Array.isArray(item.questions) ? item.questions : []
  const activeQuestion =
    questions.find((question) => String(question.id) === String(focusSubQuestionId || '')) || questions[0] || null
  const sqlInsertTokenRef = useRef(null)
  const questionIndex = questions.findIndex((entry) => String(entry.id) === String(activeQuestion?.id || ''))
  const questionMeta = activeQuestion ? getQuestionDisplayMeta(activeQuestion) : null
  const questionResponse = activeQuestion ? responseMap[activeQuestion.id] : null
  const revealKey = activeQuestion ? `${item.id}:${activeQuestion.id}` : ''
  const objectiveReveal = activeQuestion ? submitted || (mode === 'practice' && revealedMap[revealKey]) : false
  const canRevealMultiChoice =
    mode === 'practice' &&
    activeQuestion?.type === 'multiple_choice' &&
    !submitted &&
    !objectiveReveal &&
    normalizeChoiceArray(questionResponse).length > 0
  const canRevealFillBlank =
    mode === 'practice' &&
    activeQuestion?.type === 'fill_blank' &&
    !submitted &&
    !objectiveReveal &&
    isObjectiveAnswered(activeQuestion, questionResponse)
  const isGradable = activeQuestion ? isObjectiveGradable(activeQuestion) : false
  const materialTitle =
    item.material_title ||
    item.context_title ||
    (activeQuestion?.type === 'sql' ? '表结构与题目背景' : '材料区')
  const mergedQuestionContext = questions
    .map((question) =>
      [question.context, question.schema_context, question.schemaContext]
        .map((value) => String(value || '').trim())
        .find(Boolean) || ''
    )
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .join('\n')
  const sharedMaterial =
    String(item.material || item.context || item.schema_context || item.schemaContext || '').trim() ||
    mergedQuestionContext
  const sharedMaterialFormat =
    item.material_format || item.context_format || activeQuestion?.context_format || 'text'
  const sqlQuestionItem =
    activeQuestion?.type === 'sql'
      ? {
          ...activeQuestion,
          context_title: activeQuestion.context_title || materialTitle,
          context:
            activeQuestion.context ||
            activeQuestion.schema_context ||
            activeQuestion.schemaContext ||
            sharedMaterial,
          context_format: activeQuestion.context_format || sharedMaterialFormat,
        }
      : null

  if (!activeQuestion) {
    return (
      <div className="analysis-box">
        <div>当前综合题缺少可作答的子题。</div>
      </div>
    )
  }

  return (
    <div
      className={`subjective-block composite-workbench ${activeQuestion.type === 'sql' ? 'composite-workbench-sql refined' : 'database-composite-focus'}`}
    >
      <aside className={`composite-material-panel ${activeQuestion.type === 'sql' ? 'composite-material-panel-sql' : ''}`}>
        {activeQuestion.type === 'sql' ? (
          <SqlSchemaPanel
            title={materialTitle}
            context={sharedMaterial}
            format={sharedMaterialFormat}
            disabled={disabled || submitted}
            onInsertToken={(token) => sqlInsertTokenRef.current?.(token)}
            compact
          />
        ) : (
          <section className="analysis-box composite-material-panel-inner">
            <div className="composite-panel-head">
              <div>
                <div className="analysis-section-title">材料区</div>
                {item.material_title ? <div className="question-context-title">{item.material_title}</div> : null}
              </div>
            </div>
            {renderFormattedMaterial(item.material, item.material_format, 'question-context-body')}
          </section>
        )}
      </aside>

      <section
        className={`composite-question-panel ${activeQuestion.type === 'sql' ? 'composite-question-panel-sql refined' : ''}`}
      >
        <div className={`composite-subquestion-chips ${activeQuestion.type === 'sql' ? 'compact' : ''}`}>
          {questions.map((question, index) => {
            const currentQuestionMeta = getQuestionDisplayMeta(question)
            const isFocused = String(focusSubQuestionId || '') === String(question.id)
            return (
              <button
                key={`chip-${question.id}`}
                type="button"
                className={`composite-subquestion-chip ${isFocused ? 'focused' : ''}`}
                onClick={() => onFocusSubQuestion?.(question.id)}
              >
                <span className="composite-subquestion-chip-index">#{index + 1}</span>
                {question.type === 'sql' ? null : <span>{currentQuestionMeta.shortLabel}</span>}
                <span>{formatDisplayScore(question?.score)} 分</span>
              </button>
            )
          })}
        </div>

        <article
          className={
            activeQuestion.type === 'sql'
              ? 'composite-sql-stage refined'
              : 'answer-review-card composite-question-card focused'
          }
        >
          <div
            className={
              activeQuestion.type === 'sql'
                ? 'composite-sql-focus-meta refined'
                : 'answer-review-prompt composite-question-head'
            }
          >
            <div className="composite-question-meta compact">
              <span className="composite-question-index">第 {questionIndex + 1} 小题</span>
              {activeQuestion.type === 'sql' ? null : <span className="tag purple">{questionMeta.label}</span>}
              <span className="tag score">{formatDisplayScore(activeQuestion?.score)} 分</span>
            </div>
            <div className={`wrongbook-card-title ${activeQuestion.type === 'sql' ? 'composite-sql-title' : ''}`}>
              {activeQuestion.prompt}
            </div>
          </div>

          {activeQuestion.answer?.type !== 'subjective' ? (
            <CompositeObjectiveBlock
              question={activeQuestion}
              questionResponse={questionResponse}
              objectiveReveal={objectiveReveal}
              submitted={submitted}
              disabled={disabled}
              mode={mode}
              canRevealMultiChoice={canRevealMultiChoice}
              canRevealFillBlank={canRevealFillBlank}
              isGradable={isGradable}
              onSelectOption={(targetId, optionKey) => {
                onFocusSubQuestion?.(targetId)
                onSelectOption(targetId, optionKey)
              }}
              onRevealQuestion={onRevealQuestion}
              onFillBlankChange={(targetId, blankId, text) => {
                onFocusSubQuestion?.(targetId)
                onFillBlankChange(targetId, blankId, text)
              }}
            />
          ) : activeQuestion.type === 'translation' ? (
            <TranslationBlock
              item={activeQuestion}
              userResponse={questionResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={(targetId, text) => {
                onFocusSubQuestion?.(targetId)
                onTextChange(targetId, text)
              }}
            />
          ) : activeQuestion.type === 'essay' ? (
            <EssayBlock
              item={activeQuestion}
              userResponse={questionResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={(targetId, text) => {
                onFocusSubQuestion?.(targetId)
                onTextChange(targetId, text)
              }}
            />
          ) : activeQuestion.type === 'sql' ? (
            <SqlQuestionBlock
              item={sqlQuestionItem}
              userResponse={questionResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              hideSchemaPanel
              embedded
              showWorkbenchTitle={false}
              onEditorInsertReady={(handler) => {
                sqlInsertTokenRef.current = handler
              }}
              onTextChange={(targetId, text) => {
                onFocusSubQuestion?.(targetId)
                onTextChange(targetId, text)
              }}
            />
          ) : activeQuestion.type === 'er_diagram' ? (
            <ErDiagramBlock
              item={activeQuestion}
              userResponse={questionResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onChange={(targetId, nextValue) => {
                onFocusSubQuestion?.(targetId)
                onTextChange(targetId, nextValue)
              }}
            />
          ) : (
            <GenericSubjectiveBlock
              item={activeQuestion}
              userResponse={questionResponse}
              disabled={disabled || submitted}
              submitted={submitted}
              onTextChange={(targetId, text) => {
                onFocusSubQuestion?.(targetId)
                onTextChange(targetId, text)
              }}
            />
          )}
        </article>
      </section>
    </div>
  )
}
export default function QuizSubjectiveBlock({
  item,
  response,
  submitted,
  isPaused,
  mode,
  revealedMap,
  relationalAlgebraExpandedMap,
  aiQuestionReviewMap,
  focusSubQuestionId,
  onFocusSubQuestion,
  onSelectReadingOption,
  onSelectClozeOption,
  onRevealCurrentObjective,
  onSelectCompositeOption,
  onCompositeFillBlankChange,
  onCompositeTextChange,
  onRevealCompositeQuestion,
  onRelationalAlgebraTextChange,
  onToggleRelationalAlgebraSubQuestion,
  onRevealRelationalAlgebraQuestion,
  onFillBlankChange,
  onTextChange,
  onErDiagramChange,
}) {
  if (item.type === 'cloze') {
    return (
      <QuizClozeBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusBlankId={focusSubQuestionId}
        onFocusBlank={onFocusSubQuestion}
        onSelectClozeOption={onSelectClozeOption}
        onRevealCurrentObjective={onRevealCurrentObjective}
      />
    )
  }

  if (item.type === 'reading') {
    return (
      <ReadingBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusSubQuestionId={focusSubQuestionId}
        onFocusSubQuestion={onFocusSubQuestion}
        onSelectReadingOption={onSelectReadingOption}
      />
    )
  }

  if (item.type === 'composite') {
    return (
      <DatabaseCompositeBlock
        item={item}
        userResponse={response}
        submitted={submitted}
        disabled={isPaused}
        mode={mode}
        revealedMap={revealedMap}
        focusSubQuestionId={focusSubQuestionId}
        onFocusSubQuestion={onFocusSubQuestion}
        onSelectOption={(subQuestionId, optionKey) => onSelectCompositeOption(item.id, subQuestionId, optionKey)}
        onFillBlankChange={(subQuestionId, blankId, text) =>
          onCompositeFillBlankChange(item.id, subQuestionId, blankId, text)
        }
        onTextChange={(subQuestionId, text) => onCompositeTextChange(item.id, subQuestionId, text)}
        onRevealQuestion={(subQuestionId) => onRevealCompositeQuestion(item.id, subQuestionId)}
      />
    )
  }

  if (item.type === 'translation') {
    return (
      <TranslationBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  if (item.type === 'essay') {
    return (
      <EssayBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  if (item.type === 'relational_algebra') {
    return (
      <RelationalAlgebraBlock
        item={item}
        response={response}
        submitted={submitted}
        isPaused={isPaused}
        expandedMap={relationalAlgebraExpandedMap}
        reviewMap={aiQuestionReviewMap}
        focusSubQuestionId={focusSubQuestionId}
        onTextChange={onRelationalAlgebraTextChange}
        onToggleSubQuestion={onToggleRelationalAlgebraSubQuestion}
        onRevealQuestion={onRevealRelationalAlgebraQuestion}
        onFocusSubQuestion={onFocusSubQuestion}
      />
    )
  }

  if (item.type === 'sql') {
    return (
      <SqlQuestionBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  if (item.type === 'er_diagram') {
    return (
      <ErDiagramBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onChange={onErDiagramChange}
      />
    )
  }

  if (
    ['short_answer', 'case_analysis', 'calculation', 'operation', 'programming'].includes(item.type)
  ) {
    return (
      <GenericSubjectiveBlock
        item={item}
        userResponse={response}
        disabled={isPaused || submitted}
        submitted={submitted}
        onTextChange={onTextChange}
      />
    )
  }

  return (
    <div className="analysis-box">
      <div>当前主观题类型暂不支持渲染。</div>
    </div>
  )
}

