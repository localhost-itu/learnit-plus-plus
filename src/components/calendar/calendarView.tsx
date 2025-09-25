import type { DateInput, EventContentArg, EventInput } from "@fullcalendar/core"
import dayGridPlugin from "@fullcalendar/daygrid"
import iCalendarPlugin from "@fullcalendar/icalendar"
import FullCalendar from "@fullcalendar/react"
import timeGridPlugin from "@fullcalendar/timegrid"
import { useEffect, useRef, useState } from "react"

import { getScrollbarEvents } from "~scrollbar/partyLoader"

import { useCalendarSettings } from "./calendarHooks"
import { formatEvent } from "./EventFormatter"

const studentCouncilEvents = {
  url: "https://studentcouncil.dk/subscribe/all.ics",
  format: "ics",
  id: "studentcouncil",
  color: "#EE4444"
}

function renderEventContent(eventInfo: EventContentArg) {
  const result = formatEvent(eventInfo.event)
  return (
    result.length > 0 && (
      <>
        <b>{result.join(" - ")}</b>
        <br />
        <i>{eventInfo.timeText}</i>
      </>
    )
  )
}

const getConstrastColor = (hex: string) => {
  if (hex.startsWith("#")) {
    hex = hex.slice(1)
  }
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("")
  }
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? "black" : "white"
}

const isDateInputOutsideSlot = (
  start: DateInput,
  end: DateInput,
  slotMinTime: string,
  slotMaxTime: string
) => {
  const startDate = new Date(start.toString())
  const endDate = new Date(end.toString())
  const slotMin = new Date(startDate.toDateString() + " " + slotMinTime)
  const slotMax = new Date(startDate.toDateString() + " " + slotMaxTime)
  const outsideSlot =
    (startDate < slotMin && endDate < slotMin) ||
    (startDate > slotMax && endDate > slotMax)
  return outsideSlot
}


// usefull https://docs.moodle.org/dev/Web_service_API_functions

// Utility: get sesskey
function getSesskey() {
  return window.M?.cfg?.sesskey || new URL(
		document.querySelector("a[href*='login/logout.php']").href
	).searchParams.get("sesskey");
}

// Fetch upcoming events within a date window
// Limit to 25 by default to avoid overload (must be between 1 and 50)
async function fetchMoodleUpcomingSubmissions({ from, to, limit = 25 }: { from?: Date; to?: Date; limit?: number } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const timesortfrom = Math.floor((from ? from.getTime() : Date.now() - 5 * 86400000) / 1000); // default to 5 days back
  const timesortto = Math.floor((to ? to.getTime() : Date.now() + 60 * 86400000) / 1000); // default to 60 days ahead
  const sesskey = getSesskey();
  if (!sesskey) throw new Error("sesskey not found");
  console.debug(`Fetching Moodle events from ${new Date(timesortfrom * 1000).toISOString()} to ${new Date(timesortto * 1000).toISOString()} (sesskey=${sesskey})`);

  const body = JSON.stringify([
    {
      index: 0,
      methodname: "core_calendar_get_action_events_by_timesort",
      args: {
        limitnum: limit,
        timesortfrom: now - (24*3600*12), // now - 5 days
        // timesortto: now + 30*24*3600,
        // limittononsuspendedevents: true,
      },
    }
  ]);

  const res = await fetch(`/lib/ajax/service.php?sesskey=${encodeURIComponent(sesskey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body,
  });
  const data = await res.json();
  if (!Array.isArray(data) || data[0]?.error) {
    throw new Error(data[0]?.exception?.message || "WS error");
  }
  console.debug(`Fetched ${data[0].data.events.length} Moodle events`);
  console.debug(data[0].data.events);
  return data[0].data.events; // raw Moodle events
}

async function fetchMoodleMonth(year: Number, month: Number) {
  // grab sesskey from logout link or M.cfg
  const sesskey = getSesskey();
  if (!sesskey) throw new Error("sesskey not found");

  const body = JSON.stringify([
    {
      index: 0,
      methodname: "core_calendar_get_calendar_monthly_view",
      args: {
        year,      // e.g. 2025
        month,     // 1-12
        courseid: 0,
        categoryid: 0,
        includenavigation: false
      }
    }
  ]);

  const res = await fetch(`/lib/ajax/service.php?sesskey=${sesskey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body
  });

  const data = await res.json();
  if (!Array.isArray(data) || data[0]?.error) {
    throw new Error(data[0]?.exception?.message || "Moodle WS error");
  }
  return data[0].data; // contains eventsbyday, month, year etc.
}

// Map Moodle raw events to FullCalendar event objects
function mapMoodleSubmissionsToFullCalendar(rawEvents) {
  return rawEvents.map((e) => {
    // Moodle event shape varies slightly by function; handle common fields
    const id = String(e.id ?? e.event?.id ?? e.instance ?? Math.random());
    const name = e.name ?? e.eventname ?? e.description?.name ?? "Event";
    const url = e.url ?? e.action?.url ?? e.viewurl ?? null;

    // Decide start/end
    const startSec =
      e.timestart ??
      e.timesort ??
      e.timeusermidnight ??
      e.event?.timestart ??
      e.starttime ??
      null;

    const duration = e.timeduration ?? e.event?.timeduration ?? 0;
    const endSec = duration > 0 ? startSec + duration : (e.timeend ?? null);

    // All-day heuristic: Moodle doesn't have true all-day; treat 00:00 with no duration as allDay
    // const isAllDay =
    //   !!e.isallday ??
    //   (duration === 0 && startSec != null && new Date(startSec * 1000).getHours() === 0);

    return {
      // id,
      title: name,
      start: startSec ? new Date(startSec * 1000).toISOString() : undefined,
      end: endSec ? new Date(endSec * 1000).toISOString() : undefined,
      // allDay: !!isAllDay,
      url: url || undefined,
      // extendedProps: {
      //   courseid: e.course?.id ?? e.courseid ?? null,
      //   module: e.modulename ?? null,
      //   type: e.eventtype ?? e.category ?? null,
      //   raw: e, // keep raw for debugging/tooltips
      // },
    };
  });
}

function mapMonthlyToFullCalendar(monthData) {
  const out = [];
  const days = monthData?.weeks.flatMap(week => week.days) || [];

  for (const day of days) {
    const d = new Date(day.timestamp); // local midnight
    for (const ev of day.events || []) {
      const id = String(ev.id ?? ev.instance ?? Math.random());
      const name = ev.name ?? ev.eventname ?? "Event";

      const startSec = ev.timestart ?? ev.timesort ?? null;
      const duration = ev.timeduration ?? 0;
      const endSec = duration > 0 ? startSec + duration : null;

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
          raw: ev,
        },
      });
    }
  }
  return out;
}

const CalendarView = ({ toggleView }: { toggleView: () => void }) => {
  const [settings, _setSettings, { isLoading: isLoadingSettings }] =
    useCalendarSettings()
  const calendarRef = useRef<FullCalendar>(null)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  useEffect(() => {
    let tmpSettingsLoaded = !isLoadingSettings
    if (settingsLoaded) {
      if (settings) {
        tmpSettingsLoaded &&= settings.fromLocalStorage
        tmpSettingsLoaded &&=
          settings.icalSources.length > 0 || settings.showStudentCouncil
      } else {
        tmpSettingsLoaded = false
      }
    }
    setSettingsLoaded(tmpSettingsLoaded)
  }, [settings, isLoadingSettings])

  return (
    <>
      {settingsLoaded &&
        (settings.icalSources.length == 0 &&
        !settings.showScrollbar &&
        !settings.showStudentCouncil ? (
          <div className="calendar-missing-setup text-center">
            <h3>No calendars enabled</h3>
            <p>
              Go the settings view to add calendar subscriptions to your
              calendar
            </p>
            <p>
              <a
                href="https://github.com/PhilipFlyvholm/learnit-plus-plus/wiki/The-Calendar-Component"
                target="_blank">
                Guide for setup
              </a>
            </p>
            <button
              className="btn btn-outline-secondary my-2"
              onClick={toggleView}>
              Open settings
            </button>
          </div>
        ) : (
          <FullCalendar
            slotDuration={settings.slotduration}
            slotMinTime={settings.slotMinTime}
            slotMaxTime={settings.slotMaxTime}
            ref={calendarRef}
            slotLabelFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            }}
            eventTimeFormat={{
              hour: "2-digit",
              minute: "2-digit",
              hour12: false
            }}
            dayHeaderFormat={{
              weekday: "short",
              day: "2-digit",
              month: "2-digit"
            }}
            locale="en-GB"
            businessHours={{
              daysOfWeek: [1, 2, 3, 4, 5],
              startTime: "08:00",
              endTime: "18:00"
            }}
            plugins={[dayGridPlugin, timeGridPlugin, iCalendarPlugin]}
            nowIndicator={true}
            initialView={settings.initialview}
            eventSources={[
              ...settings.icalSources.map((source) => {
                if (!source.textColor && source.color) {
                  source.textColor = getConstrastColor(source.color)
                }
                source.eventDataTransform = (input: EventInput) => {
                  if (
                    isDateInputOutsideSlot(
                      input.start,
                      input.end,
                      settings.slotMinTime,
                      settings.slotMaxTime
                    )
                  ) {
                    input.allDay = true
                  }
                  if (
                    source.assignmentsOnly &&
                    source.url.startsWith(
                      "https://learnit.itu.dk/calendar/export_execute.php"
                    )
                  ) {
                    if (
                      input.title.includes("Lecture") ||
                      input.title.includes("Exercise") ||
                      input.title.includes("Other")
                    ) {
                      return false
                    }
                    return input
                  }
                }
                return source
              }),
              settings.showStudentCouncil && studentCouncilEvents,
              settings.showScrollbar && {
                events: async function (
                  info,
                  successCallback,
                  failureCallback
                ) {
                  successCallback(await getScrollbarEvents())
                },
                color: "#fff319cc",
                textColor: getConstrastColor("#fff319cc")
              },
              {
                events: async (fetchInfo, success, failure) => {
                  try {
                  //   // fetchInfo.start/end are Date objects for current view
                  //   const raw = await fetchMoodleUpcomingSubmissions
                  // ({
                  //     from: fetchInfo.start,
                  //     to: fetchInfo.end,
                  //     limit: 25,
                  //   });
                  //   const events = mapMoodleSubmissionsToFullCalendar(raw);
                  //   success(events);
                    const y = fetchInfo.start.getFullYear();
                    const m = fetchInfo.start.getMonth() + 1; // JS months 0–11 → Moodle needs 1–12
                    const monthData = await fetchMoodleMonth(y, m);
                    const events = mapMonthlyToFullCalendar(monthData);
                    success(events);
                  } catch (err) {
                    console.error(err);
                    failure(err);
                  }
                },
              }
            ]}
            eventContent={renderEventContent}
            firstDay={1} // Monday
            weekNumbers={true}
            weekends={settings.showWeekends}
            allDaySlot={
              settings.slotMinTime === "00:00:00" &&
              settings.slotMaxTime === "23:59:59"
                ? false
                : undefined
            }
            height={"auto"}
            allDayText=""
            scrollTime={"08:00:00"}
            eventClick={(info) => {
              info.jsEvent.preventDefault() // don't let the browser navigate
              if (info.event.url) {
                const url = info.event.url.startsWith("http")
                  ? info.event.url
                  : "https://" + info.event.url
                window.open(url)
              }
            }}
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay"
            }}
          />
        ))}
    </>
  )
}
export default CalendarView
