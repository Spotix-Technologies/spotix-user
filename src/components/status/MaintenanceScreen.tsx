import Image from "next/image"

type Variant = "user" | "booker"

interface MaintenanceScreenProps {
  /** "user" = ticket buyers, "booker" = event creators. Only the copy differs. */
  variant?: Variant
  /** Optional status page (e.g. Better Stack). Button is hidden when empty. */
  statusUrl?: string
}

const COPY: Record<Variant, { badge: string; title: string; accent: string; lead: string; sub: string; foot: string }> = {
  user: {
    badge: "Intermission",
    title: "We're backstage",
    accent: "doing a sound check",
    lead:
      "Spotix has stepped out for a quick intermission. Our engineers are tuning the speakers, " +
      "steaming the curtains and making sure every QR code scans on the very first try.",
    sub:
      "Relax, your tickets are safe and your seat is still reserved. Nobody is skipping the queue today, " +
      "and the only thing we're asking you to hold is your excitement.",
    foot: "Please don't bribe the bouncer. He's already in on it.",
  },
  booker: {
    badge: "Doors closed (briefly)",
    title: "The crew is backstage",
    accent: "fixing the lights",
    lead:
      "Spotix Booker is taking a short intermission. We're rehearsing the dashboards, polishing the payouts " +
      "and making sure every scan at your gate goes off without a hitch.",
    sub:
      "Your events, tickets and earnings are safe. The VIP lounge reopens shortly, " +
      "and we promise the show will go on.",
    foot: "No crowds were disappointed in the making of this update.",
  },
}

/**
 * Full-screen maintenance page. Rendered by <AppStatusShell> *instead of* the
 * app when NEXT_PUBLIC_IS_MAINTENANCE=1, so it covers every route.
 * All class names are prefixed `mx-` and there is no global reset, so it can't
 * leak into (or be broken by) the host app's styles.
 */
export function MaintenanceScreen({ variant = "user", statusUrl }: MaintenanceScreenProps) {
  const copy = COPY[variant]

  return (
    <main className="mx-root">
      <span className="mx-blob mx-blob-1" aria-hidden="true" />
      <span className="mx-blob mx-blob-2" aria-hidden="true" />
      <span className="mx-blob mx-blob-3" aria-hidden="true" />

      <div className="mx-content">
        <div className="mx-art">
          <Image
            src="/maintenance-animated.svg"
            alt="Two engineers working on the app next to turning gears"
            width={466}
            height={466}
            priority
            unoptimized
            className="mx-art-img"
          />
        </div>

        <div className="mx-copy">
        <span className="mx-badge">
          <span className="mx-badge-dot" aria-hidden="true" />
          {copy.badge}
        </span>

        <h1 className="mx-title">
          {copy.title}
          <br />
          <span className="mx-accent">{copy.accent}</span>
        </h1>

        <p className="mx-text">{copy.lead}</p>
        <p className="mx-text mx-text-sub">{copy.sub}</p>

        {statusUrl && (
          <a className="mx-btn" href={statusUrl} target="_blank" rel="noopener noreferrer">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Check live status
          </a>
        )}

        <p className="mx-foot">{copy.foot}</p>
        </div>
      </div>

      <style>{`
        .mx-root {
          position: relative;
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.25rem;
          background: #0d0914;
          overflow: hidden;
          font-family: var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", sans-serif;
        }
        .mx-root *, .mx-root *::before, .mx-root *::after { box-sizing: border-box; }

        .mx-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.35;
          pointer-events: none;
          animation: mx-drift 18s ease-in-out infinite alternate;
        }
        .mx-blob-1 { width: 520px; height: 520px; background: #6b2fa5; top: -160px; left: -140px; }
        .mx-blob-2 { width: 380px; height: 380px; background: #9b59d0; bottom: -100px; right: -80px; animation-delay: -6s; }
        .mx-blob-3 { width: 260px; height: 260px; background: #3d1260; top: 40%; left: 55%; animation-delay: -12s; }
        @keyframes mx-drift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.06); }
        }

        .mx-content {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 1280px;
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          align-items: center;
          justify-items: center;
          text-align: center;
          animation: mx-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        @keyframes mx-in {
          from { opacity: 0; transform: translateY(28px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .mx-art { display: flex; justify-content: center; width: 100%; }
        .mx-art-img { width: min(300px, 62vw); height: auto; }
        .mx-copy { display: flex; flex-direction: column; align-items: center; width: 100%; max-width: 40rem; }

        /* Large screens: use the full width — art on the left, message on the right */
        @media (min-width: 900px) {
          .mx-root { padding: 3rem 4rem; }
          .mx-content {
            grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr);
            gap: clamp(2rem, 6vw, 6rem);
            justify-items: stretch;
            text-align: left;
          }
          .mx-art-img { width: min(100%, 560px); }
          .mx-copy { align-items: flex-start; max-width: none; }
          .mx-title { font-size: clamp(2.2rem, 3.6vw, 3.6rem); }
          .mx-text { font-size: 1.08rem; max-width: 40rem; }
          .mx-text-sub { font-size: 0.98rem; }
        }
        @media (min-width: 1600px) {
          .mx-content { max-width: 1500px; }
          .mx-art-img { width: min(100%, 640px); }
        }

        .mx-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.45rem;
          margin-bottom: 1.1rem;
          padding: 0.3rem 0.85rem;
          font-size: 0.72rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #c084f5;
          background: rgba(107, 47, 165, 0.18);
          border: 1px solid rgba(107, 47, 165, 0.45);
          border-radius: 99px;
        }
        .mx-badge-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: #f59e0b;
          box-shadow: 0 0 6px #f59e0b;
          animation: mx-pulse 1.6s ease-in-out infinite;
        }
        @keyframes mx-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.75); }
        }

        .mx-title {
          margin: 0 0 1.1rem;
          font-size: clamp(1.6rem, 5vw, 2.15rem);
          font-weight: 800;
          line-height: 1.2;
          letter-spacing: -0.02em;
          color: #f3eeff;
        }
        .mx-accent {
          color: #b57bee;
          text-shadow: 0 0 32px rgba(155, 89, 208, 0.6);
        }

        .mx-text {
          margin: 0 0 0.8rem;
          font-size: 0.96rem;
          line-height: 1.7;
          color: #c4b5d8;
        }
        .mx-text-sub { margin-bottom: 1.6rem; font-size: 0.88rem; color: #9680b0; }

        .mx-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.55rem;
          margin-bottom: 1.5rem;
          padding: 0.75rem 1.75rem;
          font-size: 0.95rem;
          font-weight: 700;
          letter-spacing: 0.01em;
          color: #fff;
          text-decoration: none;
          background: #6b2fa5;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(107, 47, 165, 0.45);
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
        }
        .mx-btn:hover { background: #7d38c0; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(107, 47, 165, 0.6); }
        .mx-btn:active { transform: translateY(0); }

        .mx-foot { margin: 0; font-size: 0.75rem; letter-spacing: 0.03em; color: #7d6896; }

        @media (prefers-reduced-motion: reduce) {
          .mx-blob, .mx-badge-dot, .mx-content { animation: none; }
        }
      `}</style>
    </main>
  )
}
