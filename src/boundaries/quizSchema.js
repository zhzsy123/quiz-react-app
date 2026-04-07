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

function normalizeMultiCorrect(correct) {
  if (Array.isArray(correct)) {
    return [...new Set(correct.map((value) => String(value).trim()).filter(Boolean))].sort()
  }
  if (typeof correct === 'string') {
    return [...new Set(correct.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))].sort()
  }
  return []
}

function normalizeTrueFalseCorrect(correct) {
  if (correct === true || String(correct).toLowerCase() === 'true') return 'T'
  if (correct === false || String(correct).toLowerCase() === 'false') return 'F'
  if (String(correct).toUpperCase() === 'T') return 'T'
  if (String(correct).toUpperCase() === 'F') return 'F'
  return ''
}

export function normalizeQuizText(text) {
  let cleaned = String(text || '').trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  return cleaned.trim()
}

export function parseQuizText(text) {
  const cleanedText = normalizeQuizText(text)
  return {
    cleanedText,
    parsed: normalizeQuizPayload(JSON.parse(cleanedText)),
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

function convertMultipleChoice(question) {
  if (!Array.isArray(question.options)) return null
  const correct = normalizeMultiCorrect(question.answer?.correct)
  if (!correct.length) return null

  return {
    id: question.id,
    type: 'multiple_choice',
    prompt: question.prompt,
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct,
      rationale: question.answer?.rationale || '暂无解析',
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: Number(question.score) || 1,
    source_type: question.type,
  }
}

function convertTrueFalse(question) {
  const correct = normalizeTrueFalseCorrect(question.answer?.correct)
  if (!correct) return null

  return {
    id: question.id,
    type: 'true_false',
    prompt: question.prompt,
    options: [
      { key: 'T', text: '正确' },
      { key: 'F', text: '错误' },
    ],
    answer: {
      type: 'objective',
      correct,
      rationale: question.answer?.rationale || '暂无解析',
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: Number(question.score) || 1,
    source_type: question.type,
  }
}

function convertFillBlank(question) {
  if (!Array.isArray(question.blanks) || !question.blanks.length) return null

  const blanks = question.blanks
    .map((blank, index) => {
      const acceptedAnswers = [...new Set((blank.accepted_answers || [])
        .map((value) => String(value || '').trim())
        .filter(Boolean))]

      if (!acceptedAnswers.length) return null

      return {
        blank_id: blank.blank_id ?? index + 1,
        accepted_answers: acceptedAnswers,
        rationale: blank.rationale || '暂无解析',
        score: Number(blank.score) || 1,
      }
    })
    .filter(Boolean)

  if (!blanks.length) return null

  return {
    id: question.id,
    type: 'fill_blank',
    prompt: question.prompt,
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.accepted_answers),
      rationale: question.answer?.rationale || '',
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: blanks.reduce((sum, blank) => sum + (blank.score || 1), 0),
    source_type: question.type,
  }
}

function convertReading(question) {
  if (!question.passage?.content || !Array.isArray(question.questions)) {
    return null
  }

  const normalizedQuestions = []
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

    normalizedQuestions.push({
      id: subQuestion.id,
      type: 'single_choice',
      prompt: subQuestion.prompt,
      options: subQuestion.options.map(normalizeOption),
      answer: {
        type: 'objective',
        correct: subQuestion.answer.correct,
        rationale: subQuestion.answer.rationale || '暂无解析',
      },
      score: Number(subQuestion.score) || 1,
      difficulty: subQuestion.difficulty || question.difficulty,
      tags: [...new Set([...(question.tags || []), ...(subQuestion.tags || [])])],
    })
  })

  return {
    item: {
      id: question.id,
      type: 'reading',
      prompt: question.prompt,
      title: question.title,
      passage: {
        title: question.passage?.title || question.title,
        content: question.passage.content,
      },
      questions: normalizedQuestions,
      answer: {
        type: 'objective',
      },
      difficulty: question.difficulty,
      tags: question.tags || [],
      score: normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 1), 0),
      source_type: 'reading',
    },
    skippedCount,
    skippedTypes,
  }
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

function convertEssay(question) {
  return {
    id: question.id,
    type: 'essay',
    prompt: question.prompt || '请完成作文',
    essay_type: question.essay_type || 'writing',
    requirements: question.requirements || {},
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || '',
      outline: question.answer?.outline || [],
      scoring_rubric: question.answer?.scoring_rubric || null,
      common_errors: question.answer?.common_errors || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: Number(question.score) || 1,
    source_type: 'essay',
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

    if (question.type === 'multiple_choice') {
      const converted = convertMultipleChoice(question)
      if (converted) items.push(converted)
      else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    if (question.type === 'true_false') {
      const converted = convertTrueFalse(question)
      if (converted) items.push(converted)
      else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    if (question.type === 'fill_blank') {
      const converted = convertFillBlank(question)
      if (converted) items.push(converted)
      else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
      return
    }

    if (question.type === 'reading') {
      const result = convertReading(question)
      if (result?.item) {
        items.push(result.item)
        skippedCount += result.skippedCount
        skippedTypes.push(...result.skippedTypes)
      } else {
        skippedCount += 1
        skippedTypes.push(question.type)
      }
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

    if (question.type === 'essay') {
      items.push(convertEssay(question))
      return
    }

    skippedCount += 1
    skippedTypes.push(question.type)
  })

  if (!items.length) {
    throw new Error('当前版本暂时只能导入新版 schema 中的 single_choice、multiple_choice、true_false、fill_blank、reading、cloze、translation 和 essay 题目。')
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
