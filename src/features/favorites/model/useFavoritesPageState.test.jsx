/* @vitest-environment jsdom */

import React, { useEffect } from 'react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createRoot } from 'react-dom/client'

const {
  navigateMock,
  listAllFavoriteEntriesMock,
  removeFavoriteEntryMock,
  getSubjectMetaMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  listAllFavoriteEntriesMock: vi.fn(),
  removeFavoriteEntryMock: vi.fn(),
  getSubjectMetaMock: vi.fn((subject) => ({
    key: subject,
    routeSlug: subject,
    shortLabel: subject === 'english' ? '英语' : '数学',
  })),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../../app/providers/AppContext', () => ({
  useAppContext: () => ({
    activeProfile: { id: 'profile-1', name: 'Test User' },
    activeProfileId: 'profile-1',
  }),
}))

vi.mock('../../../entities/favorite/api/favoriteRepository', () => ({
  listAllFavoriteEntries: listAllFavoriteEntriesMock,
  removeFavoriteEntry: removeFavoriteEntryMock,
}))

vi.mock('../../../entities/subject/model/subjects', () => ({
  getSubjectMeta: getSubjectMetaMock,
}))

import { useFavoritesPageState } from './useFavoritesPageState'

function FavoritesHarness({ onChange }) {
  const state = useFavoritesPageState()

  useEffect(() => {
    onChange(state)
  }, [onChange, state])

  return null
}

async function flushAsyncWork() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

async function waitFor(predicate, attempts = 20) {
  for (let index = 0; index < attempts; index += 1) {
    if (predicate()) return
    await flushAsyncWork()
  }

  throw new Error('Timed out waiting for favorites state.')
}

async function mountFavorites() {
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  const stateRef = { current: null }

  await act(async () => {
    root.render(<FavoritesHarness onChange={(state) => { stateRef.current = state }} />)
  })

  await waitFor(() => Array.isArray(stateRef.current?.filteredEntries))

  return {
    root,
    container,
    stateRef,
  }
}

describe('useFavoritesPageState start practice behavior', () => {
  beforeEach(() => {
    listAllFavoriteEntriesMock.mockResolvedValue([
      {
        questionKey: 'english:paper-1:q1',
        subject: 'english',
        prompt: 'Alpha question',
        paperTitle: 'English Paper',
        contextTitle: '',
        tags: ['grammar'],
      },
      {
        questionKey: 'math:paper-2:q2',
        subject: 'math',
        prompt: 'Beta question',
        paperTitle: 'Math Paper',
        contextTitle: '',
        tags: ['algebra'],
      },
    ])
    removeFavoriteEntryMock.mockResolvedValue(undefined)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.clearAllMocks()
  })

  it('allows starting practice under a single-subject filter', async () => {
    const { root, container, stateRef } = await mountFavorites()

    await act(async () => {
      stateRef.current.setSubjectFilter('english')
      await flushAsyncWork()
    })

    expect(stateRef.current.canStartPractice).toBe(true)

    await act(async () => {
      stateRef.current.handleStartPractice()
    })

    expect(navigateMock).toHaveBeenCalledWith('/workspace/english?source=favorites&mode=practice')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('allows starting practice in all-subject mode when filtered results resolve to one unique subject', async () => {
    const { root, container, stateRef } = await mountFavorites()

    await act(async () => {
      stateRef.current.setQuery('alpha')
      await flushAsyncWork()
    })

    expect(stateRef.current.filteredEntries).toHaveLength(1)
    expect(stateRef.current.filteredEntries[0].subject).toBe('english')
    expect(stateRef.current.canStartPractice).toBe(true)

    await act(async () => {
      stateRef.current.handleStartPractice()
    })

    expect(navigateMock).toHaveBeenCalledWith('/workspace/english?source=favorites&mode=practice')

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })

  it('blocks starting practice in all-subject mode when filtered results span multiple subjects', async () => {
    const { root, container, stateRef } = await mountFavorites()

    expect(stateRef.current.filteredEntries).toHaveLength(2)
    expect(stateRef.current.canStartPractice).toBe(false)

    await act(async () => {
      stateRef.current.handleStartPractice()
    })

    expect(navigateMock).not.toHaveBeenCalled()

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
