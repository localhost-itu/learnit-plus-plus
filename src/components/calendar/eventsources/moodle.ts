// Centralized helpers for fetching and mapping Moodle events via AJAX
// Modern, readable utilities intended for use by calendar components

import type { DateInput, EventInput } from "@fullcalendar/core"

// Utility: robustly get sesskey from Moodle
export function getSesskey(): string | null {
  const viaCfg = (window as any)?.M?.cfg?.sesskey as string | undefined
  if (viaCfg) return viaCfg
  try {
    const logoutLink = document.querySelector(
      "a[href*='login/logout.php']"
    ) as HTMLAnchorElement | null
    if (!logoutLink) return null
    const url = new URL(logoutLink.href)
    return url.searchParams.get("sesskey")
  } catch {
    return null
  }
}

// Fetch upcoming events within a date window
// Limit to 25 by default to avoid overload (must be between 1 and 50)
export async function fetchMoodleUpcomingSubmissions({
  from,
  to,
  limit = 25
}: { from?: Date; to?: Date; limit?: number } = {}) {
  const now = Math.floor(Date.now() / 1000)
  const timesortfrom = Math.floor(
    (from ? from.getTime() : Date.now() - 5 * 86400000) / 1000
  ) // default to 5 days back
  const timesortto = Math.floor(
    (to ? to.getTime() : Date.now() + 60 * 86400000) / 1000
  ) // default to 60 days ahead
  const sesskey = getSesskey()
  if (!sesskey) throw new Error("sesskey not found")

  const body = JSON.stringify([
    {
      index: 0,
      methodname: "core_calendar_get_action_events_by_timesort",
      args: {
        limitnum: limit,
        timesortfrom: now - 24 * 3600 * 12 // now - ~12 days (kept from previous logic)
        // timesortto: now + 30*24*3600,
        // limittononsuspendedevents: true,
      }
    }
  ])

  const res = await fetch(
    `/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body
    }
  )
  const data = await res.json()
  if (!Array.isArray(data) || (data[0] as any)?.error) {
    throw new Error((data[0] as any)?.exception?.message || "WS error")
  }
  return (data[0] as any).data.events // raw Moodle events
}

// Fetch a month's calendar grid — includes events by day
export async function fetchMoodleMonth(year: number, month: number) {
  const sesskey = getSesskey()
  if (!sesskey) throw new Error("sesskey not found")

  const body = JSON.stringify([
    {
      index: 0,
      methodname: "core_calendar_get_calendar_monthly_view",
      args: {
        year, // e.g., 2025
        month, // 1-12
        courseid: 0,
        categoryid: 0,
        includenavigation: false
      }
    }
  ])

  const res = await fetch(
    `/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body
    }
  )

  const data = await res.json()
  if (!Array.isArray(data) || (data[0] as any)?.error) {
    throw new Error((data[0] as any)?.exception?.message || "Moodle WS error")
  }
  return (data[0] as any).data // contains eventsbyday, month, year, etc.
}

// Map Moodle raw events from "action events" to FullCalendar EventInput
export function mapMoodleSubmissionsToFullCalendar(
  rawEvents: any[]
): EventInput[] {
  return rawEvents.map((e) => {
    const id = String(e.id ?? e.event?.id ?? e.instance ?? Math.random())
    const name = e.name ?? e.eventname ?? e.description?.name ?? "Event"
    const url = e.url ?? e.action?.url ?? e.viewurl ?? null

    const startSec =
      e.timestart ??
      e.timesort ??
      e.timeusermidnight ??
      e.event?.timestart ??
      e.starttime ??
      null

    const duration = e.timeduration ?? e.event?.timeduration ?? 0
    const endSec = duration > 0 ? startSec + duration : (e.timeend ?? null)

    return {
      id,
      title: name,
      start: startSec ? new Date(startSec * 1000).toISOString() : undefined,
      end: endSec ? new Date(endSec * 1000).toISOString() : undefined,
      url: url || undefined,
      
    }
  })
}

// Map monthly view data to FullCalendar EventInput
export function mapMonthlyToFullCalendar(monthData: any): EventInput[] {
  const out: EventInput[] = []
  const days = monthData?.weeks?.flatMap((week: any) => week.days) || []

  for (const day of days) {
    const d = new Date(day.timestamp) // local midnight
    for (const ev of day.events || []) {
      const id = String(ev.id ?? ev.instance ?? Math.random())
      const name = ev.name ?? ev.eventname ?? "Event"

      const startSec = ev.timestart ?? ev.timesort ?? null
      const duration = ev.timeduration ?? 0
      const endSec = duration > 0 ? startSec + duration : null

      out.push({
        id,
        title: name,
        start: startSec
          ? new Date(startSec * 1000).toISOString()
          : d.toISOString(),
        end: endSec ? new Date(endSec * 1000).toISOString() : undefined,
        allDay:
          duration === 0 &&
          startSec != null &&
          new Date(startSec * 1000).getHours() === 0,
        url: ev.url ?? ev.viewurl ?? undefined,
        extendedProps: {
          courseid: ev.courseid ?? ev.course?.id ?? null,
          type: ev.eventtype ?? null,
          raw: ev
        }
      })
    }
  }
  return out
}

// Utility: determine if a date range is outside configured slot times
export function isDateInputOutsideSlot(
  start: DateInput,
  end: DateInput,
  slotMinTime: string,
  slotMaxTime: string
) {
  const startDate = new Date(start.toString())
  const endDate = new Date(end.toString())
  const slotMin = new Date(startDate.toDateString() + " " + slotMinTime)
  const slotMax = new Date(startDate.toDateString() + " " + slotMaxTime)
  const outsideSlot =
    (startDate < slotMin && endDate < slotMin) ||
    (startDate > slotMax && endDate > slotMax)
  return outsideSlot
}
