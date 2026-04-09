const SECTION_DEFINITIONS = [
  {
    key: 'single_choice',
    label: '\u5355\u9879\u9009\u62e9',
    targetQuestionTypes: ['single_choice'],
    patterns: [
      /\bpart\s*i(?![a-z])\b/i,
      /\bpart\s*1\b/i,
      /\bgrammar(?:\s+and\s+vocabulary)?\b/i,
      /\bvocabulary\s+and\s+structure\b/i,
    ],
  },
  {
    key: 'cloze',
    label: '\u5b8c\u5f62\u586b\u7a7a',
    targetQuestionTypes: ['cloze'],
    patterns: [
      /\bpart\s*ii\b/i,
      /\bpart\s*2\b/i,
      /\bcloze\b/i,
      /choose\s+the\s+best\s+(?:word|phrase|answer).*?blank/i,
      /for\s+each\s+blank/i,
      /complete\s+the\s+passage/i,
      /read\s+the\s+following\s+passage\s+and\s+choose.*blank/i,
    ],
  },
  {
    key: 'reading',
    label: '\u9605\u8bfb\u7406\u89e3',
    targetQuestionTypes: ['reading'],
    patterns: [
      /\bpart\s*iii\b/i,
      /\bpart\s*3\b/i,
      /\breading\s+comprehension\b/i,
      /\bpassage\s+[a-d]\b/i,
      /\btext\s+[a-d]\b/i,
      /read\s+passage\s+[a-d]/i,
    ],
  },
  {
    key: 'translation',
    label: '\u7ffb\u8bd1',
    targetQuestionTypes: ['translation'],
    patterns: [
      /\bpart\s*iv\b/i,
      /\bpart\s*4\b/i,
      /\btranslation\b/i,
      /translate\s+the\s+following/i,
      /put\s+the\s+following.*?into\s+(?:chinese|english)/i,
    ],
  },
  {
    key: 'essay',
    label: '\u4f5c\u6587',
    targetQuestionTypes: ['essay'],
    patterns: [
      /\bpart\s*v\b/i,
      /\bpart\s*5\b/i,
      /\bwriting\b/i,
      /\bcomposition\b/i,
      /write\s+(?:an?\s+)?(?:essay|composition)/i,
      /write\s+at\s+least\s+\d+\s+words?/i,
      /your\s+composition\s+should/i,
    ],
  },
]

const PASSAGE_PATTERNS = [/\bpassage\s+([a-d])\b/gi, /\btext\s+([a-d])\b/gi]

function normalizeText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function findFirstPatternIndex(text, patterns = []) {
  let bestIndex = -1

  patterns.forEach((pattern) => {
    const match = text.match(pattern)
    if (!match?.index && match?.index !== 0) return
    if (bestIndex === -1 || match.index < bestIndex) {
      bestIndex = match.index
    }
  })

  return bestIndex
}

function buildSectionMarkers(text) {
  return SECTION_DEFINITIONS.map((definition) => ({
    ...definition,
    start: findFirstPatternIndex(text, definition.patterns),
  }))
    .filter((item) => item.start >= 0)
    .sort((left, right) => left.start - right.start)
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.key === item.key && candidate.start === item.start) === index
    )
}

function hasOptionBlock(text) {
  const matches = text.match(/(?:^|\n)\s*[a-d][\.\)\u3001]\s+/gim) || []
  return matches.length >= 2
}

function inferResidualSection(text) {
  const sample = normalizeText(text)
  if (!sample || sample.length < 80) return null

  const candidateMatchers = [
    {
      definition: SECTION_DEFINITIONS.find((item) => item.key === 'cloze'),
      score: () =>
        (/\[\[\d+\]\]/.test(sample) ? 2 : 0) +
        (/blank/i.test(sample) ? 2 : 0) +
        (/choose\s+the\s+best\s+(?:word|phrase|answer)/i.test(sample) ? 2 : 0) +
        (hasOptionBlock(sample) ? 1 : 0),
    },
    {
      definition: SECTION_DEFINITIONS.find((item) => item.key === 'reading'),
      score: () =>
        (/\bpassage\s+[a-d]\b/i.test(sample) ? 2 : 0) +
        (/\breading\s+comprehension\b/i.test(sample) ? 2 : 0),
    },
    {
      definition: SECTION_DEFINITIONS.find((item) => item.key === 'translation'),
      score: () =>
        (/translate\s+the\s+following/i.test(sample) ? 2 : 0) +
        (/put\s+the\s+following.*?into\s+(?:chinese|english)/i.test(sample) ? 2 : 0),
    },
    {
      definition: SECTION_DEFINITIONS.find((item) => item.key === 'essay'),
      score: () =>
        (/write\s+(?:an?\s+)?(?:essay|composition)/i.test(sample) ? 2 : 0) +
        (/write\s+at\s+least\s+\d+\s+words?/i.test(sample) ? 2 : 0) +
        (/\bcomposition\b/i.test(sample) ? 1 : 0),
    },
    {
      definition: SECTION_DEFINITIONS.find((item) => item.key === 'single_choice'),
      score: () =>
        (/choose\s+the\s+best\s+answer/i.test(sample) ? 2 : 0) +
        (/from\s+the\s+four\s+choices/i.test(sample) ? 2 : 0) +
        (hasOptionBlock(sample) ? 1 : 0),
    },
  ]

  const ranked = candidateMatchers
    .map((item) => ({ definition: item.definition, score: item.score() }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score)

  const best = ranked[0]
  if (!best?.definition) return null

  if (best.definition.key === 'cloze') {
    const hasStrongClozeSignal =
      /\bcloze\b/i.test(sample) ||
      /for\s+each\s+blank/i.test(sample) ||
      /complete\s+the\s+passage/i.test(sample) ||
      /choose\s+the\s+best\s+(?:word|phrase|answer).*?blank/i.test(sample) ||
      /\[\[\d+\]\]/.test(sample)

    if (!hasStrongClozeSignal || best.score < 3) {
      return null
    }
  }

  return best.definition
}

function buildBaseSections(text, markers) {
  if (!markers.length) return []

  const sections = []
  const firstMarker = markers[0]
  const leadingText = normalizeText(text.slice(0, firstMarker.start))
  const inferredLeading = inferResidualSection(leadingText)

  if (leadingText && inferredLeading) {
    sections.push({
      key: inferredLeading.key,
      label: inferredLeading.label,
      targetQuestionTypes: inferredLeading.targetQuestionTypes,
      text: leadingText,
      start: 0,
      end: firstMarker.start,
      inferred: true,
      optional: true,
    })
  }

  markers.forEach((marker, index) => {
    const nextMarker = markers[index + 1]
    const sectionText = normalizeText(text.slice(marker.start, nextMarker ? nextMarker.start : text.length))
    if (!sectionText) return

    sections.push({
      key: marker.key,
      label: marker.label,
      targetQuestionTypes: marker.targetQuestionTypes,
      text: sectionText,
      start: marker.start,
      end: nextMarker ? nextMarker.start : text.length,
      inferred: false,
      optional: false,
    })
  })

  return sections
}

function findPassageMatches(text) {
  const matches = []

  PASSAGE_PATTERNS.forEach((pattern) => {
    for (const match of text.matchAll(pattern)) {
      matches.push({
        label: String(match[1] || '').toUpperCase(),
        start: match.index ?? -1,
      })
    }
  })

  return matches
    .filter((item) => item.start >= 0 && item.label)
    .sort((left, right) => left.start - right.start)
    .filter(
      (item, index, list) =>
        list.findIndex((candidate) => candidate.label === item.label && candidate.start === item.start) === index
    )
    .filter((item, index, list) => {
      const previous = list[index - 1]
      if (!previous) return true
      if (previous.label !== item.label) return true
      return item.start - previous.start > 40
    })
}

function splitReadingSection(section) {
  const matches = findPassageMatches(section.text)
  if (!matches.length) {
    return [section]
  }

  return matches
    .map((match, index) => {
      const nextMatch = matches[index + 1]
      const text = normalizeText(section.text.slice(match.start, nextMatch ? nextMatch.start : section.text.length))
      if (!text) return null
      return {
        key: `reading_${match.label.toLowerCase()}`,
        label: `\u9605\u8bfb ${match.label}`,
        targetQuestionTypes: ['reading'],
        text,
        start: section.start + match.start,
        end: nextMatch ? section.start + nextMatch.start : section.end,
        inferred: false,
        optional: false,
      }
    })
    .filter(Boolean)
}

function expandSections(sections) {
  return sections.flatMap((section) => {
    if (section.key !== 'reading') {
      return [section]
    }
    return splitReadingSection(section)
  })
}

function calculateCoverage(text, sections) {
  if (!text) return 0
  const coveredLength = sections.reduce((total, section) => total + String(section.text || '').length, 0)
  return Math.min(1, coveredLength / text.length)
}

export function detectEnglishImportSections(documentDraft) {
  const plainText = normalizeText(documentDraft?.plainText || '')
  if (!plainText) {
    return {
      shouldSplit: false,
      sections: [],
      coverage: 0,
      strategy: 'empty',
    }
  }

  const markers = buildSectionMarkers(plainText)
  const baseSections = buildBaseSections(plainText, markers)
  const sections = expandSections(baseSections)

  return {
    shouldSplit: sections.length >= 2,
    sections,
    coverage: calculateCoverage(plainText, sections),
    strategy: sections.length >= 2 ? 'english_section_detection' : 'fallback_single_pass',
  }
}
