function formatOptionText(option) {
  if (typeof option === 'string') return option
  if (!option || typeof option !== 'object') return String(option ?? '')
  if ('key' in option && 'text' in option) return `${option.key}. ${option.text}`
  return String(option.text ?? option.label ?? '')
}

function normalizeLegacySchema(data) {
  if (!data || !Array.isArray(data.items)) {
    throw new Error('旧版题库需要包含 items 数组。')
  }

  data.items.forEach((item, index) => {
    const required = ['id', 'question', 'options', 'correct_answer', 'rationale']
    required.forEach((key) => {
      if (!(key in item)) {
        throw new Error(`第 ${index + 1} 题缺少字段：${key}`)
      }
    })
    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`第 ${index + 1} 题的 options 必须是至少含 2 项的数组`)
    }
  })

  return {
    title: data.title || '未命名试卷',
    items: data.items,
    compatibility: {
      sourceSchema: 'legacy_items',
      supportedCount: data.items.length,
      skippedCount: 0,
      skippedTypes: [],
    },
  }
}

function convertSingleChoice(question) {
  if (!Array.isArray(question.options) || !question.answer?.correct) return null
  return {
    id: question.id,
    question: question.prompt,
    options: question.options.map(formatOptionText),
    correct_answer: question.answer.correct,
    rationale: question.answer.rationale || '暂无解析',
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: question.score,
    source_type: question.type,
  }
}

function convertReading(question) {
  if (!question.passage?.content || !Array.isArray(question.questions)) return []
  return question.questions
    .map((subQuestion) => {
      if (subQuestion.type !== 'single_choice') return null
      if (!Array.isArray(subQuestion.options) || !subQuestion.answer?.correct) return null
      const title = question.passage?.title ? `【${question.passage.title}】\n` : ''
      return {
        id: subQuestion.id,
        question: `${title}${question.passage.content}\n\n${subQuestion.prompt}`,
        options: subQuestion.options.map(formatOptionText),
        correct_answer: subQuestion.answer.correct,
        rationale: subQuestion.answer.rationale || '暂无解析',
        difficulty: question.difficulty || subQuestion.difficulty,
        tags: [...(question.tags || []), ...(subQuestion.tags || [])],
        score: subQuestion.score,
        source_type: 'reading',
      }
    })
    .filter(Boolean)
}

function convertCloze(question) {
  if (!question.article || !Array.isArray(question.blanks)) return []
  return question.blanks
    .map((blank) => {
      if (!Array.isArray(blank.options) || !blank.correct) return null
      const articleWithMarker = question.article.replace(
        `[[${blank.blank_id}]]`,
        `____(${blank.blank_id})____`
      )
      return {
        id: `${question.id}_blank_${blank.blank_id}`,
        question: `${question.prompt}\n\n${articleWithMarker}`,
        options: blank.options.map(formatOptionText),
        correct_answer: blank.correct,
        rationale: blank.rationale || '暂无解析',
        difficulty: question.difficulty,
        tags: question.tags || [],
        score: blank.score,
        source_type: 'cloze',
      }
    })
    .filter(Boolean)
}

export function normalizeQuizPayload(data) {
  if (Array.isArray(data?.items)) {
    return normalizeLegacySchema(data)
  }

  if (!Array.isArray(data?.questions)) {
    throw new Error('新版题库需要包含 questions 数组；旧版题库需要包含 items 数组。')
  }

  const items = []
  let skippedCount = 0
  const skippedTypes = []

  data.questions.forEach((question) => {
    if (!question?.type) {
      skippedCount += 1
      skippedTypes.push('unknown')
      return
    }

    if (question.type === 'single_choice') {
      const converted = convertSingleChoice(question)
      if (converted) items.push(converted)
      else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    if (question.type === 'reading') {
      const converted = convertReading(question)
      items.push(...converted)
      const unsupportedChildren = Array.isArray(question.questions)
        ? question.questions.filter((q) => q.type !== 'single_choice').length
        : 0
      skippedCount += unsupportedChildren
      for (let i = 0; i < unsupportedChildren; i += 1) skippedTypes.push('reading_child')
      return
    }

    if (question.type === 'cloze') {
      const converted = convertCloze(question)
      items.push(...converted)
      return
    }

    skippedCount += 1
    skippedTypes.push(question.type)
  })

  if (!items.length) {
    throw new Error('当前版本暂时只能导入新版 schema 中的 single_choice、reading（单选子题）和 cloze 题目。')
  }

  return {
    title: data.title || '未命名试卷',
    items,
    compatibility: {
      sourceSchema: data.schema_version || 'schema_v1_unknown',
      supportedCount: items.length,
      skippedCount,
      skippedTypes: [...new Set(skippedTypes)],
    },
  }
}
