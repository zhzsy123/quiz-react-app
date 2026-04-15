function stringifyValue(value, fallback = '未作答') {
  if (Array.isArray(value)) {
    return value.length ? value.join('、') : fallback
  }

  if (value && typeof value === 'object') {
    if (typeof value.text === 'string') return value.text || fallback
    if (value.responses && typeof value.responses === 'object') {
      const lines = Object.entries(value.responses)
        .sort(([left], [right]) => String(left).localeCompare(String(right), 'zh-Hans-CN'))
        .map(([subId, response]) => `(${subId}) ${response || fallback}`)
      return lines.length ? lines.join('\n') : fallback
    }
    return fallback
  }

  return String(value || fallback)
}

function renderOptions(options = []) {
  if (!Array.isArray(options) || options.length === 0) return ''
  return options
    .map((option) => {
      const key = option?.key || ''
      const text = option?.text || option?.label || ''
      return `- ${key ? `${key}. ` : ''}${text}`
    })
    .join('\n')
}

function renderReading(item, answers) {
  const answerMap = answers?.[item.id] || {}
  const lines = [
    `### ${item.title || item.prompt || '阅读理解'}`,
    '',
    item.passage?.title ? `**材料标题**：${item.passage.title}` : '',
    item.passage?.content || '',
    '',
  ].filter(Boolean)

  ;(item.questions || []).forEach((question, index) => {
    lines.push(`#### 小题 ${index + 1}`)
    lines.push(question.prompt || '未命名小题')
    const optionsText = renderOptions(question.options)
    if (optionsText) lines.push(optionsText)
    lines.push(`你的答案：${stringifyValue(answerMap[question.id])}`)
    lines.push(`正确答案：${question.answer?.correct || '暂无'}`)
    lines.push(`解析：${question.answer?.rationale || '暂无解析'}`)
    lines.push('')
  })

  return lines.join('\n')
}

function renderCloze(item, answers) {
  const answerMap = answers?.[item.id] || {}
  const lines = [`### ${item.title || item.prompt || '完形填空'}`, '', item.article || item.prompt || '', '']

  ;(item.blanks || []).forEach((blank, index) => {
    lines.push(`#### 第 ${index + 1} 空`)
    if (blank.prompt) lines.push(blank.prompt)
    const optionsText = renderOptions(blank.options)
    if (optionsText) lines.push(optionsText)
    lines.push(`你的答案：${stringifyValue(answerMap[blank.blank_id])}`)
    lines.push(`正确答案：${blank.correct || '暂无'}`)
    lines.push(`解析：${blank.rationale || '暂无解析'}`)
    lines.push('')
  })

  return lines.join('\n')
}

function renderFillBlankQuestion(question, response, headingLevel = '###') {
  const blanks = Array.isArray(question?.blanks) ? question.blanks : []
  const answerMap = response && typeof response === 'object' ? response : {}
  const title = question.title || question.prompt || '填空题'
  const lines = [headingLevel ? `${headingLevel} ${title}` : title, '']

  if (question.prompt) {
    lines.push(question.prompt, '')
  }

  blanks.forEach((blank, index) => {
    const acceptedAnswers = Array.isArray(blank.accepted_answers)
      ? blank.accepted_answers.filter(Boolean)
      : []
    const correctText = acceptedAnswers.length
      ? acceptedAnswers.join(' / ')
      : blank.correct || question.answer?.correct || '暂无'

    lines.push(`#### 第 ${index + 1} 空`)
    if (blank.prompt) lines.push(blank.prompt)
    lines.push(`你的答案：${stringifyValue(answerMap[blank.blank_id])}`)
    lines.push(`参考答案：${correctText}`)
    lines.push(`解析：${blank.rationale || question.answer?.rationale || '暂无解析'}`)
    lines.push('')
  })

  if (!blanks.length) {
    lines.push(`你的答案：${stringifyValue(response)}`)
    if (question.answer?.correct || question.answer?.reference_answer) {
      lines.push(`参考答案：${question.answer?.correct || question.answer?.reference_answer}`)
    }
    lines.push(`解析：${question.answer?.rationale || '暂无解析'}`, '')
  }

  return lines.join('\n')
}

function renderDefaultItem(item, response, aiReviewMap) {
  const review = aiReviewMap[item.id] || null
  const lines = [`### ${item.prompt || item.title || item.id}`, '']

  const optionsText = renderOptions(item.options)
  if (optionsText) lines.push(optionsText, '')

  lines.push(`你的答案：${stringifyValue(response)}`)
  if (item.answer?.correct || item.answer?.reference_answer) {
    lines.push(`参考答案：${item.answer?.correct || item.answer?.reference_answer}`)
  }
  if (item.answer?.rationale) {
    lines.push(`解析：${item.answer.rationale}`)
  }
  if (review) {
    lines.push(`AI 判分：${Number(review.score || 0)}/${Number(review.maxScore || item.score || 0)}`)
    if (review.feedback) lines.push(`AI 反馈：${review.feedback}`)
  }
  lines.push('')

  return lines.join('\n')
}

function renderComposite(item, answers, aiReviewMap) {
  const answerMap = answers?.[item.id] || {}
  const lines = [
    `### ${item.title || item.prompt || '综合题'}`,
    '',
    item.material_title ? `**材料标题**：${item.material_title}` : '',
    item.material || item.context || item.prompt || '',
    '',
  ].filter(Boolean)

  ;(item.questions || []).forEach((question, index) => {
    const response = answerMap[question.id]
    const review = aiReviewMap[`${item.id}:${question.id}`] || aiReviewMap[question.id] || null

    if (question.type === 'fill_blank' || question.type === 'function_fill_blank') {
      lines.push(renderFillBlankQuestion(question, response, '####'))
      if (review) {
        lines.push(`AI 判分：${Number(review.score || 0)}/${Number(review.maxScore || question.score || 0)}`)
        if (review.feedback) lines.push(`AI 反馈：${review.feedback}`)
        lines.push('')
      }
      return
    }

    lines.push(`#### 小题 ${index + 1}`)
    lines.push(question.prompt || '未命名小题')

    const optionsText = renderOptions(question.options)
    if (optionsText) lines.push(optionsText)

    lines.push(`你的答案：${stringifyValue(response)}`)

    if (question.answer?.correct || question.answer?.reference_answer) {
      lines.push(`参考答案：${question.answer?.correct || question.answer?.reference_answer}`)
    }

    if (question.answer?.rationale) {
      lines.push(`解析：${question.answer.rationale}`)
    }

    if (review) {
      lines.push(`AI 判分：${Number(review.score || 0)}/${Number(review.maxScore || question.score || 0)}`)
      if (review.feedback) lines.push(`AI 反馈：${review.feedback}`)
    }

    lines.push('')
  })

  return lines.join('\n')
}

function renderRelationalAlgebra(item, answers, aiReviewMap) {
  const answerMap = answers?.[item.id]?.responses || {}
  const lines = [`### ${item.title || item.prompt || '关系代数题'}`, '', item.prompt || '', '']

  if (Array.isArray(item.schemas) && item.schemas.length > 0) {
    lines.push('**关系模式**')
    item.schemas.forEach((schema) => {
      lines.push(`- ${schema.name}（${(schema.attributes || []).join('、')}）`)
    })
    lines.push('')
  }

  ;(item.subquestions || []).forEach((subquestion, index) => {
    const review = aiReviewMap[`${item.id}:${subquestion.id}`] || aiReviewMap[subquestion.id] || null
    lines.push(`#### 小题 ${index + 1}`)
    lines.push(subquestion.prompt || '未命名小题')
    lines.push(`你的作答：${stringifyValue(answerMap[subquestion.id])}`)
    lines.push(`参考答案：${subquestion.reference_answer || '暂无参考答案'}`)
    if (review) {
      lines.push(`AI 判分：${Number(review.score || 0)}/${Number(review.maxScore || subquestion.score || 0)}`)
      if (review.feedback) lines.push(`AI 反馈：${review.feedback}`)
    }
    lines.push('')
  })

  return lines.join('\n')
}

export function buildQuizExportMarkdown({
  entry,
  quiz,
  answers = {},
  submitted = false,
  score = 0,
  paperTotalScore = 0,
  aiReview = null,
} = {}) {
  const aiReviewMap = aiReview?.questionReviews || {}
  const totalScore =
    aiReview?.status === 'completed' ? Number(aiReview.totalScore || score) : Number(score || 0)

  const lines = [
    `# ${entry?.title || quiz?.title || '未命名试卷'}`,
    '',
    `- 科目：${quiz?.subject || entry?.subject || '未知'}`,
    `- 状态：${submitted ? '已提交' : '未提交'}`,
    `- 得分：${totalScore}/${Number(paperTotalScore || 0)}`,
  ]

  if (aiReview?.status === 'completed') {
    lines.push(`- 主观题 AI 得分：${Number(aiReview.totalSubjectiveScore || 0)}`)
  }

  lines.push('', '---', '')

  ;(quiz?.items || []).forEach((item, index) => {
    lines.push(`## 第 ${index + 1} 题`)
    lines.push(`- 题型：${item.type || 'unknown'}`)
    lines.push(`- 分值：${Number(item.score || 0)}`)
    lines.push('')

    if (item.type === 'reading') {
      lines.push(renderReading(item, answers))
    } else if (item.type === 'cloze') {
      lines.push(renderCloze(item, answers))
    } else if (item.type === 'fill_blank' || item.type === 'function_fill_blank') {
      lines.push(renderFillBlankQuestion(item, answers?.[item.id]))
    } else if (item.type === 'composite') {
      lines.push(renderComposite(item, answers, aiReviewMap))
    } else if (item.type === 'relational_algebra') {
      lines.push(renderRelationalAlgebra(item, answers, aiReviewMap))
    } else {
      lines.push(renderDefaultItem(item, answers?.[item.id], aiReviewMap))
    }
  })

  return lines.join('\n').trim()
}
