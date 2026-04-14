export const SQL_QUICK_INSERTS = [
  { key: 'select', label: 'SELECT', snippet: 'SELECT \nFROM ', cursorOffset: 7 },
  { key: 'where', label: 'WHERE', snippet: '\nWHERE ', cursorOffset: 7 },
  { key: 'join', label: 'JOIN', snippet: '\nINNER JOIN  ON ', cursorOffset: 12 },
  { key: 'group_by', label: 'GROUP BY', snippet: '\nGROUP BY ', cursorOffset: 10 },
  { key: 'having', label: 'HAVING', snippet: '\nHAVING ', cursorOffset: 8 },
  { key: 'order_by', label: 'ORDER BY', snippet: '\nORDER BY ', cursorOffset: 10 },
  { key: 'count', label: 'COUNT(*)', snippet: 'COUNT(*)', cursorOffset: 8 },
  { key: 'avg', label: 'AVG()', snippet: 'AVG()', cursorOffset: 4 },
  { key: 'distinct', label: 'DISTINCT', snippet: 'DISTINCT ', cursorOffset: 9 },
]

export function insertTextAtSelection({
  value = '',
  selectionStart = value.length,
  selectionEnd = value.length,
  snippet = '',
  cursorOffset = snippet.length,
}) {
  const safeStart = Number.isFinite(selectionStart) ? selectionStart : value.length
  const safeEnd = Number.isFinite(selectionEnd) ? selectionEnd : value.length
  const nextValue = `${value.slice(0, safeStart)}${snippet}${value.slice(safeEnd)}`
  const cursorPosition = safeStart + Math.max(0, Math.min(cursorOffset, snippet.length))

  return {
    value: nextValue,
    selectionStart: cursorPosition,
    selectionEnd: cursorPosition,
  }
}

export function insertTextIntoEditor(view, snippet = '', cursorOffset = snippet.length) {
  if (!view || !snippet) return

  const selection = view.state.selection.main
  const from = selection.from
  const to = selection.to
  const anchor = from + Math.max(0, Math.min(cursorOffset, snippet.length))

  view.dispatch({
    changes: { from, to, insert: snippet },
    selection: { anchor, head: anchor },
    scrollIntoView: true,
  })
  view.focus()
}

function normalizeSchemaLine(line = '') {
  return String(line || '')
    .replace(/[（﹙]/g, '(')
    .replace(/[）﹚]/g, ')')
    .replace(/[，、]/g, ',')
    .replace(/\s+/g, ' ')
    .trim()
}

export function parseSqlSchemaContext(context = '') {
  const lines = String(context || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  const tables = []
  const notes = []

  lines.forEach((line) => {
    const normalizedLine = normalizeSchemaLine(line)
    const match = normalizedLine.match(/^([\p{L}_][\p{L}\p{N}_]*)\s*\((.+)\)$/u)

    if (!match) {
      notes.push(line)
      return
    }

    const [, name, rawColumns] = match
    const columns = rawColumns
      .split(',')
      .map((column) => column.trim())
      .filter(Boolean)

    if (!columns.length) {
      notes.push(line)
      return
    }

    tables.push({ name, columns })
  })

  return { tables, notes }
}

export function formatSqlSchemaLine(table) {
  if (!table?.name) return ''
  const columns = Array.isArray(table.columns) ? table.columns.filter(Boolean) : []
  return `${table.name}（${columns.join('、')}）`
}

export function buildSqlAutocompleteSchema(context = '') {
  const { tables } = parseSqlSchemaContext(context)
  return tables.reduce((schema, table) => {
    schema[table.name] = table.columns
    return schema
  }, {})
}
