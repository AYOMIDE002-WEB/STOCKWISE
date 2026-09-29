const props = { viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8 } as const;

export function DashboardIcon() {
  return <svg {...props} className="w-6 h-6"><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></svg>;
}
export function BoxIcon() {
  return <svg {...props} className="w-6 h-6"><path d="M21 8L12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" /><path d="M3 8l9 5 9-5M12 13v8" strokeLinejoin="round" /></svg>;
}
export function ReceiptIcon() {
  return <svg {...props} className="w-6 h-6"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" strokeLinejoin="round" /><path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" /></svg>;
}
export function UsersIcon() {
  return <svg {...props} className="w-6 h-6"><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" strokeLinecap="round" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15.8 14.2c2.7.4 4.7 2.5 4.7 5.3" strokeLinecap="round" /></svg>;
}
export function ShieldIcon() {
  return <svg {...props} className="w-6 h-6"><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5l8-3z" strokeLinejoin="round" /><path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
