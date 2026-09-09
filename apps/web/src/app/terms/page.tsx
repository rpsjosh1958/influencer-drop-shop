import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 font-sans p-6 md:p-12">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-500 hover:text-black mb-8 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Back to Home
        </Link>

        {/* Paper Container */}
        <div className="bg-white p-8 md:p-16 rounded-3xl shadow-sm border border-zinc-100">
          <h1 className="text-4xl font-black tracking-tighter mb-4 uppercase">
            Terms of Service
          </h1>
          <p className="text-zinc-500 mb-12 font-medium">
            Last Updated: September 2026
          </p>

          <div className="space-y-12">
            <Section title="1. Introduction">
              <p>
                Welcome to The Drop ("Platform"), operated by CopDrop Inc. By
                accessing or using our platform, you agree to be bound by these
                Terms of Service ("Terms"). If you do not agree, strictly do not
                use our services.
              </p>
            </Section>

            <Section title="2. Platform Overview">
              <p>
                The Drop is a SaaS e-commerce platform that enables creators and
                businesses ("Vendors") to create online stores, manage products,
                and sell to customers ("Buyers"). We act as the technical
                intermediary and are not the seller of record for items sold by
                Vendors.
              </p>
            </Section>

            <Section title="3. Vendor Accounts & Responsibilities">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Eligibility:</strong> You must
                  be at least 18 years old and legally capable of entering
                  contracts.
                </li>
                <li>
                  <strong className="text-black">Account Security:</strong> You
                  are responsible for safeguarding your account credentials.
                </li>
                <li>
                  <strong className="text-black">Prohibited Items:</strong> You
                  strictly agree NOT to sell:
                  <ul className="list-circle pl-5 mt-2 space-y-1 text-zinc-500 text-sm">
                    <li>Illegal drugs, narcotics, or controlled substances.</li>
                    <li>Weapons, explosives, or ammunition.</li>
                    <li>Counterfeit goods or stolen property.</li>
                    <li>Adult/pornographic content.</li>
                    <li>
                      Content that infringes on intellectual property rights.
                    </li>
                  </ul>
                </li>
                <li>
                  <strong className="text-black">
                    Shipping & Fulfillment:
                  </strong>{" "}
                  You are solely responsible for fulfilling orders and shipping
                  items to Buyers in a timely manner.
                </li>
                <li>
                  <strong className="text-black">
                    Identity Verification:
                  </strong>{" "}
                  Before your store can accept payments, you must complete
                  identity verification (including a valid Ghana Card) and
                  link a payout method. We review new stores before approving
                  them, and may request additional information at any time.
                </li>
              </ul>
            </Section>

            <Section title="4. Fees & Payments">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Starter Plan:</strong> No
                  monthly fee. We charge a{" "}
                  <span className="font-bold text-black border-b border-yellow-400">
                    8% transaction fee
                  </span>{" "}
                  on every sale.
                </li>
                <li>
                  <strong className="text-black">Growth Plan:</strong>{" "}
                  <span className="font-bold text-black">GH₵ 250/month</span>{" "}
                  subscription plus a{" "}
                  <span className="font-bold text-black border-b border-purple-400">
                    2% transaction fee
                  </span>{" "}
                  on sales.
                </li>
                <li>
                  <strong className="text-black">Payouts:</strong>
                  <ul className="list-circle pl-5 mt-2 space-y-1 text-zinc-500 text-sm">
                    <li>
                      Payments are processed via Paystack. To receive
                      payouts, you must link a bank account or mobile money
                      wallet, which we register as a dedicated payout
                      destination with Paystack in your name.
                    </li>
                    <li>
                      Your share of each sale settles to your linked account
                      automatically, on Paystack&apos;s own settlement
                      schedule, at the transaction fee for your plan
                      (Starter 8%, Growth 2%).
                    </li>
                    <li>
                      We reserve the right to hold or adjust funds if we
                      suspect fraud, a violation of these Terms, or to
                      recover an amount owed under Section 5 below.
                    </li>
                  </ul>
                </li>
              </ul>
            </Section>

            <Section title="5. Refunds & Disputes">
              <p>
                <strong className="text-black">Vendor Responsibility:</strong>{" "}
                Vendors are responsible for their own refund policies and
                for fulfilling orders as described. We may issue a refund to
                a Buyer at your request, or on our own initiative if we
                determine a refund is warranted (for example, an item never
                sent, or a payment dispute raised through Paystack).
              </p>
              <p className="mt-4">
                <strong className="text-black">How Refunds Work:</strong> A
                refund is paid out of the platform&apos;s own Paystack
                balance, not withheld directly from your linked account —
                your share of that sale has typically already settled to you
                by the time a refund happens. To recover that amount, we
                temporarily increase the platform&apos;s share of your{" "}
                <em>future</em> sales (up to 80%, leaving you 20%) until the
                refunded amount is recovered, after which your rate returns
                automatically to your normal plan rate. If a recovery ever
                takes more than what was owed, we correct it by giving you
                a larger share of your next sale(s) until you&apos;re made
                whole. This activity is shown transparently in your Finance
                dashboard.
              </p>
              <p className="mt-4">
                <strong className="text-black">Payment Disputes (Chargebacks):</strong>{" "}
                If a Buyer disputes a charge with their bank or card issuer
                through Paystack, we will notify you and you may respond
                with evidence via Paystack&apos;s dashboard within the
                window Paystack provides (currently 16 hours). An
                unanswered dispute may be automatically resolved against
                you and refunded to the Buyer, recovered the same way as
                described above.
              </p>
              <p className="mt-4">
                <strong className="text-black">Platform Intervention:</strong>{" "}
                We reserve the right to intervene in disputes. If a Vendor is
                found to be fraudulent or negligent (e.g., item not sent), we
                may refund the Buyer and suspend the Vendor, in addition to
                the recovery process described above.
              </p>
            </Section>

            <Section title="6. Intellectual Property">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Your Content:</strong> You
                  retain ownership of content you upload (images, text). You
                  grant us a license to host and display this content.
                </li>
                <li>
                  <strong className="text-black">Platform Rights:</strong> The
                  "Drop" name, logo, and codebase are exclusive property of
                  CopDrop Inc.
                </li>
              </ul>
            </Section>

            <Section title="7. Termination">
              <p>
                We reserve the right to suspend or terminate your account at any
                time for violation of these Terms, illegal activity, or
                non-payment of fees.
              </p>
            </Section>

            <Section title="8. Limitation of Liability">
              <p>
                To the maximum extent permitted by law, CopDrop Inc. shall not
                be liable for any indirect, incidental, or consequential damages
                arising from your use of the Platform.
              </p>
            </Section>

            <Section title="9. Governing Law">
              <p>
                These Terms are governed by the laws of the Republic of Ghana.
              </p>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xl font-bold mb-4 text-zinc-900 tracking-tight">
        {title}
      </h2>
      <div className="text-zinc-600 leading-relaxed text-base">{children}</div>
    </section>
  );
}
