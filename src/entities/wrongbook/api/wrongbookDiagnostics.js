import { listMetaRecordsByPrefix } from '../../../shared/storage/indexedDb/metaStore'

function buildWrongbookEntriesPrefix(profileId) {
  return `wrongbook-entries:${profileId}:`
}

function buildWrongbookMasteredPrefix(profileId) {
  return `wrongbook-mastered:${profileId}:`
}

function parseSubjectFromKey(key, prefix) {
  return String(key || '').slice(prefix.length) || 'unknown'
}

function normalizeDiagnosticValue(value) {
  if (value == null) return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value
  if (typeof value === 'object') {
    try {
      return JSON.parse(JSON.stringify(value))
    } catch {
      return '[unserializable-object]'
    }
  }
  return String(value)
}

function isPrimitiveLike(value) {
  return value == null || ['string', 'number', 'boolean'].includes(typeof value)
}

export function inspectWrongbookEntry(row, { subject = 'unknown', mapKey = '' } = {}) {
  const reasons = []
  const questionKey = typeof row?.questionKey === 'string' && row.questionKey.trim()
    ? row.questionKey.trim()
    : typeof row?.questionId === 'string' && row.questionId.trim()
      ? row.questionId.trim()
      : ''

  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    reasons.push('记录不是对象')
  } else {
    if (!questionKey) reasons.push('缺少 questionKey/questionId')
    if (!isPrimitiveLike(row.prompt)) reasons.push('prompt 不是可直接渲染的文本')
    if (!isPrimitiveLike(row.paperTitle ?? row.paper_title)) reasons.push('paperTitle 不是文本')
    if (!isPrimitiveLike(row.contextTitle ?? row.context_title)) reasons.push('contextTitle 不是文本')
    if (!isPrimitiveLike(row.contextSnippet ?? row.context_snippet)) reasons.push('contextSnippet 不是文本')
    if (!isPrimitiveLike(row.rationale)) reasons.push('rationale 不是文本')
    if (!isPrimitiveLike(row.correctAnswerLabel ?? row.correct_answer_label)) reasons.push('correctAnswerLabel 不是文本')
    if (!isPrimitiveLike(row.userAnswerLabel ?? row.user_answer_label)) reasons.push('userAnswerLabel 不是文本')
    if (row.subject != null && typeof row.subject !== 'string') reasons.push('subject 不是字符串')
    if (row.wrongTimes != null && !Number.isFinite(Number(row.wrongTimes))) reasons.push('wrongTimes 不是有效数字')
    if (row.lastWrongAt != null && !Number.isFinite(Number(row.lastWrongAt))) reasons.push('lastWrongAt 不是有效时间戳')
    if (row.options != null && !Array.isArray(row.options)) reasons.push('options 不是数组')
    if (row.blanks != null && !Array.isArray(row.blanks)) reasons.push('blanks 不是数组')

    if (Array.isArray(row.options)) {
      row.options.forEach((option, index) => {
        if (typeof option === 'string') return
        if (!option || typeof option !== 'object') {
          reasons.push(`options[${index}] 不是字符串或对象`)
          return
        }
        if (!isPrimitiveLike(option.text ?? option.label ?? option.value)) {
          reasons.push(`options[${index}] 文案不是文本`)
        }
      })
    }

    if (Array.isArray(row.blanks)) {
      row.blanks.forEach((blank, index) => {
        if (!blank || typeof blank !== 'object') {
          reasons.push(`blanks[${index}] 不是对象`)
          return
        }
        if (blank.options != null && !Array.isArray(blank.options)) reasons.push(`blanks[${index}].options 不是数组`)
        if (blank.rationale != null && !isPrimitiveLike(blank.rationale)) reasons.push(`blanks[${index}].rationale 不是文本`)
      })
    }
  }

  return {
    subject,
    questionKey: questionKey || mapKey || 'unknown',
    promptPreview:
      typeof row?.prompt === 'string'
        ? row.prompt.slice(0, 120)
        : typeof row?.questionPrompt === 'string'
          ? row.questionPrompt.slice(0, 120)
          : '[非文本题干]',
    reasons,
    riskLevel:
      reasons.length >= 4 ? 'high'
      : reasons.length >= 2 ? 'medium'
      : reasons.length >= 1 ? 'low'
      : 'none',
    raw: normalizeDiagnosticValue(row),
  }
}

export async function exportWrongbookDiagnostics(profileId) {
  if (!profileId) {
    return {
      summary: {
        entryRecordCount: 0,
        masteredRecordCount: 0,
        entryCount: 0,
        suspectCount: 0,
      },
      entryRecords: [],
      masteredRecords: [],
      suspectEntries: [],
      exportedAt: new Date().toISOString(),
    }
  }

  const entriesPrefix = buildWrongbookEntriesPrefix(profileId)
  const masteredPrefix = buildWrongbookMasteredPrefix(profileId)
  const [entryRecords, masteredRecords] = await Promise.all([
    listMetaRecordsByPrefix(entriesPrefix),
    listMetaRecordsByPrefix(masteredPrefix),
  ])

  const suspectEntries = []
  let entryCount = 0

  entryRecords.forEach((record) => {
    const subject = parseSubjectFromKey(record.key, entriesPrefix)
    const value = record?.value

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      suspectEntries.push({
        subject,
        questionKey: record.key,
        promptPreview: '[记录映射异常]',
        reasons: ['wrongbook-entries 记录本身不是对象映射'],
        riskLevel: 'high',
        raw: normalizeDiagnosticValue(record),
      })
      return
    }

    Object.entries(value).forEach(([mapKey, row]) => {
      entryCount += 1
      const inspection = inspectWrongbookEntry(row, { subject, mapKey })
      if (inspection.reasons.length > 0) {
        suspectEntries.push(inspection)
      }
    })
  })

  suspectEntries.sort((left, right) => {
    const riskRank = { high: 3, medium: 2, low: 1, none: 0 }
    return riskRank[right.riskLevel] - riskRank[left.riskLevel]
  })

  return {
    summary: {
      entryRecordCount: entryRecords.length,
      masteredRecordCount: masteredRecords.length,
      entryCount,
      suspectCount: suspectEntries.length,
    },
    entryRecords: entryRecords.map((record) => ({
      key: record.key,
      updatedAt: record.updatedAt || null,
      value: normalizeDiagnosticValue(record.value),
    })),
    masteredRecords: masteredRecords.map((record) => ({
      key: record.key,
      updatedAt: record.updatedAt || null,
      value: normalizeDiagnosticValue(record.value),
    })),
    suspectEntries,
    exportedAt: new Date().toISOString(),
  }
}
