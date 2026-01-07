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
            Last Updated: January 2026
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
                    <li>Funds are processed via Paystack.</li>
                    <li>
                      <strong>Starter:</strong> Payouts are released T+2 days
                      after sale to allow for fraud checks.
                    </li>
                    <li>
                      <strong>Growth:</strong> Payouts are instant for verified
                      vendors.
                    </li>
                    <li>
                      We reserve the right to hold funds if we suspect fraud or
                      violation of these Terms.
                    </li>
                  </ul>
                </li>
              </ul>
            </Section>

            <Section title="5. Refunds & Disputes">
              <p>
                <strong className="text-black">Vendor Responsibility:</strong>{" "}
                Vendors are responsible for their own refund policies and
                handling buyer disputes.
              </p>
              <p className="mt-4">
                <strong className="text-black">Platform Intervention:</strong>{" "}
                We reserve the right to intervene in disputes. If a Vendor is
                found to be fraudulent or negligent (e.g., item not sent), we
                may refund the Buyer from the Vendor's account balance and
                suspend the Vendor.
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
