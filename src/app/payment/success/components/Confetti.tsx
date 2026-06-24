"use client"

const COLORS = ["#6b2fa5", "#8b5cf6", "#a78bfa", "#c4b5fd", "#fbbf24", "#34d399"]

export default function Confetti() {
  return (
    <div className="fixed inset-0 pointer-events-none z-50">
      <div className="confetti-container">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              backgroundColor: COLORS[Math.floor(Math.random() * COLORS.length)],
            }}
          />
        ))}
      </div>
      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(360deg);
          }
        }
        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -10px;
          animation: confetti-fall 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
