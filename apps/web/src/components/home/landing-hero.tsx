import Link from "next/link";
import { HeroVisual } from "./hero-visual";
import { HeroNotificationLoop } from "./hero-notification-loop";
import { HeroHeadline } from "./hero-headline";

const STATS = [
  { label: "Setup cost", value: "None. Ever." },
  { label: "Time to live", value: "Minutes" },
  { label: "Payouts", value: "Bank or MoMo" },
  { label: "Mobile app", value: "Manage orders" },
];

export function LandingHero() {
  return (
    <section
      id="top"
      className="max-w-[1240px] mx-auto px-6 md:px-7 pt-20 pb-0"
    >
      {/* Mobile: single column, DOM order puts the image right after the
          headline and before the subtext/CTAs/stats. Desktop (md+): explicit
          grid placement recreates the two-column layout — headline+rest
          stacked in column 1, image spanning both rows in column 2. */}
      <div className="grid grid-cols-1 md:grid-cols-2 md:grid-rows-2 gap-10 md:gap-x-14 md:gap-y-0 items-start">
        <div className="min-w-0 md:col-start-1 md:row-start-1">
          <HeroHeadline />
        </div>

        <div className="md:col-start-2 md:row-start-1 md:row-span-2 md:self-start">
          <HeroVisual />
          <HeroNotificationLoop />
        </div>

        <div className="min-w-0 md:col-start-1 md:row-start-2">
          <p className="text-[18.5px] leading-relaxed text-[#14130F]/68 max-w-[33em] mb-8">
            Launch a branded shop for physical goods and bookable services in
            one place. You keep the audience, the brand, and the payouts — we
            handle checkout, inventory, and settlement.
          </p>
          <div className="flex gap-2 md:gap-3 mb-[34px]">
            <Link
              href="/create-store"
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2.5 bg-[#14130F] text-[#EFEBE3] h-11 md:h-[52px] px-3 md:px-[26px] rounded-full text-[13px] md:text-[15.5px] font-semibold whitespace-nowrap hover:bg-[#B4472B] hover:text-white transition-colors"
            >
              <span className="md:hidden">Launch store</span>
              <span className="hidden md:inline">Launch your store</span>
              <span className="font-[family-name:var(--font-spline-mono)] text-[13px] md:text-[15px]">
                →
              </span>
            </Link>
            <a
              href="#stores"
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 md:gap-2.5 h-11 md:h-[52px] px-3 md:px-[26px] rounded-full text-[13px] md:text-[15.5px] font-semibold border border-[#14130F]/22 text-[#14130F] whitespace-nowrap hover:border-[#14130F] hover:bg-[#14130F]/4 transition-colors"
            >
              <span className="md:hidden">Browse stores</span>
              <span className="hidden md:inline">Browse live stores</span>
            </a>
          </div>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-6 md:flex md:flex-row md:flex-wrap md:gap-x-10 md:gap-y-6 pt-7 border-t border-[#14130F]/14">
            {STATS.map((stat) => (
              <div key={stat.label}>
                <dt className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] uppercase text-[#14130F]/70 mb-1.5">
                  {stat.label}
                </dt>
                <dd className="text-[17px] font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  );
}
