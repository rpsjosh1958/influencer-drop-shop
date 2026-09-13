const STEPS = [
  {
    num: "01 / SET UP",
    title: "Claim your handle",
    desc: "Pick your URL, drop in a logo, choose type and colour. Your storefront looks like your brand, not like a template.",
  },
  {
    num: "02 / SCHEDULE",
    title: "Stage the drop",
    desc: "Load products or bookable slots, choose when to go Live. Watch your store sell out.",
  },
  {
    num: "03 / SETTLE",
    title: "Get paid, then ship",
    desc: "Payments clear through Paystack and settle to your bank or mobile money automatically. You pack orders; we do the accounting.",
  },
];

export function LandingHowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 max-w-[1240px] mx-auto px-6 md:px-7 pt-[120px]">
      <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(34px,4.6vw,58px)] tracking-[-0.012em] mb-3.5 max-w-[20em]">
        Three steps between an idea and a paid order.
      </h2>
      <p className="text-lg text-[#14130F]/62 max-w-[34em] mb-14">
        No developer, no theme shopping, no monthly bill before your first sale.
      </p>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-px bg-[#14130F]/14 border-y border-[#14130F]/14">
        {STEPS.map((step) => (
          <div key={step.num} className="bg-[#EFEBE3] px-7 pt-[34px] pb-[38px] min-w-0">
            <div className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.14em] text-[#B4472B] mb-[22px]">
              {step.num}
            </div>
            <h3 className="text-[23px] font-semibold tracking-[-0.015em] mb-3">
              {step.title}
            </h3>
            <p className="text-[15.5px] leading-[1.65] text-[#14130F]/66">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
