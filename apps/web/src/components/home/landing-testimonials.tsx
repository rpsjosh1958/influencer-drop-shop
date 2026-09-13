// Placeholder quotes — role-based attribution, no invented names or stock
// photos standing in for real people. Swap for real seller quotes once
// collected.
const QUOTES = [
  {
    text: "I moved my thrift store online on a Tuesday and sold out the vintage rail in twenty minutes. Momo settlement lands the next day.",
    role: "Vintage clothing seller, Accra",
  },
  {
    text: "Products and appointments in one shop finally fits how I actually work. No more “DM for price.”",
    role: "Beauty & braiding studio, Kumasi",
  },
  {
    text: "The dashboard is simple enough that I run the brand from my phone between deliveries. Upload, share, cash out.",
    role: "Streetwear brand, Takoradi",
  },
];

export function LandingTestimonials() {
  return (
    <section className="max-w-[1240px] mx-auto px-6 md:px-7 pt-[110px]">
      <div className="flex items-baseline justify-between gap-5 flex-wrap mb-11">
        <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(30px,3.8vw,46px)] tracking-[-0.02em]">
          From the people using it
        </h2>
        <span className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.1em] uppercase text-[#14130F]/70">
          Accra · Kumasi · Takoradi
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-5">
        {QUOTES.map((quote) => (
          <figure
            key={quote.role}
            className="m-0 border border-[#14130F]/14 rounded-[14px] p-[30px] bg-[#F7F5F0] flex flex-col gap-[22px]"
          >
            <blockquote className="m-0 font-[family-name:var(--font-gloock)] text-[21px] leading-[1.4] tracking-[-0.01em]">
              {quote.text}
            </blockquote>
            <figcaption className="flex items-center gap-3 mt-auto">
              <div className="w-[38px] h-[38px] rounded-full bg-[#14130F]/10 flex items-center justify-center font-[family-name:var(--font-spline-mono)] text-xs font-medium text-[#14130F]/60">
                {quote.role.charAt(0)}
              </div>
              <div className="font-[family-name:var(--font-spline-mono)] text-[11px] text-[#14130F]/70">
                {quote.role}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
