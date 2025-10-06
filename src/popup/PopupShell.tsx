import React, { useState } from "react"

import { clearCalendarCache } from "~components/calendar/eventsources/cache"

import { Button } from "./components/controls"
import { MessageModal, Skeleton } from "./components/feedback"
import { Divider, Tabs } from "./components/layout"
import { DEFAULT_SETTINGS, useSettings } from "./hooks/useSettings"
import AdvancedTab from "./tabs/AdvancedTab"
import BasicTab from "./tabs/BasicTab"
import DevTab from "./tabs/DevTab"

type TabKey = "basic" | "advanced" | "dev"

type InfoModal = { title: string; message: string } | null

export default function PopupShell() {
  const {
    settings,
    loaded,
    updateSetting,
    resetUI,
    saveAll,
    restoreDashboardLayout
  } = useSettings()
  const [tab, setTab] = useState<TabKey>("basic")
  const [infoModal, setInfoModal] = useState<InfoModal>(null)

  const closeModal = () => setInfoModal(null)

  const handleSave = async () => {
    try {
      await saveAll()
      setInfoModal({ title: "Saved", message: "Settings saved successfully." })
    } catch (error) {
      console.warn("save failed", error)
      setInfoModal({
        title: "Save failed",
        message: "Unable to save settings. Check the console for details."
      })
    }
  }

  const clearStorage = async () => {
    return new Promise<void>((resolve, reject) => {
      try {
        chrome.storage.local.clear(() => {
          if (chrome.runtime?.lastError) {
            reject(chrome.runtime.lastError)
          } else {
            resolve()
          }
        })
      } catch (error) {
        reject(error)
      }
      try {
        // set default settings after clearing
        chrome.storage.local.set(DEFAULT_SETTINGS, () => {
          if (chrome.runtime?.lastError) {
            console.warn(
              "storage.set error, press save in popup to fix",
              chrome.runtime.lastError
            )
          }
        })
      } catch (error) {}
    })
  }

  return (
    <div className="popup-root w-[360px] max-h-[560px] overflow-hidden bg-[var(--card-bg-color)] text-[var(--page-fg-color)]">
      <Header />

      <div className="px-3 pt-2 pb-3">
        <Tabs
          value={tab}
          onChange={(next) => setTab(next as TabKey)}
          options={[
            { label: "Basic", value: "basic" as const },
            { label: "Advanced", value: "advanced" as const },
            ...(process.env.NODE_ENV === "development"
              ? [{ label: "Dev", value: "dev" as const }]
              : [])
          ]}
        />
      </div>

      <Divider />

      <div className="px-3 pb-3">
        {!loaded ? (
          <Skeleton />
        ) : (
          <div className="max-h-[400px] overflow-auto pr-1 content-scroll">
            {tab === "basic" && (
              <BasicTab settings={settings} onChange={updateSetting} />
            )}
            {tab === "advanced" && (
              <AdvancedTab onResetDashboard={restoreDashboardLayout} />
            )}
            {tab === "dev" && process.env.NODE_ENV === "development" && (
              <DevTab
                onClearStorage={clearStorage}
                onClearCalendarCache={clearCalendarCache}
              />
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-[var(--page-fg-color-alt)]">
            Settings save automatically
          </span>
          <div className="flex gap-2">
            <Button kind="ghost" onClick={resetUI}>
              Reset (UI)
            </Button>
            <Button onClick={handleSave}>Save</Button>
          </div>
        </div>
      </div>

      {infoModal && (
        <MessageModal
          open
          title={infoModal.title}
          onClose={closeModal}
          actions={[{ label: "Close", onClick: closeModal }]}>
          <p className="text-sm text-[var(--page-fg-color-alt)]">
            {infoModal.message}
          </p>
        </MessageModal>
      )}
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-3 px-3 py-3 border-b border-[var(--page-border-color)] bg-[var(--card-header-bg-color)]">
      <img
        src="/assets/images/logo-128.png"
        alt="Logo"
        className="h-7 w-7 rounded-md"
      />
      <div className="flex min-w-0 flex-col">
        <h1 className="text-sm font-semibold tracking-wide">
          Extension Settings
        </h1>
        <p className="text-xs text-[var(--page-fg-color-alt)]">
          Minimal • Modern • Fast
        </p>
      </div>
    </div>
  )
}
