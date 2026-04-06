export type TimeOfDay = "morning" | "afternoon" | "evening"

export interface Greeting {
  language: string
  text: string
}

export function getTimeOfDay(): TimeOfDay {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "morning"
  if (hour >= 12 && hour < 17) return "afternoon"
  return "evening"
}

const greetings: Record<TimeOfDay, Greeting[]> = {
  morning: [
    { language: "Igbo",    text: "Ụtụtụ ọma" },
    { language: "Yoruba",  text: "E kaaro" },
    { language: "Hausa",   text: "Barka da safiya" },
    { language: "Pidgin",  text: "How far" },
    { language: "English", text: "Good morning" },
  ],
  afternoon: [
    { language: "Igbo",    text: "Ndewo" },
    { language: "Yoruba",  text: "E kaasan" },
    { language: "Hausa",   text: "Barka da rana" },
    { language: "Pidgin",  text: "How e dey be" },
    { language: "English", text: "Good afternoon" },
  ],
  evening: [
    { language: "Igbo",    text: "Mgbede ọma" },
    { language: "Yoruba",  text: "Ka a ale" },
    { language: "Hausa",   text: "Barka da yamma" },
    { language: "Pidgin",  text: "How far" },
    { language: "English", text: "Good evening" },
  ],
}

/**
 * Returns a randomly picked greeting for the current time of day,
 * excluding the last index shown to avoid immediate repeats.
 */
export function getRandomGreeting(excludeIndex?: number): {
  greeting: Greeting
  index: number
} {
  const timeOfDay = getTimeOfDay()
  const pool = greetings[timeOfDay]

  let index: number
  do {
    index = Math.floor(Math.random() * pool.length)
  } while (pool.length > 1 && index === excludeIndex)

  return { greeting: pool[index], index }
}

export { greetings }