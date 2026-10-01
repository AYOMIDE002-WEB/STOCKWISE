const THEMES: Record<string, string> = {
  blue: "from-brand-600 to-sky-500",
  teal: "from-teal-600 to-emerald-500",
  amber: "from-amber-500 to-orange-500",
  violet: "from-violet-600 to-fuchsia-500",
  slate: "from-slate-700 to-slate-500",
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
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${THEMES[theme]} p-4 md:p-6 mb-5 md:mb-8 text-white shadow-lg`}>
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute right-10 bottom-[-2rem] w-20 h-20 rounded-full bg-white/10" />
      <div className="relative flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          {icon}
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-white/80 text-sm mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}
