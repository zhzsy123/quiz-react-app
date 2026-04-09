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

function getBlankOptions(blank = {}) {
  if (Array.isArray(blank?.options)) return blank.options
  if (Array.isArray(blank?.choices)) return blank.choices
  if (Array.isArray(blank?.selections)) return blank.selections
  return []
}

function getBlankCorrectValue(blank = {}) {
  return (
    blank?.answer?.correct ??
    blank?.answer?.answer ??
    blank?.correct_answer ??
    blank?.correctAnswer ??
    blank?.correct_option ??
    blank?.correctOption ??
    blank?.correct ??
    ''
  )
}

function normalizeText(value) {
  return String(value || '').trim()
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function getBlankCorrectText(blank = {}) {
  const correct = getBlankCorrectValue(blank)
  const normalizedCorrect = Array.isArray(correct) ? normalizeText(correct[0]) : normalizeText(correct)
  if (!normalizedCorrect) return ''

  const options = getBlankOptions(blank)
  const matchedOption = options.find((option) => {
    if (typeof option === 'string') {
      const match = option.match(/^([A-Z])(?:[\.\s、，：:）\)]*)\s*(.*)$/)
      return match ? normalizeText(match[1]) === normalizedCorrect : normalizeText(option) === normalizedCorrect
    }

    return normalizeText(option?.key) === normalizedCorrect
  })

  if (matchedOption) {
    if (typeof matchedOption === 'string') {
      const match = matchedOption.match(/^([A-Z])(?:[\.\s、，：:）\)]*)\s*(.*)$/)
      return normalizeText(match?.[2] || matchedOption)
    }

    return normalizeText(matchedOption?.text || matchedOption?.label || matchedOption?.value || '')
  }

  return normalizedCorrect
}

function injectClozePlaceholdersFromAnswers(article = '', rawBlanks = []) {
  let nextArticle = String(article || '')
  if (!nextArticle || !rawBlanks.length) return nextArticle

  let cursor = 0
  let matchedCount = 0

  rawBlanks.forEach((blank, index) => {
    const correctText = getBlankCorrectText(blank)
    if (!correctText) return

    const blankId = getClozeBlankId(blank, index)
    const placeholder = `[[${blankId}]]`
    const escaped = escapeRegExp(correctText)
    const regex = new RegExp(escaped, 'i')
    const remaining = nextArticle.slice(cursor)
    const match = remaining.match(regex)

    if (!match || typeof match.index !== 'number') return

    const absoluteIndex = cursor + match.index
    nextArticle =
      nextArticle.slice(0, absoluteIndex) +
      placeholder +
      nextArticle.slice(absoluteIndex + match[0].length)
    cursor = absoluteIndex + placeholder.length
    matchedCount += 1
  })

  return matchedCount > 0 ? nextArticle : article
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

  const reconstructedArticle = injectClozePlaceholdersFromAnswers(articleText, rawBlanks)
  if (hasClozePlaceholders(reconstructedArticle)) {
    return reconstructedArticle
  }

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
