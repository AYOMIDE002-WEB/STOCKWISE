const TONES: Record<string, string> = {
  admin: "bg-violet-100 text-violet-700",
  staff: "bg-slate-100 text-slate-600",
  low: "bg-amber-100 text-amber-700",
  ok: "bg-emerald-100 text-emerald-700",
  neutral: "bg-brand-50 text-brand-700",
};

export default function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
