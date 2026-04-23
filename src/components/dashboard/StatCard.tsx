import Card from "@/components/ui/Card";

type StatCardProps = {
  label: string;
  value: string;
  note: string;
  tone: "blue" | "green" | "purple" | "amber";
};

const toneMap = {
  blue: {
    ring: "from-blue-500 to-cyan-400",
    text: "text-blue-700",
    soft: "bg-blue-50",
  },
  green: {
    ring: "from-emerald-500 to-lime-400",
    text: "text-emerald-700",
    soft: "bg-emerald-50",
  },
  purple: {
    ring: "from-violet-500 to-fuchsia-400",
    text: "text-violet-700",
    soft: "bg-violet-50",
  },
  amber: {
    ring: "from-amber-500 to-orange-400",
    text: "text-amber-700",
    soft: "bg-amber-50",
  },
};

export default function StatCard({ label, value, note, tone }: StatCardProps) {
  const styles = toneMap[tone];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <h3 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">{value}</h3>
          <p className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles.soft} ${styles.text}`}>
            {note}
          </p>
        </div>

        <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${styles.ring} shadow-lg`} />
      </div>
    </Card>
  );
}
