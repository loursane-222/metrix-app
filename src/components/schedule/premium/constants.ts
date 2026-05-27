export const PHASE_META: Record<string, any> = {
  OLCU: {
    label: "Ölçü",
    icon: "📏",
    text: "text-blue-300",
    bg: "bg-blue-500/10",
    border: "border-blue-500",
    dot: "bg-blue-500",
    soft: "from-blue-500/25 to-blue-500/5",
  },
  IMALAT: {
    label: "İmalat",
    icon: "⚙️",
    text: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-400",
    dot: "bg-amber-400",
    soft: "from-amber-500/25 to-amber-500/5",
  },
  MONTAJ: {
    label: "Montaj",
    icon: "🔧",
    text: "text-emerald-300",
    bg: "bg-emerald-500/10",
    border: "border-emerald-400",
    dot: "bg-emerald-400",
    soft: "from-emerald-500/25 to-emerald-500/5",
  },
  TAS_ALINACAK: {
    label: "Taş Alınacak",
    icon: "🪨",
    text: "text-orange-300",
    bg: "bg-orange-500/10",
    border: "border-orange-400",
    dot: "bg-orange-400",
    soft: "from-orange-500/20 to-orange-500/5",
  },
};

export const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

export const LIVE_OPS_RISK_STYLE: Record<string, string> = {
  OVERRUN: "text-amber-300 bg-amber-500/10",
  CRITICAL: "text-red-300 bg-red-500/10",
  STALE: "text-slate-400 bg-white/[0.06]",
};

export const LIVE_OPS_RISK_LABEL: Record<string, string> = {
  OVERRUN: "Süre Aşımı",
  CRITICAL: "Kritik Gecikme",
  STALE: "Durdu?",
};
