interface BackToHomeLinkProps {
  onGoHome: () => void
}

/** The centered "← Back to Home" text link at the bottom of the success page. */
export default function BackToHomeLink({ onGoHome }: BackToHomeLinkProps) {
  return (
    <div className="text-center mt-8">
      <button onClick={onGoHome} className="text-purple-600 hover:text-purple-800 font-semibold transition-colors">
        ← Back to Home
      </button>
    </div>
  )
}
