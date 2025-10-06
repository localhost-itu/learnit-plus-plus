import React, { useState } from "react"

import { Button } from "../components/controls"
import { MessageModal } from "../components/feedback"
import { FormRow, SectionCard } from "../components/layout"

interface DevTabProps {
  onClearStorage: () => Promise<void>
  onClearCalendarCache: () => Promise<void>
}

type ModalState =
  | { type: "confirm"; action: "storage" | "cache" }
  | { type: "result"; message: string }
  | null

export default function DevTab({
  onClearStorage,
  onClearCalendarCache
}: DevTabProps) {
  const [modal, setModal] = useState<ModalState>(null)

  const requestConfirm = (action: "storage" | "cache") =>
    setModal({ type: "confirm", action })

  const closeModal = () => setModal(null)

  const performAction = async () => {
    if (!modal || modal.type !== "confirm") return
    try {
      if (modal.action === "storage") {
        await onClearStorage()
        setModal({ type: "result", message: "Local storage cleared." })
      } else {
        await onClearCalendarCache()
        setModal({ type: "result", message: "Calendar cache cleared." })
      }
    } catch (error) {
      console.warn("Developer action failed", error)
      setModal({
        type: "result",
        message: "Something went wrong. Check the console for details."
      })
    }
  }

  const renderModal = () => {
    if (!modal) return null
    if (modal.type === "confirm") {
      const labels = {
        storage: {
          title: "Clear storage",
          body: "Clear all chrome.storage.local keys? This cannot be undone."
        },
        cache: {
          title: "Clear calendar cache",
          body: "Remove cached calendar event data? This cannot be undone."
        }
      }
      const copy = labels[modal.action]
      return (
        <MessageModal
          open
          title={copy.title}
          onClose={closeModal}
          actions={[
            { label: "Cancel", onClick: closeModal, kind: "ghost" },
            { label: "Confirm", onClick: performAction }
          ]}>
          <p className="text-sm text-[var(--page-fg-color-alt)]">{copy.body}</p>
        </MessageModal>
      )
    }

    return (
      <MessageModal
        open
        title="Done"
        onClose={closeModal}
        actions={[{ label: "Close", onClick: closeModal }]}>
        <p className="text-sm text-[var(--page-fg-color-alt)]">
          {modal.message}
        </p>
      </MessageModal>
    )
  }

  return (
    <>
      <SectionCard
        title="Developer"
        subtitle="Debug and maintenance"
        tone="subtle">
        <FormRow
          label="Clear local storage"
          hint="Remove every chrome.storage.local key">
          <Button kind="ghost" onClick={() => requestConfirm("storage")}>
            Clear storage
          </Button>
        </FormRow>
        <FormRow
          label="Clear calendar cache"
          hint="Remove cached calendar event data">
          <Button kind="ghost" onClick={() => requestConfirm("cache")}>
            Clear cache
          </Button>
        </FormRow>
      </SectionCard>
      {renderModal()}
    </>
  )
}
