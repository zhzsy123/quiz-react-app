import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createProfile,
  ensureDefaultProfile,
  getActiveProfileId,
  listProfiles,
  loadPreference,
  loadProgressRecord,
  loadWrongBookEntries,
  removeWrongBookEntry,
  removeWrongBookEntries,
  savePreference,
  saveProgressRecord,
  setActiveProfileId,
  upsertWrongBookEntries,
} from './legacyStorageFacade'

describe('legacyStorageFacade compatibility', () => {
  beforeEach(() => {
    globalThis.indexedDB = new FDBFactory()
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('stores active profile and preferences with safe localStorage access', () => {
    expect(getActiveProfileId()).toBe(null)

    setActiveProfileId('profile_1')
    savePreference('quiz:pref:autoAdvance', true)

    expect(getActiveProfileId()).toBe('profile_1')
    expect(loadPreference('quiz:pref:autoAdvance')).toBe('true')
  })

  it('falls back when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })

    expect(loadPreference('quiz:pref:autoAdvance', 'false')).toBe('false')
    expect(savePreference('quiz:pref:autoAdvance', true)).toBe(false)
  })

  it('persists profile and progress records through the compatibility facade', async () => {
    const fallbackProfile = await ensureDefaultProfile()
    const secondProfile = await createProfile('Second')
    const profiles = await listProfiles()

    await saveProgressRecord(secondProfile.id, 'english', 'paper_1', {
      answers: { q1: 'A' },
      submitted: false,
    })

    const progress = await loadProgressRecord(secondProfile.id, 'english', 'paper_1')

    expect(fallbackProfile.id).toBeTruthy()
    expect(profiles).toHaveLength(2)
    expect(progress.answers).toEqual({ q1: 'A' })
    expect(progress.submitted).toBe(false)
  })

  it('stores wrong-book entries independently from attempts', async () => {
    const profile = await ensureDefaultProfile()

    await upsertWrongBookEntries(profile.id, 'english', [
      {
        questionKey: 'english:paper:q1',
        subject: 'english',
        prompt: 'Question 1',
        correctAnswer: 'A',
      },
    ])

    let wrongBookEntries = await loadWrongBookEntries(profile.id, 'english')
    expect(wrongBookEntries).toHaveLength(1)
    expect(wrongBookEntries[0].prompt).toBe('Question 1')

    wrongBookEntries = await removeWrongBookEntry(profile.id, 'english', 'english:paper:q1')
    expect(wrongBookEntries).toHaveLength(0)
  })

  it('supports batch deletion for wrong-book entries', async () => {
    const profile = await ensureDefaultProfile()

    await upsertWrongBookEntries(profile.id, 'english', [
      { questionKey: 'english:paper:q1', subject: 'english', prompt: 'Question 1' },
      { questionKey: 'english:paper:q2', subject: 'english', prompt: 'Question 2' },
    ])

    const nextEntries = await removeWrongBookEntries(profile.id, 'english', [
      'english:paper:q1',
      'english:paper:q2',
    ])

    expect(nextEntries).toHaveLength(0)
  })
})
