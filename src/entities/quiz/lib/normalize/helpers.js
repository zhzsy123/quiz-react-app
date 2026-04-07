import { getDefaultScoreByType, parseScore } from '../scoring/scoreConfig'

export function fallbackOptionKey(index) {
  return String.fromCharCode(65 + index)
}

export function normalizeOption(option, index) {
  if (typeof option === 'string') {
    const match = option.match(/^([A-Z])[.\s、)](.*)$/)
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

export function normalizeMultiCorrect(correct) {
  if (Array.isArray(correct)) {
    return [...new Set(correct.map((value) => String(value).trim()).filter(Boolean))].sort()
  }

  if (typeof correct === 'string') {
    return [...new Set(correct.split(/[\s,]+/).map((value) => value.trim()).filter(Boolean))].sort()
  }

  return []
}

export function normalizeTrueFalseCorrect(correct) {
  if (correct === true || String(correct).toLowerCase() === 'true') return 'T'
  if (correct === false || String(correct).toLowerCase() === 'false') return 'F'
  if (String(correct).toUpperCase() === 'T') return 'T'
  if (String(correct).toUpperCase() === 'F') return 'F'
  return ''
}

export function ensureQuestionBase(question, fallbackType, defaultScore = getDefaultScoreByType(fallbackType || question.type)) {
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

export { getDefaultScoreByType, parseScore }
