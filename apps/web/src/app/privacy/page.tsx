import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="text-zinc-500 mb-12 font-medium">
            Last Updated: January 2026
          </p>

          <div className="space-y-12">
            <Section title="1. Introduction">
              <p>
                At The Drop ("we", "us"), we respect your privacy. This policy
                explains how we collect, use, and protect your personal
                information.
              </p>
            </Section>

            <Section title="2. Information We Collect">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Account Information:</strong>{" "}
                  Name, email address, phone number, and password.
                </li>
                <li>
                  <strong className="text-black">Identity Verification:</strong>{" "}
                  For Vendors, we collect Ghana Card (NIA) numbers for identity
                  verification as required by financial regulations.
                </li>
                <li>
                  <strong className="text-black">Transaction Data:</strong>{" "}
                  Order details, shipping addresses, and purchase history.
                </li>
                <li>
                  <strong className="text-black">Device Data:</strong> IP
                  address, browser type, and usage patterns for analytics and
                  security.
                </li>
              </ul>
            </Section>

            <Section title="3. How We Use Your Data">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Service Delivery:</strong> To
                  provide, maintain, and improve our Platform.
                </li>
                <li>
                  <strong className="text-black">Processing Payments:</strong>{" "}
                  To facilitate transactions via our payment partners.
                </li>
                <li>
                  <strong className="text-black">Communication:</strong> To send
                  order updates, security alerts, and support messages.
                </li>
                <li>
                  <strong className="text-black">Fraud Prevention:</strong> To
                  detect and prevent fraudulent transactions and abuse.
                </li>
              </ul>
            </Section>

            <Section title="4. Sharing of Information">
              <p className="mb-4">
                We do not sell your personal data. We share data only with:
              </p>
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Service Providers:</strong>{" "}
                  Payment processors (Paystack), hosting services, and email
                  providers necessary to run the Platform.
                </li>
                <li>
                  <strong className="text-black">Legal Compliance:</strong> When
                  required by law, subpoena, or court order.
                </li>
              </ul>
            </Section>

            <Section title="5. Data Security">
              <p>
                We implement industry-standard security measures (encryption,
                secure servers) to protect your data. However, no method of
                transmission over the internet is 100% secure.
              </p>
            </Section>

            <Section title="6. Your Rights">
              <ul className="space-y-4 list-disc pl-5">
                <li>
                  <strong className="text-black">Access & Correction:</strong>{" "}
                  You can view and update your profile information in your
                  account settings.
                </li>
                <li>
                  <strong className="text-black">Deletion:</strong> You may
                  request account deletion by contacting support@copdrop.io.
                  Note that we may retain certain financial records as required
                  by law.
                </li>
              </ul>
            </Section>

            <Section title="7. Children's Privacy">
              <p>
                Our Platform is not intended for use by children under 13. We do
                not knowingly collect data from children.
              </p>
            </Section>

            <Section title="8. Contact Us">
              <p>
                For privacy concerns, please contact us at{" "}
                <a
                  href="mailto:privacy@copdrop.io"
                  className="font-bold underline"
                >
                  privacy@copdrop.io
                </a>
                .
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
