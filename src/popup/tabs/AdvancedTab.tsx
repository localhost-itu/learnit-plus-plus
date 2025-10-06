import React, { useState } from "react"

import { Button } from "../components/controls"
import { MessageModal } from "../components/feedback"
import { SectionCard } from "../components/layout"
import type { RestoreResult } from "../hooks/useSettings"

interface AdvancedTabProps {
  onResetDashboard: () => Promise<RestoreResult>
}

export default function AdvancedTab({ onResetDashboard }: AdvancedTabProps) {
  return (
    <SectionCard title="Advanced settings" subtitle="For power users">
      <DangerZone onResetDashboard={onResetDashboard} />
    </SectionCard>
  )
}

interface DangerZoneProps {
  onResetDashboard: () => Promise<RestoreResult>
}

type ModalState =
  | { type: "confirm" }
  | { type: "result"; result: RestoreResult }
  | null

function DangerZone({ onResetDashboard }: DangerZoneProps) {
  const [modalState, setModalState] = useState<ModalState>(null)

  const handleReset = async () => {
    setModalState({ type: "confirm" })
  }

  const performReset = async () => {
    const result = await onResetDashboard()
    setModalState({ type: "result", result })
  }

  const closeModal = () => setModalState(null)

  const renderModal = () => {
    if (!modalState) return null
    if (modalState.type === "confirm") {
      return (
        <MessageModal
          open
          title="Reset dashboard layout"
          onClose={closeModal}
          actions={[
            { label: "Cancel", onClick: closeModal, kind: "ghost" },
            { label: "Reset", onClick: performReset }
          ]}>
          <p className="text-sm text-[var(--page-fg-color-alt)]">
            Are you sure you want to reset the dashboard layout? This action
            cannot be undone.
          </p>
        </MessageModal>
      )
    }

    const resultCopy: Record<RestoreResult, { title: string; body: string }> = {
      restored: {
        title: "Dashboard restored",
        body: "Your dashboard layout has been restored from the backup."
      },
      removed: {
        title: "Dashboard removed",
        body: "The stored dashboard layout entry was removed."
      },
      missing: {
        title: "No backup found",
        body: "No backup layout was available. The current layout entry was removed."
      },
      error: {
        title: "Unable to reset",
        body: "Something went wrong while resetting the dashboard layout."
      }
    }

    const copy = resultCopy[modalState.result]

    return (
      <MessageModal
        open
        title={copy.title}
        onClose={closeModal}
        actions={[{ label: "Close", onClick: closeModal }]}>
        <p className="text-sm text-[var(--page-fg-color-alt)]">{copy.body}</p>
      </MessageModal>
    )
  }

  return (
    <div
      className="
        rounded-lg border border-[var(--card-border-color)]
        bg-[color-mix(in_srgb,var(--lpp-blue),#000_94%)] p-3
      ">
      <div className="mb-2 flex items-center gap-2">
        <WarningIcon className="h-4 w-4 text-[var(--lpp-blue)]" />
        <span className="text-xs font-semibold">Caution</span>
      </div>
      <p className="mb-2 text-xs text-[var(--page-fg-color-alt)]">
        Reset your dashboard layout to the backed-up defaults.
      </p>
      <Button kind="ghost" onClick={handleReset}>
        Reset dashboard layout
      </Button>
      {renderModal()}
    </div>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true">
      <path
        d="M12 3l9 16H3L12 3z"
        stroke="currentColor"
        strokeWidth="1.3"
        fill="none"
      />
      <path
        d="M12 9v4m0 3h.01"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  )
}
