import { getEvents, type EventData } from "./eventLoader"

export async function addStudentConcileEvents() {
  const section = document.createElement("section")
  section.className = "block_sc block card"
  section.setAttribute("role", "region")
  section.setAttribute("data-block", "cohortspecifichtml")

  const div = document.createElement("div")
  div.className = "card-body p-3"
  const header = document.createElement("div")
  header.style.display = "flex"
  header.style.justifyContent = "space-between"
  const h3 = document.createElement("h3")
  h3.id = "instance-118819-header"
  h3.className = "card-title d-inline"
  h3.textContent = "Student Council Events"

  const cardTextDiv = document.createElement("div")
  cardTextDiv.className = "card-text content"
  cardTextDiv.style.display = "grid"
  cardTextDiv.style.gridTemplateColumns = "repeat(2, 1fr)"
  cardTextDiv.style.gap = "10px"
  cardTextDiv.style.paddingTop = "1rem"

  const events = await getEvents()
  if (events.length === 0) {
    const noEvents = document.createElement("div")
    const noEventsHeader = document.createElement("h5")
    noEvents.style.width = "60%"
    noEvents.style.textAlign = "center"
    cardTextDiv.style.alignItems = "center"
    cardTextDiv.style.justifyContent = "center"
    cardTextDiv.style.height = "100%"
    noEvents.style.marginTop = "-47px" // Yes sry for magic value but other methods didnt work
    noEventsHeader.textContent =
      "There are currently no events planned by the student council"
    const extraMesage = document.createElement("p")
    extraMesage.innerHTML =
      "If you believe this is an error then check <a href='https://studentcouncil.dk/events'>https://studentcouncil.dk/events</a>."
    noEvents.appendChild(noEventsHeader)
    noEvents.appendChild(extraMesage)
    cardTextDiv.appendChild(noEvents)
  } else {
    for (const event of events.slice(0, 6)) {
      cardTextDiv.appendChild(getEventDom(event))
    }
  }

  header.appendChild(h3)
  div.appendChild(header)
  div.appendChild(cardTextDiv)

  section.appendChild(div)
  const block_content = document.getElementById("block-region-content")
  if (!block_content) return
  block_content.appendChild(section)
}

function getEventDom(event: EventData) {
  const divCard = document.createElement("div")
  divCard.className = "card dashboard-card"
  divCard.setAttribute("role", "listitem")
  divCard.setAttribute("data-region", "course-content")

  const divCardBody = document.createElement("div")
  divCardBody.className = "card-body pr-1 course-info-container"

  const divTextTruncate = document.createElement("div")
  divTextTruncate.className = "w-100"

  const header = document.createElement("h5")
  header.className = "coursename mr-2"
  header.textContent = event.summary
  header.style.margin = "0"

  const divMuted = document.createElement("div")
  divMuted.className = "text-muted muted d-flex mb-1 justify-content-between"

  const eventDate = document.createElement("span")
  eventDate.className = "text-truncate"
  eventDate.style.marginBottom = "0.5rem"

  const date = new Date(event.dtstart)
  const weekDay = date.toLocaleDateString("en-GB", { weekday: "short" })
  const month = date.toLocaleDateString("en-GB", { month: "short" })
  const time = date.toLocaleTimeString("en-GB", {
    hour: "numeric",
    minute: "numeric"
  })
  const dateString = `${weekDay}, ${date.getDate()}. ${month}. ${time}`

  eventDate.textContent = `${dateString} | ${daysLeftString(date)}`
  const expandedText = document.createElement("div")
  expandedText.className = "expandedText hide-content"
  const description = document.createElement("p")
  description.style.fontSize = "0.8rem"
  if (event.description.endsWith("Read more")) {
    event.description = event.description.substring(
      0,
      event.description.length - 9
    )
  }
  if (event.description.length < 150) {
    description.textContent = event.description
    expandedText.appendChild(description)
  } else {
    description.textContent = event.description.substring(0, 150) + "..."
    const readMoreButton = document.createElement("button")
    readMoreButton.className = "btn btn-custom"
    readMoreButton.textContent = "Read more"
    readMoreButton.addEventListener("click", () => {
      if (expandedText.classList.contains("hide-content")) {
        expandedText.classList.remove("hide-content")
        description.textContent = event.description
        readMoreButton.textContent = "Read less"
      } else {
        expandedText.classList.add("hide-content")
        description.textContent = event.description.substring(0, 150) + "..."
        readMoreButton.textContent = "Read more"
      }
    })
    expandedText.appendChild(description)
    expandedText.appendChild(readMoreButton)
  }
  divMuted.appendChild(expandedText)
  divMuted.appendChild(eventDate)
  divTextTruncate.appendChild(header)
  divTextTruncate.appendChild(divMuted)
  divCardBody.appendChild(divTextTruncate)
  divCard.appendChild(divCardBody)
  return divCard
}

function daysLeftString(date: Date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  date.setHours(0, 0, 0, 0)

  const daysLeft = Math.round(
    (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysLeft === 0) return "Its TODAY!! 🎉🎉🎉"
  if (daysLeft === 1) return "Tomorrow 👀"

  return `In ${daysLeft} days`
}
