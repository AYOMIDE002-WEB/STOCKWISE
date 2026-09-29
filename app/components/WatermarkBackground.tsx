export default function WatermarkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Colorful blurred blobs for depth - static (no opacity animation) to avoid
          expensive repaints of a blurred layer, which was causing input lag */}
      <div className="absolute -top-32 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-200 opacity-35 blur-2xl" />
      <div className="absolute top-1/3 -right-32 w-[26rem] h-[26rem] rounded-full bg-violet-200 opacity-35 blur-2xl" />
      <div className="absolute -bottom-32 left-1/4 w-96 h-96 rounded-full bg-amber-100 opacity-35 blur-2xl" />

      {/* Diagonal repeated STOCKWISE watermark */}
      <div className="absolute inset-0 flex flex-col justify-center gap-10 -rotate-[18deg] scale-125">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="whitespace-nowrap text-[7rem] font-black tracking-widest text-brand-200"
            style={{ opacity: 0.55 }}
          >
            STOCKWISE&nbsp;&nbsp;STOCKWISE&nbsp;&nbsp;STOCKWISE
          </div>
        ))}
      </div>

      {/* Faint dot-grid texture for extra depth */}
      <div
        className="absolute inset-0 opacity-[0.25]"
        style={{ backgroundImage: "radial-gradient(#7cb0dc 1px, transparent 1px)", backgroundSize: "26px 26px" }}
      />

      {/* Animated floating icons representing the app's core features */}
      <Icon className="top-[8%] left-[6%] text-brand-400" size={64} rotate={-8} drift="up" delay={0}>
        <BoxIcon />
      </Icon>
      <Icon className="top-[14%] right-[10%] text-brand-400" size={56} rotate={10} drift="down" delay={0.6}>
        <ChartIcon />
      </Icon>
      <Icon className="bottom-[18%] left-[10%] text-brand-400" size={60} rotate={6} drift="up" delay={1.2}>
        <ReceiptIcon />
      </Icon>
      <Icon className="bottom-[10%] right-[8%] text-amber-400" size={70} rotate={-10} drift="down" delay={0.3} spin>
        <CartIcon />
      </Icon>
      <Icon className="top-[45%] left-[2%] text-amber-400" size={48} rotate={4} drift="up" delay={0.9}>
        <CoinIcon />
      </Icon>
      <Icon className="top-[38%] right-[3%] text-violet-400" size={48} rotate={-6} drift="down" delay={1.5}>
        <UsersIcon />
      </Icon>
      <Icon className="top-[65%] right-[22%] text-amber-400" size={36} rotate={12} drift="up" delay={2}>
        <CoinIcon />
      </Icon>
      <Icon className="top-[22%] left-[30%] text-teal-400" size={40} rotate={-4} drift="down" delay={0.8}>
        <BoxIcon />
      </Icon>
    </div>
  );
}

function Icon({
  children,
  className = "",
  size = 48,
  rotate = 0,
  drift = "up",
  delay = 0,
  spin = false,
}: {
  children: React.ReactNode;
  className?: string;
  size?: number;
  rotate?: number;
  drift?: "up" | "down";
  delay?: number;
  spin?: boolean;
}) {
  const driftClass = drift === "up" ? "animate-float-up" : "animate-float-down";
  return (
    <div
      className={`absolute ${className} ${driftClass}`}
      style={
        {
          width: size,
          height: size,
          opacity: 0.55,
          willChange: "transform",
          "--rot": `${rotate}deg`,
          animationDelay: `${delay}s`,
        } as React.CSSProperties
      }
    >
      <div className={spin ? "animate-spin-slow w-full h-full" : "w-full h-full"} style={{ willChange: spin ? "transform" : undefined }}>{children}</div>
    </div>
  );
}

/* Hand-drawn line icons - no external icon library needed */

function BoxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M21 8L12 3 3 8v8l9 5 9-5V8z" strokeLinejoin="round" />
      <path d="M3 8l9 5 9-5M12 13v8" strokeLinejoin="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M4 20V10M12 20V4M20 20v-7" strokeLinecap="round" />
      <path d="M2 20h20" strokeLinecap="round" />
    </svg>
  );
}

function ReceiptIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2z" strokeLinejoin="round" />
      <path d="M9 7h6M9 11h6M9 15h4" strokeLinecap="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="18" cy="21" r="1.4" />
      <path d="M2.5 3h2l2.4 12.2a2 2 0 002 1.6h8.6a2 2 0 002-1.6L21 8H6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CoinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9.5c0-1 1-1.8 3-1.8s3 .8 3 1.8-1 1.3-3 1.8-3 .8-3 1.8 1 1.8 3 1.8 3-.8 3-1.8" strokeLinecap="round" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-full h-full">
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.5 2.9-6 6.5-6s6.5 2.5 6.5 6" strokeLinecap="round" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.8 14.2c2.7.4 4.7 2.5 4.7 5.3" strokeLinecap="round" />
    </svg>
  );
}
