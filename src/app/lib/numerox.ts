// app/lib/numerox.ts
//
// Server-side Numerox client for spotix-user. Track-only here — this app
// never reads funnel stats back (that's spotix-booker's Observability
// tab), so no `authorizer` and the default `maxDaysFetch` is irrelevant;
// nothing in this app calls `numerox.stats`.
//
// Requires the `numerox` package (see its own README for setup — it's
// not published to a registry, so it's added as a local/workspace
// dependency: `"numerox": "file:../numerox"` in package.json, sitting
// alongside this repo). `firebase-admin` is already a dependency here.

import { createNumeroxClient } from "@drexx-codes/numerox"
import { FirestoreNumeroxStore } from "@drexx-codes/numerox/firestore"
import { adminDb } from "@/app/lib/firebase-admin"

export const numerox = createNumeroxClient({
  store: new FirestoreNumeroxStore({ db: adminDb }),
  appName: "spotix-user",
  environment: process.env.NODE_ENV === "production" ? "production" : "development",
  logger: {
    debug: () => {},
    info: () => {},
    warn: (message, meta) => console.warn(`[numerox] ${message}`, meta ?? ""),
    error: (message, meta) => console.error(`[numerox] ${message}`, meta ?? ""),
  },
})
