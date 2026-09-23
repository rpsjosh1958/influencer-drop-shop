import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function DeleteAccountPage() {
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
            Delete Your Account
          </h1>
          <p className="text-zinc-500 mb-12 font-medium">
            The Drop — account and data deletion
          </p>

          <div className="space-y-12">
            <Section title="How to request deletion">
              <p className="mb-4">
                To delete your The Drop account (customer or vendor), email{" "}
                <a
                  href="mailto:support@copdrop.io?subject=Account%20Deletion%20Request"
                  className="font-bold underline"
                >
                  support@copdrop.io
                </a>{" "}
                from the email address associated with your account and
                request deletion.
              </p>
              <ol className="space-y-3 list-decimal pl-5">
                <li>
                  Send the request from your account's registered email
                  address.
                </li>
                <li>
                  Include whether your account is a customer or a vendor
                  account, and, if a vendor, your store name.
                </li>
                <li>
                  Our team verifies the request and deletes your account
                  within 30 days.
                </li>
              </ol>
            </Section>

            <Section title="What gets deleted">
              <ul className="space-y-3 list-disc pl-5">
                <li>Your profile (name, email, phone number, password)</li>
                <li>Saved addresses</li>
                <li>Device and push notification tokens</li>
                <li>
                  For vendors: identity verification documents (Ghana Card)
                  and payout account details
                </li>
              </ul>
            </Section>

            <Section title="What we retain, and why">
              <p>
                As described in our{" "}
                <Link href="/privacy" className="font-bold underline">
                  Privacy Policy
                </Link>
                , we retain certain order and financial transaction records
                after account deletion where required by applicable tax,
                accounting, or other legal obligations. This data is kept
                only as long as legally required and is not used for any
                other purpose after your account is deleted.
              </p>
            </Section>

            <Section title="Contact">
              <p>
                Questions about account deletion or your data can be sent to{" "}
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
