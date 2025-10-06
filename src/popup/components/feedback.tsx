import React, { useEffect } from "react"

import { Button } from "./controls"

export function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      <div className="h-20 rounded-xl bg-[var(--lpp-gray-700)]/60" />
      <div className="h-32 rounded-xl bg-[var(--lpp-gray-700)]/60" />
    </div>
  )
}

export interface ModalAction {
  label: string
  onClick: () => void
  kind?: "primary" | "ghost"
}

export interface MessageModalProps {
  open: boolean
  title?: string
  children?: React.ReactNode
  onClose?: () => void
  actions?: ModalAction[]
}

export function MessageModal({
  open,
  title,
  children,
  onClose,
  actions
}: MessageModalProps) {
  useEffect(() => {
    if (!open) return
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.()
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => onClose?.()}
        aria-hidden="true"
      />
      <div
        className="relative z-10 w-[320px] max-w-[92%] rounded-lg border p-4 shadow-xl
                   bg-[var(--card-bg-color)] border-[var(--card-border-color)] text-[var(--page-fg-color)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-semibold">{title}</h3>}
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => onClose?.()}
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md
                       text-[var(--page-fg-color-alt)] hover:bg-[var(--field-bg-color)]">
            ✕
          </button>
        </div>

        <div className="mt-3 text-sm text-[var(--page-fg-color-alt)]">
          {children}
        </div>

        {actions && actions.length > 0 && (
          <div className="mt-4 flex justify-end gap-2">
            {actions.map((action, index) => (
              <Button
                key={`${action.label}-${index}`}
                kind={action.kind ?? "primary"}
                onClick={() => {
                  action.onClick()
                }}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
