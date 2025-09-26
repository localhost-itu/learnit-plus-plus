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
import type { DateInput, EventInput } from "@fullcalendar/core"

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

// Fetch events from Firestore, caching results for 5 minutes
export const getCachedScrollbarEvents = createCachedFetcher<
  { start: Date; end: Date },
  EventInput[]
>({
  source: "scrollbar",
  ttlMs: 12 * 60 * 60 * 1000, // 12 hours
  staleWhileRevalidateMs: 24 * 60 * 60 * 1000, // 24 hours
  buildKey: ({ start, end }) => {
    return `${start.toISOString().slice(0, 10)}_${end
      .toISOString()
      .slice(0, 10)}`
  },
  fetcher: async ({ start, end }) => {
    return getScrollbarEvents()
  },
  storage: "sessionStorage",
  maxEntries: 20 // only keep 20 entries in persistent storage
})

export async function getScrollbarEvents(from: Date = new Date()): Promise<EventInput[]> {
  const eventsCollection = collection(db, "env/prod/events")
  const oneDayAgo = Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
  const eventsQuery = query(eventsCollection, where("start", ">=", oneDayAgo))

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

  return newEvents.map((event) => {
    return {
      title: event.displayName,
      start: event.start.toDate(),
      end: event.end.toDate(),
      url: "https://www.erdetfredag.dk/"
    }
  })
}
