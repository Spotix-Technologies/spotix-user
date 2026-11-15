/**
 * App status flags — all driven by env vars.
 *
 *   NEXT_PUBLIC_IS_MAINTENANCE   "1" → whole app is replaced by the maintenance screen
 *   NEXT_PUBLIC_MAINTENANCE_URL  link for the "Check live status" button (e.g. your Better Stack status page)
 *
 *   NEXT_PUBLIC_IS_INCIDENT      "1" → full-width incident banner at the top of every page
 *   NEXT_PUBLIC_INCIDENT_URL     where the banner links to (opens in a new tab)
 *
 *   NEXT_PUBLIC_IS_SNOW          "1" → falling snow
 *   NEXT_PUBLIC_IS_HAUNTED       "1" → cobwebs, a dangling spider and watching eyes
 *   NEXT_PUBLIC_IS_DOOMFIRE      "1" → react-halloween <DoomFire />: pixel flames along the bottom edge
 *   NEXT_PUBLIC_IS_GHOSTS        "1" → react-halloween <Haunted />: glowing ghost orb, ghosts fly out on hover
 *   NEXT_PUBLIC_IS_LIGHTSOUT     "1" → react-halloween <LightsOut />: site goes dark, spotlight follows the cursor (mouse devices only)
 *
 * NEXT_PUBLIC_* values are inlined at build time, so changing one means
 * redeploying / rebuilding. Each must be read as a literal
 * `process.env.NEXT_PUBLIC_X` for Next to inline it — don't refactor to dynamic keys.
 */

const isOn = (value: string | undefined) => value?.trim() === "1"

/** Only ever link to http(s) — never `javascript:` or anything odd from an env typo. */
const safeUrl = (value: string | undefined) => {
  const url = value?.trim() ?? ""
  return /^https?:\/\//i.test(url) ? url : ""
}

export const statusConfig = {
  isMaintenance: isOn(process.env.NEXT_PUBLIC_IS_MAINTENANCE),
  maintenanceUrl: safeUrl(process.env.NEXT_PUBLIC_MAINTENANCE_URL),
  isIncident: isOn(process.env.NEXT_PUBLIC_IS_INCIDENT),
  incidentUrl: safeUrl(process.env.NEXT_PUBLIC_INCIDENT_URL),
  isSnow: isOn(process.env.NEXT_PUBLIC_IS_SNOW),
  isHaunted: isOn(process.env.NEXT_PUBLIC_IS_HAUNTED),
  isDoomFire: isOn(process.env.NEXT_PUBLIC_IS_DOOMFIRE),
  isGhosts: isOn(process.env.NEXT_PUBLIC_IS_GHOSTS),
  isLightsOut: isOn(process.env.NEXT_PUBLIC_IS_LIGHTSOUT),
}
