import { statusConfig } from "./config"

const BANNER_TEXT = "We are investigating an issue."
const BANNER_CTA = "Click to learn more"

/**
 * Full-width banner pinned to the top of every page while NEXT_PUBLIC_IS_INCIDENT=1.
 * Clicking it opens NEXT_PUBLIC_INCIDENT_URL in a new tab.
 *
 * It's sticky + in-flow, so it pushes the page down instead of covering it. The
 * <style> below nudges any fixed / sticky top-anchored header down by the banner's
 * height so nothing ends up hidden underneath it. Drawers and modals (`h-full`,
 * `inset-0`) are deliberately left alone so they still cover the whole screen.
 */
export function IncidentBanner() {
  if (!statusConfig.isIncident) return null

  const { incidentUrl } = statusConfig

  const content = (
    <>
      <span className="inc-dot" aria-hidden />
      <span className="inc-text">
        {BANNER_TEXT}
        {incidentUrl && <strong> {BANNER_CTA} →</strong>}
      </span>
    </>
  )

  return (
    <>
      {incidentUrl ? (
        <a
          className="inc-banner"
          href={incidentUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      ) : (
        <div className="inc-banner">
          {content}
        </div>
      )}

      <style>{`
        :root { --incident-h: 2.5rem; }

        .inc-banner {
          position: sticky;
          top: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.6rem;
          width: 100%;
          height: var(--incident-h);
          padding: 0 0.75rem;
          background: #b91c1c;
          color: #fff;
          font-size: 0.8125rem;
          line-height: 1.2;
          text-align: center;
          text-decoration: none;
          font-family: inherit;
        }
        a.inc-banner { cursor: pointer; transition: background 0.15s; }
        a.inc-banner:hover { background: #991b1b; }
        a.inc-banner:hover strong { text-decoration: underline; }
        .inc-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .inc-text strong { font-weight: 700; }
        .inc-dot {
          flex: none;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #fff;
          animation: inc-pulse 1.4s ease-in-out infinite;
        }
        @keyframes inc-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        @media (max-width: 480px) {
          .inc-banner { font-size: 0.72rem; gap: 0.4rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .inc-dot { animation: none; }
        }

        /* Keep top-anchored headers / rails clear of the banner */
        :root header:not(.relative):not(.absolute):not(.fixed),
        :root .sticky.top-0,
        :root .fixed.top-0:not(.h-full):not(.inset-0),
        :root .fixed.inset-y-0 {
          top: var(--incident-h);
        }
      `}</style>
    </>
  )
}
