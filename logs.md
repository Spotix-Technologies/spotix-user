# Changelog

All notable changes to **Spotix for Bookers** are documented here.  
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).  
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

### In Progress
- Payout request flow with bank account verification
- Email notifications for ticket sales milestones
- Affiliate dashboard for tracking referral performance

---

## [0.4.0] — 2026-04-05

### Added
- `LogoutDialog` component — shows all active sessions with per-device logout support
- Session management API routes: `GET /api/auth/sessions`, `POST /api/auth/logout/session`
- Dashboard caching via `localStorage` key `spotix_dashboard_{userId}` with 10-minute TTL
- Subtle "cached data from HH:MM — Refresh now" banner when serving stale dashboard data
- Auto-refresh aligned to cache TTL expiry

### Changed
- Nav bar now opens `LogoutDialog` instead of triggering direct logout
- `StatsGrid` renamed `pastEvents` field to `inactiveEvents` for clarity

### Fixed
- React 18 Strict Mode double-invocation bug in `MapPickerModal` via cancelled-flag pattern

---

## [0.3.0] — 2026-03-20

### Added
- `MapPickerModal` — interactive venue picker using Leaflet + OpenStreetMap
- Nominatim geocoding for address-to-coordinates resolution
- `EventLocation` component with manual lat/lng entry and input validation
- Dynamic import of map component with `ssr: false` to prevent hydration errors
- Lagos set as default map coordinates (`6.5244° N, 3.3792° E`)

### Changed
- Venue coordinates stored as `venueCoordinates: { lat, lng } | null` in Firestore

### Removed
- Google Maps dependency — fully replaced with OpenStreetMap stack

---

## [0.2.0] — 2026-03-01

### Added
- `POST /api/events` — event creation endpoint; auto-increments `users/{uid}.totalEvents`
- `GET /api/revenue` — returns `totalEvents`, `ticketsSold`, `totalRevenue`, `totalPaidOut`, and computed `availableBalance`
- Firestore flat `events/{eventId}` collection with fields: `organizerId`, `eventName`, `eventVenue`, `status`, `ticketsSold`, `revenue`, `isFree`, `ticketPrices[]`, `createdAt`
- Event status enum: `"active" | "inactive" | "cancelled" | "completed"`
- Developer tag injected into all API responses

### Changed
- Middleware now injects `x-user-id` and `x-user-is-booker` headers on authenticated routes

---

## [0.1.0] — 2026-02-10

### Added
- Project scaffold: Next.js 16 (App Router, Turbopack), TypeScript, Tailwind CSS
- Firebase Auth + Firestore + Firebase Admin SDK integration
- JWT access tokens stored in `spotix_at` httpOnly cookie
- Refresh token system: IDs in `spotix_rti` cookie; tokens stored in Firestore `refreshTokens` collection
- `verifyAccessToken()` with audience `"spotix-booker"`
- `users/{uid}` Firestore schema: `totalEvents`, `ticketsSold`, `totalRevenue`, `totalPaidOut`, `username`, `fullName`, `role`, `isBooker`
- `POST /api/auth/logout` endpoint
- Brand color `#6b2fa5` and Nigerian Naira (₦) as default currency

---

[Unreleased]: https://github.com/your-org/spotix-bookers/compare/v0.4.0...HEAD
[0.4.0]: https://github.com/your-org/spotix-bookers/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/your-org/spotix-bookers/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/your-org/spotix-bookers/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/your-org/spotix-bookers/releases/tag/v0.1.0