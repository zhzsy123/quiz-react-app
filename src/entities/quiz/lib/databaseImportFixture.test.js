import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { normalizeQuizPayload } from './normalize/normalizeQuizPayload.js'
import { validateQuizPayload } from './validation/validateQuizPayload.js'

const FIXTURE_PATH = path.resolve(process.cwd(), 'docs/database-principles-import-test-paper.json')

describe('database principles import fixture', () => {
  it('is valid and fully supported by the current import pipeline', () => {
    const payload = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'))

    const validation = validateQuizPayload(payload)
    const normalized = normalizeQuizPayload(payload)

    expect(validation.isValid).toBe(true)
    expect(validation.errors).toEqual([])
    expect(normalized.compatibility.supportedCount).toBe(24)
    expect(normalized.compatibility.skippedCount).toBe(0)
    expect(normalized.items).toHaveLength(24)
  })
})
