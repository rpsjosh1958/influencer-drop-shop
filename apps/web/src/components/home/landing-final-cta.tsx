import Link from "next/link";

export function LandingFinalCta() {
  return (
    <section className="max-w-[1240px] mx-auto px-6 md:px-7 pt-[120px]">
      <div className="border border-[#14130F]/16 rounded-[20px] p-[clamp(40px,6vw,80px)] grid grid-cols-[repeat(auto-fit,minmax(min(100%,300px),1fr))] gap-10 items-center bg-[#F7F5F0]">
        <div className="min-w-0">
          <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(32px,4.4vw,52px)] tracking-[-0.012em] leading-[1.04] mb-3.5">
            Your next drop deserves a real shop.
          </h2>
          <p className="text-lg leading-relaxed text-[#14130F]/64">
            Set it up in one sitting. Pay nothing until something sells.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 justify-start">
          <Link
            href="/create-store"
            className="flex items-center gap-2.5 bg-[#14130F] text-[#EFEBE3] h-[54px] px-7 rounded-full text-base font-semibold hover:bg-[#B4472B] hover:text-white transition-colors"
          >
            Launch your store
            <span className="font-[family-name:var(--font-spline-mono)]">→</span>
          </Link>
          <a
            href="mailto:support@copdrop.io"
            className="flex items-center h-[54px] px-7 rounded-full text-base font-semibold border border-[#14130F]/22 hover:border-[#14130F] transition-colors"
          >
            Talk to us
          </a>
        </div>
      </div>
    </section>
  );
}
