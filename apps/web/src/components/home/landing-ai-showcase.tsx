const CAPABILITIES = [
  {
    letter: "A.",
    title: "Plain-language control",
    desc: "“Set the Jordans to 50 in stock” — done, logged, reflected on the storefront.",
  },
  {
    letter: "B.",
    title: "Answers, not exports",
    desc: "Revenue, pending payouts and best sellers without touching a spreadsheet.",
  },
  {
    letter: "C.",
    title: "Bulk work, one sentence",
    desc: "Move order statuses, retag categories, or broadcast a promo in one go.",
  },
];

export function LandingAiShowcase() {
  return (
    <section className="mt-[130px] bg-[#14130F] text-[#EFEBE3]">
      <div className="max-w-[1240px] mx-auto px-6 md:px-7 py-[110px]">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-[60px] items-center">
          <div className="min-w-0">
            <div className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.14em] uppercase text-[#E08A6B] mb-5">
              Store assistant · Growth plan
            </div>
            <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(34px,4.4vw,54px)] tracking-[-0.012em] leading-[1.04] mb-5">
              Ask for it instead of clicking for it.
            </h2>
            <p className="text-[17.5px] leading-[1.65] text-[#EFEBE3]/66 mb-[34px] max-w-[32em]">
              Your assistant reads your own store data. Ask how the week
              went, restock a size, price a promo, or message every past
              buyer — in plain words, no menus.
            </p>
            <div className="grid gap-[22px] max-w-[34em]">
              {CAPABILITIES.map((cap) => (
                <div key={cap.letter} className="flex gap-4">
                  <span className="font-[family-name:var(--font-spline-mono)] text-[11px] text-[#E08A6B] pt-1">
                    {cap.letter}
                  </span>
                  <div>
                    <h4 className="text-[16.5px] font-semibold mb-1">
                      {cap.title}
                    </h4>
                    <p className="text-[14.5px] leading-[1.6] text-[#EFEBE3]/72">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 border border-[#EFEBE3]/16 rounded-[14px] bg-[#1C1A16] p-[22px] flex flex-col gap-3.5">
            <div className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] text-[#EFEBE3]/72 pb-3.5 border-b border-[#EFEBE3]/12">
              ASSISTANT · YOURBRAND
            </div>
            <div className="self-end max-w-[82%] bg-[#EFEBE3]/10 rounded-tl-[14px] rounded-tr-[14px] rounded-bl-[14px] rounded-br-[4px] px-[15px] py-3 text-[14.5px] leading-[1.5]">
              How did last week go?
            </div>
            <div className="self-start max-w-[88%] bg-[#E08A6B]/12 border border-[#E08A6B]/26 rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px] px-[15px] py-3 text-[14.5px] leading-[1.55] text-[#EFEBE3]/90">
              Revenue was GH₵12,450 across 142 orders — up 24% on the week
              before. Vintage Levis is your top seller and two sizes are
              nearly out.
            </div>
            <div className="self-end max-w-[82%] bg-[#EFEBE3]/10 rounded-tl-[14px] rounded-tr-[14px] rounded-bl-[14px] rounded-br-[4px] px-[15px] py-3 text-[14.5px] leading-[1.5]">
              Put 15% off the Levis and tell my buyers.
            </div>
            <div className="self-start max-w-[88%] bg-[#E08A6B]/12 border border-[#E08A6B]/26 rounded-tl-[14px] rounded-tr-[14px] rounded-br-[14px] rounded-bl-[4px] px-[15px] py-3 text-[14.5px] leading-[1.55] text-[#EFEBE3]/90">
              Code{" "}
              <span className="font-[family-name:var(--font-spline-mono)]">
                LEVIS15
              </span>{" "}
              is live. Broadcast drafted for 318 past customers — send it?
            </div>
            <div className="flex gap-2.5 items-center pt-3.5 border-t border-[#EFEBE3]/12 mt-auto">
              <div className="flex-1 h-10 rounded-[10px] bg-[#EFEBE3]/7 flex items-center px-3.5 text-sm text-[#EFEBE3]/60">
                Ask your store anything…
              </div>
              <div className="w-10 h-10 rounded-[10px] bg-[#E08A6B] text-[#14130F] flex items-center justify-center text-base">
                →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
