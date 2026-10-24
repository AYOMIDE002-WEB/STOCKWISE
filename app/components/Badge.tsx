const TONES: Record<string, string> = {
  admin: "bg-violet-100/80 text-violet-700 border border-violet-200/70",
  staff: "bg-white/60 text-slate-600 border border-white/80",
  low: "bg-amber-100/80 text-amber-700 border border-amber-200/70",
  ok: "bg-emerald-100/80 text-emerald-700 border border-emerald-200/70",
  neutral: "bg-brand-50/80 text-brand-700 border border-brand-100/80",
};

export default function Badge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${TONES[tone]}`}>
      {children}
    </span>
  );
}
