import React from "react"

import { DarkModeState, defaultTheme, themes } from "~/styles/main"

import { Segmented, Select, Switch } from "../components/controls"
import { FormRow, SectionCard } from "../components/layout"
import type { Settings } from "../hooks/useSettings"

interface BasicTabProps {
  settings: Settings
  onChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void
}

export default function BasicTab({ settings, onChange }: BasicTabProps) {
  const themeInfo = themes[settings.theme] ?? themes[defaultTheme]
  return (
    <SectionCard title="Basic settings" subtitle="Everyday controls">
      <FormRow label="Theme" hint="Pick a predefined theme">
        <Select
          value={settings.theme}
          onChange={(value) => onChange("theme", value)}
          options={Object.keys(themes).map((t) => ({ label: t, value: t }))}
        />
      </FormRow>
      {themeInfo.darkModeState === DarkModeState.OPTIONAL && (
        <FormRow label="Enable dark mode" hint="If supported by theme">
          <Switch
            checked={settings.darkMode}
            onChange={(value) => onChange("darkMode", value)}
          />
        </FormRow>
      )}
      <FormRow label="Open links in new tab" hint="Control target behavior">
        <Segmented
          value={settings.moreTargetBlank}
          onChange={(value) => onChange("moreTargetBlank", value)}
          options={[
            { label: "Off", value: "off" },
            { label: "External", value: "external" },
            { label: "All", value: "all" }
          ]}
        />
      </FormRow>
    </SectionCard>
  )
}
