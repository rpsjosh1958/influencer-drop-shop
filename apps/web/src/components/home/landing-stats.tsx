const STATS = [
  { value: "GH₵0", label: "To open a store" },
  { value: "2–8%", label: "Per transaction" },
  { value: "Auto", label: "Payouts, no requests" },
  { value: "iOS+Android", label: "App included" },
];

export function LandingStats() {
  return (
    <section className="max-w-[1240px] mx-auto px-6 md:px-7 pt-[90px]">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-px bg-[#14130F]/14 border border-[#14130F]/14 rounded-[14px] overflow-hidden">
        {STATS.map((stat) => (
          <div key={stat.label} className="bg-[#EFEBE3] px-6 py-[30px]">
            <div className="font-[family-name:var(--font-gloock)] text-[38px] leading-none mb-2">
              {stat.value}
            </div>
            <div className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] uppercase text-[#14130F]/70">
              {stat.label}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
