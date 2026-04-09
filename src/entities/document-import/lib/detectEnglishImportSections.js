function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .trim()
}

function findFirstPatternIndex(text, patterns = []) {
  let minIndex = -1

  patterns.forEach((pattern) => {
    const match = pattern.exec(text)
    pattern.lastIndex = 0
    if (!match) return
    if (minIndex === -1 || match.index < minIndex) {
      minIndex = match.index
    }
  })

  return minIndex
}

function findPassageMatches(text) {
  const regex = /(?:^|\n)\s*(?:passage|text)\s*([A-D])\b|(?:^|\n)\s*([A-D])\s*[篇段]\b|(?:^|\n)\s*阅读\s*([A-D])/gim
  const matches = []
  let match = regex.exec(text)
  while (match) {
    const label = (match[1] || match[2] || match[3] || '').toUpperCase()
    if (label) {
      matches.push({
        index: match.index,
        label,
      })
    }
    match = regex.exec(text)
  }

  return matches.filter(
    (item, index, list) => list.findIndex((candidate) => candidate.index === item.index && candidate.label === item.label) === index
  )
}

const MAJOR_SECTION_PATTERNS = {
  single_choice: [
    /part\s*i\b[\s\S]{0,80}?(?:grammar|vocabulary|structure|single\s*choice|multiple\s*choice)/i,
    /单项选择/i,
    /语法(?:与|和)?词汇/i,
    /grammar\s*(?:and|&)?\s*vocabulary/i,
  ],
  cloze: [
    /part\s*ii\b[\s\S]{0,80}?cloze/i,
    /完形填空/i,
    /完型填空/i,
    /\bcloze\b/i,
  ],
  reading: [
    /part\s*iii\b[\s\S]{0,80}?(?:reading|comprehension)/i,
    /阅读理解/i,
    /reading\s+comprehension/i,
    /\bpassage\s*A\b/i,
    /\btext\s*A\b/i,
  ],
  translation: [
    /part\s*iv\b[\s\S]{0,80}?translation/i,
    /翻译/i,
    /\btranslation\b/i,
    /translate the following/i,
  ],
  essay: [
    /part\s*v\b[\s\S]{0,80}?(?:writing|essay|composition)/i,
    /作文/i,
    /写作/i,
    /\bwriting\b/i,
    /\bessay\b/i,
    /\bcomposition\b/i,
  ],
}

function buildMajorMarkers(text) {
  return Object.entries(MAJOR_SECTION_PATTERNS)
    .map(([key, patterns]) => ({
      key,
      index: findFirstPatternIndex(text, patterns),
    }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index)
}

function createSection(key, label, text, targetQuestionTypes, index) {
  return {
    key,
    label,
    text: normalizeText(text),
    targetQuestionTypes,
    order: index,
  }
}

function buildSectionsFromMarkers(text, markers) {
  const sections = []

  markers.forEach((marker, index) => {
    const start = marker.index
    const end = markers[index + 1]?.index ?? text.length
    const sectionText = normalizeText(text.slice(start, end))
    if (!sectionText) return

    if (marker.key === 'reading') {
      const passageMatches = findPassageMatches(sectionText)
      if (passageMatches.length > 0) {
        passageMatches.forEach((passageMatch, passageIndex) => {
          const sectionStart = passageMatch.index
          const sectionEnd = passageMatches[passageIndex + 1]?.index ?? sectionText.length
          const passageText = normalizeText(sectionText.slice(sectionStart, sectionEnd))
          if (!passageText) return
          sections.push(
            createSection(`reading_${passageMatch.label.toLowerCase()}`, `阅读 ${passageMatch.label}`, passageText, ['reading'], sections.length)
          )
        })
      } else {
        sections.push(createSection('reading', '阅读理解', sectionText, ['reading'], sections.length))
      }
      return
    }

    const labelMap = {
      single_choice: '单项选择',
      cloze: '完形填空',
      translation: '翻译',
      essay: '作文',
    }

    const typeMap = {
      single_choice: ['single_choice'],
      cloze: ['cloze'],
      translation: ['translation'],
      essay: ['essay'],
    }

    sections.push(createSection(marker.key, labelMap[marker.key] || marker.key, sectionText, typeMap[marker.key] || [], sections.length))
  })

  return sections.filter((section) => section.text)
}

function buildCoverage(text, sections) {
  const totalLength = normalizeText(text).length || 1
  const coveredLength = sections.reduce((sum, section) => sum + section.text.length, 0)
  return coveredLength / totalLength
}

export function detectEnglishImportSections(documentDraft) {
  const plainText = normalizeText(documentDraft?.plainText)
  if (!plainText) {
    return {
      shouldSplit: false,
      sections: [],
      reason: 'empty_text',
      coverage: 0,
    }
  }

  const markers = buildMajorMarkers(plainText)
  if (markers.length < 2) {
    return {
      shouldSplit: false,
      sections: [],
      reason: 'insufficient_markers',
      coverage: 0,
    }
  }

  const sections = buildSectionsFromMarkers(plainText, markers)
  const coverage = buildCoverage(plainText, sections)

  const hasCloze = sections.some((section) => section.key === 'cloze')
  const hasReading = sections.some((section) => section.key.startsWith('reading'))
  const hasObjective = sections.some((section) => section.key === 'single_choice')

  const shouldSplit = sections.length >= 3 && coverage >= 0.45 && (hasReading || hasCloze || hasObjective)

  return {
    shouldSplit,
    sections,
    coverage,
    reason: shouldSplit ? 'english_sections_detected' : 'low_confidence',
  }
}
