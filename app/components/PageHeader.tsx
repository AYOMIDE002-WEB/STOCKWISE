const THEMES: Record<string, string> = {
  blue: "from-brand-600/90 to-sky-500/90",
  teal: "from-teal-600/90 to-emerald-500/90",
  amber: "from-amber-500/90 to-orange-500/90",
  violet: "from-violet-600/90 to-fuchsia-500/90",
  slate: "from-slate-700/90 to-slate-500/90",
};

export default function PageHeader({
  icon,
  title,
  subtitle,
  theme = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  theme?: keyof typeof THEMES;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${THEMES[theme]} backdrop-blur-md border border-white/30 p-4 md:p-6 mb-5 md:mb-8 text-white shadow-glass`}>
      <div className="absolute -right-8 -top-10 w-40 h-40 rounded-full bg-white/15 blur-xl" />
      <div className="absolute right-16 -bottom-10 w-28 h-28 rounded-full bg-white/10 blur-lg" />
      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/20 border border-white/30 backdrop-blur flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/85 text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
