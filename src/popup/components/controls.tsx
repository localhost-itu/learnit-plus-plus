import React from "react"

type ButtonKind = "primary" | "ghost"

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  kind?: ButtonKind
  type?: "button" | "submit" | "reset"
}

export function Button({
  children,
  onClick,
  kind = "primary",
  type = "button"
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs " +
    "font-semibold transition-colors focus:outline-none " +
    "focus:ring-2 focus:ring-[var(--link-focus-color)]"

  const palette =
    kind === "ghost"
      ? "bg-[var(--button-unnoticed-bg-color)] text-[var(--button-unnoticed-fg-color)] hover:bg-[var(--lpp-gray-700)]"
      : "bg-[var(--button-noticed-bg-color)] text-black hover:brightness-110"

  return (
    <button
      type={type}
      className={`${baseStyles} ${palette}`}
      onClick={onClick}>
      {children}
    </button>
  )
}

interface SwitchProps {
  id?: string
  checked: boolean
  onChange: (value: boolean) => void
}

export function Switch({ id, checked, onChange }: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-10 items-center rounded-full
        border transition-colors focus:outline-none focus:ring-2
        focus:ring-[var(--link-focus-color)]
        ${
          checked
            ? "bg-[var(--button-noticed-bg-color)] border-transparent"
            : "bg-[var(--field-bg-color)] border-[var(--field-border-color)]"
        }
      `}>
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? "translate-x-4" : "translate-x-1"}
        `}
      />
    </button>
  )
}

interface SelectOption {
  label: string
  value: string
}

interface SelectProps {
  id?: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export function Select({ id, value, onChange, options }: SelectProps) {
  return (
    <div
      className="
        relative inline-flex items-center rounded-lg border
        border-[var(--field-border-color)]
        bg-[var(--field-bg-color)]
      ">
      <select
        id={id}
        className="
          appearance-none bg-transparent px-3 py-1.5 pr-7 text-xs
          text-[var(--page-fg-color)] focus:outline-none focus:ring-2
          focus:ring-[var(--link-focus-color)] rounded-lg
        "
        value={value}
        onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            className="bg-[var(--popupmenu-bg-color)]">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[var(--page-fg-color-alt)]" />
    </div>
  )
}

type SegmentedOption<T extends string> = { label: string; value: T }

interface SegmentedProps<T extends string> {
  value: T
  onChange: (value: T) => void
  options: Array<SegmentedOption<T>>
}

export function Segmented<T extends string>({
  value,
  onChange,
  options
}: SegmentedProps<T>) {
  return (
    <div
      className="
        inline-flex rounded-lg bg-[var(--field-bg-color)]
        p-0.5 border border-[var(--field-border-color)]
      ">
      {options.map((option) => {
        const active = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-md
              transition-colors
              ${
                active
                  ? "bg-[var(--button-noticed-bg-color)] text-black"
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

interface TextAreaProps {
  id?: string
  value: string
  placeholder?: string
  onChange: (value: string) => void
}

export function TextArea({ id, value, placeholder, onChange }: TextAreaProps) {
  return (
    <textarea
      id={id}
      className="
        w-[240px] h-[120px] rounded-lg border
        border-[var(--field-border-color)]
        bg-[var(--field-bg-color)]
        px-3 py-2 text-xs font-mono leading-5
        text-[var(--page-fg-color)]
        placeholder:text-[var(--lpp-gray-blue-300)]
        focus:outline-none focus:ring-2
        focus:ring-[var(--link-focus-color)]
      "
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      spellCheck={false}
    />
  )
}

export function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true">
      <path
        d="M7 10l5 5 5-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
