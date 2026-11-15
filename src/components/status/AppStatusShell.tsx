import type { ReactNode } from "react"
import { statusConfig } from "./config"
import { IncidentBanner } from "./IncidentBanner"
import { MaintenanceScreen } from "./MaintenanceScreen"
import { SeasonalEffects } from "./SeasonalEffects"

interface AppStatusShellProps {
  children: ReactNode
  variant?: "user" | "booker"
}

/**
 * Wrap the app's <body> contents with this in the root layout.
 *
 *  - NEXT_PUBLIC_IS_MAINTENANCE=1 → renders ONLY the maintenance screen. The app
 *    (auth provider, chat widget, pages…) isn't rendered at all, so no data
 *    fetching or redirects fire while you're down.
 *  - NEXT_PUBLIC_IS_INCIDENT=1    → incident banner on top of the normal app.
 *  - NEXT_PUBLIC_IS_SNOW / _HAUNTED / _DOOMFIRE / _GHOSTS / _LIGHTSOUT → cosmetic effects on top of either.
 */
export function AppStatusShell({ children, variant = "user" }: AppStatusShellProps) {
  if (statusConfig.isMaintenance) {
    return (
      <>
        <MaintenanceScreen variant={variant} statusUrl={statusConfig.maintenanceUrl} />
        <SeasonalEffects />
      </>
    )
  }

  return (
    <>
      <IncidentBanner />
      {children}
      <SeasonalEffects />
    </>
  )
}
