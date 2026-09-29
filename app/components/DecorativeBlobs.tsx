const THEMES: Record<string, { a: string; b: string; dot: string; icon: string }> = {
  blue: { a: "bg-brand-200", b: "bg-sky-200", dot: "#7cb0dc", icon: "text-brand-100" },
  teal: { a: "bg-teal-200", b: "bg-emerald-200", dot: "#5eead4", icon: "text-teal-100" },
  amber: { a: "bg-amber-200", b: "bg-orange-200", dot: "#fcd34d", icon: "text-amber-100" },
  violet: { a: "bg-violet-200", b: "bg-fuchsia-200", dot: "#c4b5fd", icon: "text-violet-100" },
  slate: { a: "bg-slate-300", b: "bg-blue-200", dot: "#94a3b8", icon: "text-slate-200" },
};

const ICONS: Record<string, React.ReactNode> = {
  blue: <DashboardMark />,
  teal: <BoxMark />,
  amber: <ReceiptMark />,
  violet: <UsersMark />,
  slate: <ShieldMark />,
};

/**
 * All layers here are static (no CSS animation) by design - animating a
 * blurred element is expensive to repaint and was the cause of input lag
 * elsewhere in the app, so this background trades motion for a richer,
 * zero-cost layered look instead.
 */
export default function DecorativeBlobs({ theme = "blue" }: { theme?: keyof typeof THEMES }) {
  const t = THEMES[theme];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className={`absolute -top-24 -right-24 w-96 h-96 rounded-full ${t.a} opacity-25 blur-2xl`} />
      <div className={`absolute top-40 -left-20 w-72 h-72 rounded-full ${t.b} opacity-20 blur-2xl`} />

      {/* Static dot-grid texture for depth */}
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{ backgroundImage: `radial-gradient(${t.dot} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}
      />

      {/* Large faint static theme icon, tucked in a back corner */}
      <div className={`absolute -bottom-16 -right-10 w-72 h-72 ${t.icon} opacity-[0.35] rotate-[8deg]`}>
        {ICONS[theme]}
      </div>
    </div>
  );
}

function DashboardMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
}
function BoxMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full"><path d="M21 8L12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" /><path d="M3 8l9 5 9-5M12 13v8" strokeLinejoin="round" /></svg>;
}
function ReceiptMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" strokeLinejoin="round" /><path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" /></svg>;
}
function UsersMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" strokeLinecap="round" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15.8 14.2c2.7.4 4.7 2.5 4.7 5.3" strokeLinecap="round" /></svg>;
}
function ShieldMark() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-full h-full"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
