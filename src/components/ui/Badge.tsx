type BadgeProps = {
  text: string;
  color?: string;
};

export default function Badge({ text, color = "bg-slate-100 text-slate-700" }: BadgeProps) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${color}`}>
      {text}
    </span>
  );
}
