import Image from "next/image";

const BULLET = (
  <span className="font-[family-name:var(--font-spline-mono)] text-[11px] text-[#B4472B]">
    ▶
  </span>
);

export function LandingFeatures() {
  return (
    <section id="features" className="scroll-mt-20 max-w-[1240px] mx-auto px-6 md:px-7 pt-[130px]">
      <div className="flex items-baseline gap-4 mb-[70px] flex-wrap">
        <span className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.14em] uppercase text-[#14130F]/70">
          The platform
        </span>
        <span className="flex-1 h-px bg-[#14130F]/14 min-w-[40px]" />
      </div>

      {/* 01 — Dashboard */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-[60px] items-center mb-[120px]">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.12em] text-[#B4472B] mb-[18px]">
            01 — DASHBOARD
          </div>
          <h3 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(32px,4vw,48px)] tracking-[-0.012em] leading-[1.05] mb-[18px]">
            One place to run the whole business.
          </h3>
          <p className="text-[17.5px] leading-[1.65] text-[#14130F]/66 mb-[26px] max-w-[32em]">
            Revenue, orders, stock and customers in a single view — and the
            essentials work from your phone, so you can keep trading from
            anywhere.
          </p>
          <ul className="grid gap-2.5">
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Live sales and payout balance
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Inventory with low-stock alerts
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}New order & booking alerts, right on your phone
            </li>
          </ul>
        </div>
        <div className="min-w-0 rounded-[14px] overflow-hidden border border-[#14130F]/16 shadow-[0_30px_60px_-34px_rgba(20,19,15,0.38)]">
          <Image
            src="/assets/landing/new-dashboard.png"
            alt="The Drop admin dashboard"
            width={2560}
            height={1310}
            className="block w-full h-auto"
          />
        </div>
      </div>

      {/* 02 — Storefront */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-[60px] items-center mb-[120px]">
        <div className="min-w-0 order-2 md:order-2 rounded-[14px] overflow-hidden border border-[#14130F]/16 shadow-[0_30px_60px_-34px_rgba(20,19,15,0.38)]">
          <Image
            src="/assets/landing/shop.png"
            alt="A storefront selling products and services"
            width={2560}
            height={1310}
            className="block w-full h-auto"
          />
        </div>
        <div className="min-w-0 order-1 md:order-1">
          <div className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.12em] text-[#B4472B] mb-[18px]">
            02 — STOREFRONT
          </div>
          <h3 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(32px,4vw,48px)] tracking-[-0.012em] leading-[1.05] mb-[18px]">
            Products and appointments, same shop.
          </h3>
          <p className="text-[17.5px] leading-[1.65] text-[#14130F]/66 mb-[26px] max-w-[32em]">
            Sell a hoodie and book a Saturday braiding slot from the same
            storefront. Most platforms make you pick one — you shouldn&apos;t
            have to run two businesses in two tools.
          </p>
          <ul className="grid gap-2.5">
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Hybrid product + service catalogue
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Your fonts, colours and logo
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Checkout with card and mobile money
            </li>
          </ul>
        </div>
      </div>

      {/* 03 — Mobile */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-[60px] items-center">
        <div className="min-w-0">
          <div className="font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.12em] text-[#B4472B] mb-[18px]">
            03 — MOBILE
          </div>
          <h3 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(32px,4vw,48px)] tracking-[-0.012em] leading-[1.05] mb-[18px]">
            You stay in their pocket.
          </h3>
          <p className="text-[17.5px] leading-[1.65] text-[#14130F]/66 mb-[26px] max-w-[32em]">
            Your shop lives inside The Drop app on iOS and Android. Followers
            get a push the second you release, saved cards make checkout one
            tap, and they can switch between the brands they follow.
          </p>
          <ul className="grid gap-2.5">
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Push notifications on every drop
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}One-tap checkout with stored details
            </li>
            <li className="flex gap-3 items-baseline text-[15.5px] text-[#14130F]/82">
              {BULLET}Store switching for repeat buyers
            </li>
          </ul>
        </div>
        <div className="min-w-0 flex items-end justify-center gap-[18px] bg-[#E5E0D6] border border-[#14130F]/12 rounded-[14px] pt-11 px-6 overflow-hidden">
          <Image
            src="/assets/landing/image1.png"
            alt="Drop app product screen"
            width={210}
            height={277}
            className="w-[44%] max-w-[210px] h-auto"
            style={{ filter: "drop-shadow(0 24px 40px rgba(20,19,15,0.3))" }}
          />
          <Image
            src="/assets/landing/image2.png"
            alt="Drop app notifications"
            width={210}
            height={298}
            className="w-[44%] max-w-[210px] h-auto -mb-6"
            style={{ filter: "drop-shadow(0 24px 40px rgba(20,19,15,0.3))" }}
          />
        </div>
      </div>
    </section>
  );
}
