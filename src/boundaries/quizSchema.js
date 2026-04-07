function fallbackOptionKey(index) {
  return String.fromCharCode(65 + index)
}

function normalizeOption(option, index) {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])[.\s、](.*)$/)
    if (match) {
      return {
        key: match[1],
        text: match[2].trim(),
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

export const DEFAULT_QUESTION_SCORES = {
  single_choice: 2,
  multiple_choice: 2,
  true_false: 2,
  fill_blank: 2,
  cloze: 2,
  reading: 2.5,
  short_answer: 10,
  case_analysis: 20,
  calculation: 6,
  operation: 16,
  translation: 15,
  essay: 30,
}

function parseScore(value, fallback) {
  const numeric = Number(value)
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback
}

function getDefaultScoreByType(type) {
  return DEFAULT_QUESTION_SCORES[type] || 1
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
  if (!Array.isArray(data.items)) {
    throw new Error('题库必须包含 questions 数组。')
  }

  const items = data.items.map((item) => ({
    id: item.id,
    type: 'single_choice',
    prompt: item.question,
    difficulty: item.difficulty,
    tags: item.tags || [],
    score: parseScore(item.score, getDefaultScoreByType('single_choice')),
    source_type: 'legacy_single_choice',
    assets: [],
    options: (item.options || []).map(normalizeOption),
    answer: {
      type: 'objective',
      correct: item.correct_answer,
      rationale: item.rationale || '暂无解析',
    },
  }))

  if (!items.length) {
    throw new Error('旧题库没有可用题目。')
  }

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

function ensureQuestionBase(question, fallbackType, defaultScore = getDefaultScoreByType(fallbackType || question.type)) {
  return {
    id: question.id,
    type: fallbackType || question.type,
    prompt: question.prompt,
    difficulty: question.difficulty,
    tags: question.tags || [],
    score: parseScore(question.score, defaultScore),
    source_type: question.type,
    assets: Array.isArray(question.assets) ? question.assets : [],
  }
}

function convertSingleChoice(question, options = {}) {
  if (!Array.isArray(question.options) || !question.answer?.correct) return null

  return {
    ...ensureQuestionBase(question, 'single_choice', options.defaultScore || getDefaultScoreByType('single_choice')),
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct: question.answer.correct,
      rationale: question.answer.rationale || '暂无解析',
    },
  }
}

function convertMultipleChoice(question) {
  if (!Array.isArray(question.options)) return null
  const correct = normalizeMultiCorrect(question.answer?.correct)
  if (!correct.length) return null

  return {
    ...ensureQuestionBase(question, 'multiple_choice', getDefaultScoreByType('multiple_choice')),
    options: question.options.map(normalizeOption),
    answer: {
      type: 'objective',
      correct,
      rationale: question.answer?.rationale || '暂无解析',
    },
  }
}

function convertTrueFalse(question) {
  const correct = normalizeTrueFalseCorrect(question.answer?.correct)
  if (!correct) return null

  return {
    ...ensureQuestionBase(question, 'true_false', getDefaultScoreByType('true_false')),
    options: [
      { key: 'T', text: '正确' },
      { key: 'F', text: '错误' },
    ],
    answer: {
      type: 'objective',
      correct,
      rationale: question.answer?.rationale || '暂无解析',
    },
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
        score: parseScore(blank.score, getDefaultScoreByType('fill_blank')),
      }
    })
    .filter(Boolean)

  if (!blanks.length) return null

  return {
    ...ensureQuestionBase(
      question,
      'fill_blank',
      blanks.reduce((sum, blank) => sum + (blank.score || 0), 0)
    ),
    blanks,
    answer: {
      type: 'objective',
      correct: blanks.map((blank) => blank.accepted_answers),
      rationale: question.answer?.rationale || '',
    },
    score: blanks.reduce((sum, blank) => sum + (blank.score || 0), 0),
  }
}

function convertReading(question) {
  if (!question.passage?.content || !Array.isArray(question.questions)) return null

  const normalizedQuestions = question.questions
    .map((subQuestion) => convertSingleChoice(subQuestion, { defaultScore: getDefaultScoreByType('reading') }))
    .filter(Boolean)

  if (!normalizedQuestions.length) return null

  return {
    ...ensureQuestionBase(
      question,
      'reading',
      normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0)
    ),
    title: question.title,
    passage: {
      title: question.passage?.title || question.title,
      content: question.passage.content,
    },
    questions: normalizedQuestions,
    answer: {
      type: 'objective',
    },
    score: normalizedQuestions.reduce((sum, subQuestion) => sum + (subQuestion.score || 0), 0),
  }
}

function convertCloze(question) {
  if (!question.article || !Array.isArray(question.blanks)) return []

  return question.blanks
    .map((blank) => {
      if (!Array.isArray(blank.options) || !blank.correct) return null

      return {
        id: `${question.id}_blank_${blank.blank_id}`,
        type: 'single_choice',
        prompt: `${question.prompt}（第 ${blank.blank_id} 空）`,
        context_title: question.title || '完形填空',
        context: question.article.replace(`[[${blank.blank_id}]]`, `____(${blank.blank_id})____`),
        difficulty: question.difficulty,
        tags: question.tags || [],
        score: parseScore(blank.score, getDefaultScoreByType('cloze')),
        source_type: 'cloze',
        assets: Array.isArray(question.assets) ? question.assets : [],
        options: blank.options.map(normalizeOption),
        answer: {
          type: 'objective',
          correct: blank.correct,
          rationale: blank.rationale || '暂无解析',
        },
      }
    })
    .filter(Boolean)
}

function convertTranslation(question) {
  const sourceText =
    question.source_text ||
    question.sourceText ||
    question.text ||
    question.content ||
    question.body ||
    question.prompt

  if (!sourceText) return null

  const prompt =
    question.translation_prompt ||
    question.instruction ||
    (question.source_text || question.sourceText || question.text || question.content || question.body
      ? question.prompt || '请完成翻译'
      : '请完成翻译')

  return {
    ...ensureQuestionBase(question, 'translation', getDefaultScoreByType('translation')),
    prompt,
    direction: question.direction || 'en_to_zh',
    source_text: sourceText,
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || question.answer?.correct || '',
      alternate_answers: question.answer?.alternate_answers || [],
      scoring_points: question.answer?.scoring_points || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
  }
}

function convertEssay(question) {
  return {
    ...ensureQuestionBase(question, 'essay', getDefaultScoreByType('essay')),
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
  }
}

export function normalizeQuizPayload(data) {
  if (Array.isArray(data?.items)) {
    return normalizeLegacySchema(data)
  }

  if (!Array.isArray(data?.questions)) {
    throw new Error('题库必须包含 questions 数组。')
  }

  const items = []
  let skippedCount = 0
  const skippedTypes = []

  data.questions.forEach((question) => {
    switch (question?.type) {
      case 'single_choice': {
        const converted = convertSingleChoice(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'multiple_choice': {
        const converted = convertMultipleChoice(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'true_false': {
        const converted = convertTrueFalse(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'fill_blank': {
        const converted = convertFillBlank(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'reading': {
        const converted = convertReading(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'cloze': {
        const converted = convertCloze(question)
        if (converted.length) items.push(...converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'translation': {
        const converted = convertTranslation(question)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      case 'essay': {
        items.push(convertEssay(question))
        break
      }
      case 'short_answer':
      case 'case_analysis':
      case 'calculation':
      case 'operation': {
        const converted = convertGenericSubjective(question, question.type)
        if (converted) items.push(converted)
        else {
          skippedCount += 1
          skippedTypes.push(question.type)
        }
        break
      }
      default: {
        skippedCount += 1
        skippedTypes.push(question?.type || 'unknown')
      }
    }
  })

  if (!items.length) {
    throw new Error('当前 JSON 规范只支持 single_choice、multiple_choice、true_false、fill_blank、reading、cloze、translation、essay、short_answer、case_analysis、calculation、operation。')
  }

  return {
    title: data.title || '未命名试卷',
    paper_id: data.paper_id,
    subject: data.subject || '',
    description: data.description || '',
    duration_minutes: Number(data.duration_minutes) || 0,
    items,
    compatibility: {
      sourceSchema: data.schema_version || 'json-schema',
      supportedCount: items.length,
      skippedCount,
      skippedTypes: [...new Set(skippedTypes)],
    },
  }
}

function convertGenericSubjective(question, fallbackType) {
  const prompt = question.prompt || question.title || '请完成作答'
  if (!prompt) return null

  return {
    ...ensureQuestionBase(question, fallbackType, getDefaultScoreByType(fallbackType)),
    prompt,
    context_title: question.context_title || question.case_title || question.material_title || '',
    context:
      question.context ||
      question.case_material ||
      question.material ||
      question.background ||
      question.body ||
      '',
    requirements: question.requirements || {},
    answer: {
      type: 'subjective',
      reference_answer: question.answer?.reference_answer || question.answer?.correct || '',
      outline: question.answer?.outline || [],
      scoring_points: question.answer?.scoring_points || [],
      scoring_rubric: question.answer?.scoring_rubric || null,
      common_errors: question.answer?.common_errors || [],
      ai_scoring: question.answer?.ai_scoring || { enabled: false },
    },
  }
}

export function getQuizScoreBreakdown(items = []) {
  return items.reduce(
    (summary, item) => {
      if (!item) return summary

      if (item.type === 'reading') {
        const readingScore = (item.questions || []).reduce((sum, question) => sum + parseScore(question.score, 0), 0)
        summary.objectiveTotal += readingScore
        summary.paperTotal += readingScore
        return summary
      }

      if (item.type === 'fill_blank') {
        const fillBlankScore = (item.blanks || []).reduce((sum, blank) => sum + parseScore(blank.score, 0), 0)
        summary.objectiveTotal += fillBlankScore
        summary.paperTotal += fillBlankScore
        return summary
      }

      const itemScore = parseScore(item.score, 0)
      if (item.answer?.type === 'subjective') {
        summary.subjectiveTotal += itemScore
      } else {
        summary.objectiveTotal += itemScore
      }
      summary.paperTotal += itemScore
      return summary
    },
    {
      objectiveTotal: 0,
      subjectiveTotal: 0,
      paperTotal: 0,
    }
  )
}
