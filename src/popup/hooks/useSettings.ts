import { useCallback, useEffect, useMemo, useState } from "react"

import { sendToBackground } from "@plasmohq/messaging"

import { defaultTheme, themes } from "~/styles/main"

export type RestoreResult = "restored" | "removed" | "missing" | "error"

export type Settings = {
  theme: string
  darkMode: boolean
  moreTargetBlank: "off" | "external" | "all"
  customCSS: string
}

export const DEFAULT_SETTINGS: Settings = {
  theme: defaultTheme,
  darkMode: false,
  moreTargetBlank: "off",
  customCSS: ""
}

const STORAGE_KEYS: Array<keyof Settings> = [
  "theme",
  "darkMode",
  "moreTargetBlank",
  "customCSS"
]

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    try {
      chrome.storage.local.get(STORAGE_KEYS, (result) => {
        if (chrome.runtime?.lastError) {
          console.warn("storage.get error", chrome.runtime.lastError)
        }
        const merged = { ...DEFAULT_SETTINGS, ...result }
        merged.theme =
          merged.theme in themes ? merged.theme : DEFAULT_SETTINGS.theme
        setSettings(merged)
        setLoaded(true)
      })
    } catch (error) {
      console.warn("storage.get failed", error)
      setLoaded(true)
    }
  }, [])

  const themeInfo = useMemo(
    () => themes[settings.theme] ?? themes[defaultTheme],
    [settings.theme]
  )

  const updateSetting = useCallback(
    <K extends keyof Settings>(key: K, value: Settings[K]) => {
      try {
        sendToBackground({ name: "awaiken", body: { id: 123 } }).catch(
          (error) => console.debug("background message failed", error)
        )
      } catch (error) {
        console.debug("background message threw", error)
      }

      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime?.lastError) {
            console.warn("storage.set error", chrome.runtime.lastError)
          }
          setSettings((previous) => ({ ...previous, [key]: value }))
        })
      } catch (error) {
        console.warn("storage.set failed", error)
        setSettings((previous) => ({ ...previous, [key]: value }))
      }
    },
    []
  )

  const resetUI = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  const saveAll = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      try {
        chrome.storage.local.set(settings, () => {
          if (chrome.runtime?.lastError) {
            console.warn("storage.set error", chrome.runtime.lastError)
            reject(chrome.runtime.lastError)
            return
          }
          resolve()
        })
      } catch (error) {
        reject(error)
      }
    })
  }, [settings])

  const restoreDashboardLayout = useCallback(async () => {    
    return new Promise<RestoreResult>(async (resolve) => {
      const restoreKey = "dashboardLayout"
      const backupKey = restoreKey + "Backup"
      try {
        const value = await chrome.storage.local.get(backupKey).then((res) => res[backupKey])
        if (chrome.runtime?.lastError) {
          console.warn("restore get error", chrome.runtime.lastError)
          resolve("error")
          return
        }
        if (value !== undefined) {
          await chrome.storage.local.set({ [restoreKey]: value })
          if (chrome.runtime?.lastError) {
            console.warn("restore set error", chrome.runtime.lastError)
            resolve("error")
            return
          }
          resolve("restored")
          return
        }

        await chrome.storage.local.remove(restoreKey)
        if (chrome.runtime?.lastError) {
          console.warn("restore remove error", chrome.runtime.lastError)
          resolve("error")
          return
        }
        resolve("missing")
      } catch (error) {
        console.warn("restore failed", error)
        resolve("error")
      }
    })
  }, [])

  return {
    settings,
    loaded,
    themeInfo,
    updateSetting,
    resetUI,
    saveAll,
    restoreDashboardLayout
  }
}
