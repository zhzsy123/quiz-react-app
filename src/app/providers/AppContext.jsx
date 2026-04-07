import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import {
  createProfile,
  ensureDefaultProfile,
  getActiveProfileId,
  listProfiles,
  renameProfile,
  setActiveProfileId,
} from '../../shared/lib/storage/storageFacade'

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [profiles, setProfiles] = useState([])
  const [activeProfileId, setCurrentActiveProfileId] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfiles = async () => {
    const allProfiles = await listProfiles()
    setProfiles(allProfiles)
    return allProfiles
  }

  useEffect(() => {
    let isMounted = true

    async function initialize() {
      try {
        const fallbackProfile = await ensureDefaultProfile()
        const allProfiles = await listProfiles()
        const storedActiveProfileId = getActiveProfileId()
        const activeId = allProfiles.some((profile) => profile.id === storedActiveProfileId)
          ? storedActiveProfileId
          : fallbackProfile.id

        setActiveProfileId(activeId)

        if (isMounted) {
          setProfiles(allProfiles)
          setCurrentActiveProfileId(activeId)
          setLoading(false)
        }
      } catch (error) {
        console.error('初始化本地档案失败:', error)
        if (isMounted) setLoading(false)
      }
    }

    initialize()

    return () => {
      isMounted = false
    }
  }, [])

  const createLocalProfile = async (name) => {
    const profile = await createProfile(name)
    const allProfiles = await refreshProfiles()
    const exists = allProfiles.some((item) => item.id === profile.id)
    if (exists) {
      setActiveProfileId(profile.id)
      setCurrentActiveProfileId(profile.id)
    }
    return profile
  }

  const switchProfile = (profileId) => {
    setActiveProfileId(profileId)
    setCurrentActiveProfileId(profileId)
  }

  const renameLocalProfile = async (profileId, name) => {
    await renameProfile(profileId, name)
    await refreshProfiles()
  }

  const activeProfile = useMemo(() => {
    return profiles.find((profile) => profile.id === activeProfileId) || null
  }, [profiles, activeProfileId])

  const value = useMemo(
    () => ({
      profiles,
      activeProfile,
      activeProfileId,
      loading,
      refreshProfiles,
      createLocalProfile,
      switchProfile,
      renameLocalProfile,
    }),
    [profiles, activeProfile, activeProfileId, loading]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useAppContext 必须在 AppProvider 内使用')
  }
  return context
}
