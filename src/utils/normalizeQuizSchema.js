function fallbackOptionKey(index) {
  return String.fromCharCode(65 + index)
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])[\.\s、]+(.*)$/)
    if (match) {
      return {
        key: match[1],
        text: match[2],
      }
    }
    return {
      key: fallbackOptionKey(index),
      text: option,
    }
  }

  if (option && typeof option === 'object') {
    return {
      key: option.key || fallbackOptionKey(index),
      text: option.text ?? option.label ?? '',
    }
  }

  return {
    key: fallbackOptionKey(index),
    text: String(option ?? ''),
  }
}

function normalizeLegacySchema(data) {
  if (!data || !Array.isArray(data.items)) {
    throw new Error('旧版题库需要包含 items 数组。')
  }

  const items = data.items.map((item, index) => {
    const required = ['id', 'question', 'options', 'correct_answer', 'rationale']
    required.forEach((key) => {
      if (!(key in item)) {
        throw new Error(`第 ${index + 1} 题缺少字段：${key}`)
      }
    })

    if (!Array.isArray(item.options) || item.options.length < 2) {
      throw new Error(`第 ${index + 1} 题的 options 必须是至少含 2 项的数组`)
    }

    return {
      id: item.id,
      type: 'single_choice',
      prompt: item.question,
      options: item.options.map(normalizeOption),
      answer: {
        type: 'objective',
        correct: item.correct_answer,
        rationale: item.rationale || '暂无解析',
      },
      difficulty: item.difficulty,
      tags: item.tags || [],
      score: Number(item.score) || 1,
      source_type: 'legacy_single_choice',
    }
  })

  return {
    title: data.title || '未命名试卷',
    paper_id: data.paper_id,
    items,
    compatibility: {
      sourceSchema: 'legacy_items',
      supportedCount: items.length,
      skippedCount: 0,
      skippedTypes: [],
    },
  }
}

function convertSingleChoice(question) {
  if (!Array.isArray(question.options) || !question.answer?.correct) return null

  return {
    id: question.id,
    type: 'single_choice',
    prompt: question.prompt,
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct: question.answer.correct,
      rationale: question.answer.rationale || '暂无解析',
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: Number(question.score) || 1,
    source_type: question.type,
  }
}

function convertReading(question) {
  if (!question.passage?.content || !Array.isArray(question.questions)) {
    return { items: [], skippedCount: 1, skippedTypes: ['reading'] }
  }

  const items = []
  let skippedCount = 0
  const skippedTypes = []

  question.questions.forEach((subQuestion) => {
    if (subQuestion.type !== 'single_choice') {
      skippedCount += 1
      skippedTypes.push(`reading:${subQuestion.type || 'unknown'}`)
      return
    }

    if (!Array.isArray(subQuestion.options) || !subQuestion.answer?.correct) {
      skippedCount += 1
      skippedTypes.push('reading:single_choice_invalid')
      return
    }

    items.push({
      id: subQuestion.id,
      type: 'single_choice',
      prompt: subQuestion.prompt,
      context_title: question.passage?.title || question.title,
      context: question.passage.content,
      options: subQuestion.options.map(normalizeOption),
      answer: {
        type: 'objective',
        correct: subQuestion.answer.correct,
        rationale: subQuestion.answer.rationale || '暂无解析',
      },
      difficulty: subQuestion.difficulty || question.difficulty,
      tags: [...new Set([...(question.tags || []), ...(subQuestion.tags || [])])],
      score: Number(subQuestion.score) || 1,
      source_type: 'reading',
    })
  })

  return { items, skippedCount, skippedTypes }
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
        type: 'single_choice',
        prompt: `${question.prompt}（第 ${blank.blank_id} 空）`,
        context_title: question.title || '完形填空',
        context: articleWithMarker,
        options: blank.options.map(normalizeOption),
        answer: {
          type: 'objective',
          correct: blank.correct,
          rationale: blank.rationale || '暂无解析',
        },
        difficulty: question.difficulty,
        tags: question.tags || [],
        score: Number(blank.score) || 1,
        source_type: 'cloze',
      }
    })
    .filter(Boolean)
}

function convertTranslation(question) {
  if (!question.source_text) return null

  return {
    id: question.id,
    type: 'translation',
    prompt: question.prompt || '请完成翻译',
    direction: question.direction || 'en_to_zh',
    source_text: question.source_text,
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || '',
      alternate_answers: question.answer?.alternate_answers || [],
      scoring_points: question.answer?.scoring_points || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: Number(question.score) || 1,
    source_type: 'translation',
  }
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
      const result = convertReading(question)
      items.push(...result.items)
      skippedCount += result.skippedCount
      skippedTypes.push(...result.skippedTypes)
      return
    }

    if (question.type === 'cloze') {
      const converted = convertCloze(question)
      if (converted.length > 0) {
        items.push(...converted)
      } else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    if (question.type === 'translation') {
      const converted = convertTranslation(question)
      if (converted) items.push(converted)
      else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    skippedCount += 1
    skippedTypes.push(question.type)
  })

  if (!items.length) {
    throw new Error('当前版本暂时只能导入新版 schema 中的 single_choice、reading（单选子题）、cloze 和 translation 题目。')
  }

  return {
    title: data.title || '未命名试卷',
    paper_id: data.paper_id,
    items,
    compatibility: {
      sourceSchema: data.schema_version || 'schema_v1_unknown',
      supportedCount: items.length,
      skippedCount,
      skippedTypes: [...new Set(skippedTypes)],
    },
  }
}
