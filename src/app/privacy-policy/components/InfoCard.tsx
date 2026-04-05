import { ReactNode } from "react";
import { Info, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

type CardType = "note" | "warning" | "right" | "important";

interface InfoCardProps {
  type?: CardType;
  children: ReactNode;
}

const config: Record<
  CardType,
  {
    Icon: React.FC<{ className?: string }>;
    label: string;
    bg: string;
    border: string;
    labelColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  note: {
    Icon: Info,
    label: "Note",
    bg: "bg-purple-50",
    border: "border-purple-200",
    labelColor: "text-[#6b2fa5]",
    textColor: "text-purple-900",
    iconColor: "text-[#6b2fa5]",
  },
  warning: {
    Icon: AlertTriangle,
    label: "Important",
    bg: "bg-amber-50",
    border: "border-amber-200",
    labelColor: "text-amber-700",
    textColor: "text-amber-900",
    iconColor: "text-amber-500",
  },
  right: {
    Icon: CheckCircle,
    label: "Your Right",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    labelColor: "text-emerald-700",
    textColor: "text-emerald-900",
    iconColor: "text-emerald-500",
  },
  important: {
    Icon: XCircle,
    label: "Important",
    bg: "bg-red-50",
    border: "border-red-200",
    labelColor: "text-red-700",
    textColor: "text-red-900",
    iconColor: "text-red-500",
  },
};

export default function InfoCard({ type = "note", children }: InfoCardProps) {
  const c = config[type];
  const { Icon } = c;
  return (
    <div className={`flex gap-3 ${c.bg} border ${c.border} rounded-xl p-4 my-5`}>
      <Icon className={`flex-shrink-0 w-5 h-5 mt-0.5 ${c.iconColor}`} />
      <div>
        <p className={`text-[10px] font-black tracking-widest uppercase ${c.labelColor} mb-1`}>
          {c.label}
        </p>
        <div className={`text-sm leading-relaxed ${c.textColor}`}>{children}</div>
      </div>
    </div>
  );
}