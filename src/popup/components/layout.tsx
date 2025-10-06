import React, { useId } from "react"

type SectionTone = "default" | "subtle"

interface SectionCardProps {
  title: string
  subtitle?: string
  tone?: SectionTone
  children: React.ReactNode
}

export function SectionCard({
  title,
  subtitle,
  tone = "default",
  children
}: SectionCardProps) {
  const toneClasses =
    tone === "default"
      ? "bg-[var(--card-bg-color)] border-[var(--card-border-color)]"
      : "bg-[var(--card-sub-bg-color)] border-[color-mix(in_srgb,var(--card-border-color),#fff_5%)]"

  return (
    <section className={`mb-3 rounded-xl border p-3 ${toneClasses}`}>
      <div className="mb-2">
        <h2 className="text-[13px] font-semibold">{title}</h2>
        {subtitle && (
          <p className="text-xs text-[var(--page-fg-color-alt)]">{subtitle}</p>
        )}
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  )
}

interface FormRowProps {
  label: string
  hint?: string
  children: React.ReactNode
}

export function FormRow({ label, hint, children }: FormRowProps) {
  const id = useId()
  let childNode = children
  if (React.isValidElement(children)) {
    const element = children as React.ReactElement<{ id?: string }>
    childNode = element.props.id ? element : React.cloneElement(element, { id })
  }

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block text-xs font-medium">
          {label}
        </label>
        {hint && (
          <p className="text-xs text-[var(--page-fg-color-alt)]">{hint}</p>
        )}
      </div>
      <div className="shrink-0">{childNode}</div>
    </div>
  )
}

type TabsOption<T extends string> = { label: string; value: T }

interface TabsProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<TabsOption<T>>
}

export function Tabs<T extends string>({
  value,
  onChange,
  options
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-xl bg-[var(--field-bg-color)] p-1 border border-[var(--field-border-color)]">
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value as string}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.value)}
            className={`
              relative px-3 py-1.5 text-xs font-medium rounded-lg
              transition-colors
              ${
                selected
                  ? "bg-gradient-to-tr from-[var(--lpp-blue)] to-[var(--lpp-blue-darker)] text-black"
                  : "text-[var(--page-fg-color-alt)] hover:text-[var(--page-fg-color)]"
              }
            `}>
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

export function Divider() {
  return (
    <div className="px-3 pb-3">
      <div className="h-[1px] w-full rounded-full bg-[var(--page-border-color)] opacity-60" />
    </div>
  )
}
