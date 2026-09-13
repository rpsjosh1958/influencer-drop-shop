import Link from "next/link";
import Image from "next/image";

export function LandingFooter() {
  return (
    <footer className="max-w-[1240px] mx-auto px-6 md:px-7 pt-[100px] pb-10">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] gap-10 pb-10 border-b border-[#14130F]/14">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 mb-4">
            <Image
              src="/assets/landing/drop_logo.png"
              alt=""
              width={28}
              height={28}
              className="rounded-[7px]"
            />
            <span className="font-[family-name:var(--font-hanson)] mt-1 text-[19px]">
              THE DROP.
            </span>
          </div>
          <p className="text-[14.5px] leading-relaxed text-[#14130F]/58 max-w-[26em]">
            Commerce infrastructure for creators and independent brands. Built
            in Ghana, for anyone selling to a real audience.
          </p>
        </div>

        <div>
          <h4 className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] uppercase text-[#14130F]/70 mb-3.5">
            Platform
          </h4>
          <ul className="grid gap-2.5 text-[14.5px] text-[#14130F]/70">
            <li><a href="#features" className="hover:text-[#B4472B]">Features</a></li>
            <li><a href="#pricing" className="hover:text-[#B4472B]">Pricing</a></li>
            <li><a href="#stores" className="hover:text-[#B4472B]">Live stores</a></li>
            <li><Link href="/admin" className="hover:text-[#B4472B]">Sign in</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] uppercase text-[#14130F]/70 mb-3.5">
            Legal
          </h4>
          <ul className="grid gap-2.5 text-[14.5px] text-[#14130F]/70">
            <li><Link href="/privacy" className="hover:text-[#B4472B]">Privacy policy</Link></li>
            <li><Link href="/terms" className="hover:text-[#B4472B]">Terms of service</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.12em] uppercase text-[#14130F]/70 mb-3.5">
            Contact
          </h4>
          <ul className="grid gap-2.5 text-[14.5px] text-[#14130F]/70">
            <li><a href="https://x.com/copdrop_io" className="hover:text-[#B4472B]">X / Twitter</a></li>
            <li><a href="https://instagram.com/copdrop_io" className="hover:text-[#B4472B]">Instagram</a></li>
            <li><a href="mailto:support@copdrop.io" className="hover:text-[#B4472B]">support@copdrop.io</a></li>
          </ul>
        </div>
      </div>

      <div className="pt-6 flex justify-between gap-5 flex-wrap font-[family-name:var(--font-spline-mono)] text-[11px] tracking-[0.06em] text-[#14130F]/70">
        <span>© 2026 THE DROP SHOP</span>
        <span>COPDROP.IO</span>
      </div>
    </footer>
  );
}
