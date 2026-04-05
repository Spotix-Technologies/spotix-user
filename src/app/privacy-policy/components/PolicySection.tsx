import { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

interface PolicySectionProps {
  id: string;
  number: number;
  Icon: LucideIcon;
  title: string;
  children: ReactNode;
  tinted?: boolean;
}

export default function PolicySection({
  id,
  number,
  Icon,
  title,
  children,
  tinted = false,
}: PolicySectionProps) {
  return (
    <section
      id={id}
      className={[
        "scroll-mt-14 py-12 border-b border-purple-50 last:border-b-0",
        tinted
          ? "bg-gradient-to-br from-purple-50/60 to-violet-50/40 -mx-6 px-6 rounded-2xl my-2"
          : "",
      ].join(" ")}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-[#6b2fa5]/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#6b2fa5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black tracking-widest uppercase text-[#6b2fa5]/50 mb-0.5">
            Section {String(number).padStart(2, "0")}
          </p>
          <h2 className="text-xl font-bold text-slate-900 leading-tight tracking-tight">
            {title}
          </h2>
        </div>
      </div>

      {/* Body */}
      <div className="pl-14 text-slate-600 text-[15px] leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}