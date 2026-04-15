import { describe, expect, it } from 'vitest'

import { formatSqlSchemaLine, parseSqlSchemaContext } from './sqlEditorUtils.js'

describe('sqlEditorUtils', () => {
  it('parses table definitions embedded in a sentence', () => {
    const { tables, notes } = parseSqlSchemaContext(
      '已知 Student(Sno, Sname, Sdept)、Course(Cno, Cname)、SC(Sno, Cno, Grade)，完成下列 SQL 子题。'
    )

    expect(tables).toEqual([
      { name: 'Student', columns: ['Sno', 'Sname', 'Sdept'] },
      { name: 'Course', columns: ['Cno', 'Cname'] },
      { name: 'SC', columns: ['Sno', 'Cno', 'Grade'] },
    ])
    expect(notes).toContain('已知 完成下列 SQL 子题')
  })

  it('formats schema lines with Chinese punctuation', () => {
    expect(formatSqlSchemaLine({ name: 'Student', columns: ['id', 'name', 'score'] })).toBe(
      'Student（id、name、score）'
    )
  })
})
