export function hasClozePlaceholders(article = '') {
  return /\[\[(.+?)\]\]/.test(String(article || ''))
}

export function getClozeBlankId(blank = {}, index = 0) {
  return blank?.blank_id ?? blank?.id ?? index + 1
}

export function getClozeRawBlanks(question = {}) {
  if (Array.isArray(question?.blanks)) return question.blanks
  if (Array.isArray(question?.answers)) return question.answers
  if (Array.isArray(question?.items)) return question.items
  if (Array.isArray(question?.questions)) return question.questions
  if (Array.isArray(question?.sub_questions)) return question.sub_questions
  if (Array.isArray(question?.subQuestions)) return question.subQuestions
  return []
}

function extractArticleCandidate(question = {}) {
  return (
    question?.article ||
    question?.content ||
    question?.body ||
    (typeof question?.passage === 'string' ? question.passage : '') ||
    question?.passage?.content ||
    question?.passage?.body ||
    question?.passage?.text ||
    question?.context ||
    question?.material ||
    ''
  )
}

function extractBlankContext(blank = {}) {
  return (
    blank?.prompt ||
    blank?.title ||
    blank?.stem ||
    blank?.sentence ||
    blank?.text ||
    blank?.content ||
    blank?.body ||
    ''
  )
}

export function ensureClozeArticlePlaceholders(article = '', rawBlanks = []) {
  const articleText = String(article || '').trim()
  if (!articleText) return articleText
  if (hasClozePlaceholders(articleText) || !rawBlanks.length) return articleText

  const placeholderLine = rawBlanks
    .map((blank, index) => `(${index + 1}) [[${getClozeBlankId(blank, index)}]]`)
    .join(' ')

  return placeholderLine ? `${articleText}\n\n${placeholderLine}` : articleText
}

export function buildFallbackClozeArticle(question = {}, rawBlanks = []) {
  const candidate = extractArticleCandidate(question)
  if (candidate) {
    return ensureClozeArticlePlaceholders(candidate, rawBlanks)
  }

  if (!rawBlanks.length) return ''

  const promptLines = rawBlanks
    .map((blank, index) => {
      const blankId = getClozeBlankId(blank, index)
      const context = String(extractBlankContext(blank) || '').trim()
      if (!context) {
        return `(${index + 1}) [[${blankId}]]`
      }

      if (hasClozePlaceholders(context)) return context
      return `${context} [[${blankId}]]`
    })
    .filter(Boolean)

  return promptLines.join('\n')
}
