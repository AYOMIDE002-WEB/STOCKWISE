export default function WatermarkBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      <div className="absolute -top-24 -left-20 w-[26rem] h-[26rem] rounded-full bg-indigo-300 opacity-40 blur-3xl" />
      <div className="absolute top-1/3 -right-28 w-[24rem] h-[24rem] rounded-full bg-fuchsia-300 opacity-30 blur-3xl" />
      <div className="absolute -bottom-28 left-1/4 w-96 h-96 rounded-full bg-teal-300 opacity-35 blur-3xl" />
    </div>
  );
}
