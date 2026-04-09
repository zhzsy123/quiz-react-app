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

function replaceSequentialBlankMarkers(article = '', rawBlanks = []) {
  let nextArticle = String(article || '')
  if (!nextArticle || !rawBlanks.length) return nextArticle

  const numberedPatterns = rawBlanks.flatMap((blank, index) => {
    const blankId = getClozeBlankId(blank, index)
    return [
      new RegExp(`\\(\\s*${blankId}\\s*\\)`),
      new RegExp(`（\\s*${blankId}\\s*）`),
      new RegExp(`\\[\\s*${blankId}\\s*\\]`),
    ]
  })

  let replacedAny = false
  numberedPatterns.forEach((pattern, index) => {
    const blankId = getClozeBlankId(rawBlanks[index], index)
    const placeholder = `[[${blankId}]]`
    if (pattern.test(nextArticle)) {
      nextArticle = nextArticle.replace(pattern, placeholder)
      replacedAny = true
    }
  })

  if (!hasClozePlaceholders(nextArticle)) {
    let underscoreIndex = 0
    nextArticle = nextArticle.replace(/_{3,}|（\s*____+\s*）|\(\s*____+\s*\)/g, () => {
      if (underscoreIndex >= rawBlanks.length) return '______'
      const blankId = getClozeBlankId(rawBlanks[underscoreIndex], underscoreIndex)
      underscoreIndex += 1
      replacedAny = true
      return `[[${blankId}]]`
    })
  }

  return replacedAny ? nextArticle : article
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
  if (!articleText) return ''
  if (hasClozePlaceholders(articleText) || !rawBlanks.length) return articleText

  const markerReplacedArticle = replaceSequentialBlankMarkers(articleText, rawBlanks)
  if (hasClozePlaceholders(markerReplacedArticle)) {
    return markerReplacedArticle
  }

  const reconstructedArticle = injectClozePlaceholdersFromAnswers(articleText, rawBlanks)
  if (hasClozePlaceholders(reconstructedArticle)) {
    return reconstructedArticle
  }

  return ''
}

function buildPromptBasedClozeArticle(rawBlanks = []) {
  if (!rawBlanks.length) return ''

  const promptLines = rawBlanks
    .map((blank, index) => {
      const blankId = getClozeBlankId(blank, index)
      const context = String(extractBlankContext(blank) || '').trim()
      if (!context) return null

      if (hasClozePlaceholders(context)) return context

      const withMarkers = replaceSequentialBlankMarkers(context, [{ ...blank, blank_id: blankId }])
      if (hasClozePlaceholders(withMarkers)) return withMarkers

      const correctText = getBlankCorrectText(blank)
      if (correctText) {
        const injected = injectClozePlaceholdersFromAnswers(context, [{ ...blank, blank_id: blankId }])
        if (hasClozePlaceholders(injected)) return injected
      }

      return `${context} [[${blankId}]]`
    })
    .filter(Boolean)

  return promptLines.length === rawBlanks.length ? promptLines.join('\n') : ''
}

export function buildFallbackClozeArticle(question = {}, rawBlanks = []) {
  const candidate = extractArticleCandidate(question)
  if (candidate) {
    const normalizedCandidate = ensureClozeArticlePlaceholders(candidate, rawBlanks)
    if (normalizedCandidate) return normalizedCandidate
  }

  return buildPromptBasedClozeArticle(rawBlanks)
}
