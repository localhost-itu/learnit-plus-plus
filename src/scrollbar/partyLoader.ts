import type { EventInput } from "@fullcalendar/core"
import { initializeApp } from "firebase/app"
import {
  collection,
  getDocs,
  getFirestore,
  query,
  Timestamp,
  where
} from "firebase/firestore/lite"

import { createCachedFetcher } from "~components/calendar/eventsources/cache"

// Firebase config for "scrollweb" project
// (public info, safe to expose in client code)
const firebaseConfig = {
  apiKey: "AIzaSyAyNN_bwmKNBIjigrcQf9cLpO58DfKb7lY",
  authDomain: "scrollweb-cc9b4.firebaseapp.com",
  projectId: "scrollweb-cc9b4",
  appId: "1:415080604113:web:5f1d71e08f587b06d200f0",
  measurementId: "G-2WJV2KL9PG",
  storageBucket: "scrollweb-cc9b4.appspot.com",
  databaseURL: "https://scrollweb-cc9b4.firebaseio.com/",
  messagingSenderId: "415080604113"
}

const app = initializeApp(firebaseConfig)
const db = getFirestore(app)

// Fetch events from Firestore, caching results for 12 hours
export const getCachedScrollbarEvents = createCachedFetcher({
  source: "scrollbar",
  ttlMs: 12 * 60 * 60 * 1000, // 12 hours
  staleWhileRevalidateMs: 24 * 60 * 60 * 1000, // 24 hours
  grouping: "week",
  storage: "sessionStorage",
  maxEntries: 20,
  fetcher: ({ start, end }) => getScrollbarEvents(start, end)
})

export async function getScrollbarEvents(
  from: Date = new Date(),
  to: Date = new Date()
): Promise<EventInput[]> {
  const eventsCollection = collection(db, "env/prod/events")
  const fromMonthStart = new Date(from.getFullYear(), from.getMonth(), 1)
  const afterToMonth = new Date(to.getFullYear(),to.getMonth() + 1, 1)

  const startTs = Timestamp.fromDate(fromMonthStart)
  const endTs = Timestamp.fromDate(afterToMonth)

  const eventsQuery = query(
    eventsCollection,
    where("start", ">=", startTs),
    where("start", "<", endTs)
  )

  const querySnapshot = await getDocs(eventsQuery)

  interface EventDocument {
    start: Timestamp
    end: Timestamp
    where: string
    displayName: string
    description: string
    published: boolean
  }

  const newEvents: EventDocument[] = querySnapshot.docs.map(
    (doc) => doc.data() as EventDocument
  )

  console.log("Scrollbar events", newEvents)

  return newEvents
    .filter((event) => event.published)
    .map((event) => ({
      id: `${event.start.toMillis()}-${event.displayName}`,
      title: event.displayName,
      start: event.start.toDate().toISOString(),
      end: event.end.toDate().toISOString(),
      url: "https://www.erdetfredag.dk/"
    }))
}
