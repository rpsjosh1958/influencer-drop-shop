import { TERMS_CONTENT } from "@/lib/legal-content";
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

        <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-zinc-100 prose prose-zinc max-w-none">
          <div className="whitespace-pre-wrap font-medium text-zinc-600 leading-relaxed">
            {TERMS_CONTENT}
          </div>
        </div>
      </div>
    </div>
  );
}
