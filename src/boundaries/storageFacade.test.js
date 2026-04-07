import FDBFactory from 'fake-indexeddb/lib/FDBFactory'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createProfile,
  ensureDefaultProfile,
  getActiveProfileId,
  listProfiles,
  loadPreference,
  loadProgressRecord,
  savePreference,
  saveProgressRecord,
  setActiveProfileId,
} from './storageFacade'

describe('storageFacade boundary', () => {
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

  it('persists profile and progress records through the facade', async () => {
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
})
