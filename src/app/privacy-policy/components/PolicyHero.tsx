import { Lock } from "lucide-react";

export default function PolicyHero() {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#6b2fa5] px-8 py-14 md:px-14 mb-10">
      <div className="pointer-events-none absolute -right-16 -top-16 w-72 h-72 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute right-24 -bottom-12 w-44 h-44 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-10 top-10 w-20 h-20 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 hidden md:flex items-center justify-center opacity-10">
        <Lock className="w-28 h-28 text-white" strokeWidth={1} />
      </div>
      <div className="relative z-10 max-w-2xl">
        <span className="inline-block bg-white/15 border border-white/25 text-white/90 text-[10px] font-black tracking-widest uppercase px-3 py-1.5 rounded-full mb-5">
          Legal Document
        </span>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.08] mb-3">
          Privacy Policy
        </h1>
        <p className="text-white/60 font-medium text-sm mb-6 tracking-wide">
          Spotix Technologies · Spotix Event Platform
        </p>
        <div className="flex flex-wrap gap-2.5 mb-8">
          {["Effective: {date.effective}", "Governed by Nigerian Law (NDPA 2023)", "Applies across Nigeria & Africa"].map((text) => (
            <span key={text} className="bg-white/10 border border-white/20 text-white/80 text-xs font-medium px-3 py-1.5 rounded-full">
              {text}
            </span>
          ))}
        </div>
        <p className="text-white/75 text-[15px] leading-relaxed max-w-xl">
          At <strong className="text-white font-semibold">Spotix Technologies</strong>, your privacy is foundational — not an afterthought. This policy explains exactly what data we collect on the <strong className="text-white font-semibold">Spotix Event</strong> platform, why we collect it, who can access it, and the rights you hold over it.
        </p>
      </div>
    </div>
  );
}