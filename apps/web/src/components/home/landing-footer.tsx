"use client";

import Link from "next/link";
import { Twitter, Instagram, Mail, ArrowRight } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="bg-black border-t border-white/10 pt-20 pb-10">
      <div className="max-w-7xl mx-auto px-6">
        {/* CTA Section */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-20 bg-zinc-900/50 p-12 rounded-3xl border border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Ready to start your movement?
            </h2>
            <p className="text-zinc-400">
              Join thousands of creators earning on Drop.
            </p>
          </div>
          <div className="relative z-10">
            <Link
              href="/create-store"
              className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:scale-105 transition-transform"
            >
              Launch Store <ArrowRight size={20} />
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-12 border-b border-white/10 pb-12 mb-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-orange-500" />
              <span className="font-black text-2xl tracking-tighter">
                DROP.
              </span>
            </div>
            <p className="text-zinc-500 max-w-sm">
              The premium commerce platform for the next generation of brands
              and creators. Secure the bag, own the hype.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white">Platform</h4>
            <ul className="space-y-2 text-zinc-500 text-sm">
              <li>
                <Link href="#features" className="hover:text-white">
                  Features
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="hover:text-white">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white">
                  Login
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-white">Legal</h4>
            <ul className="space-y-2 text-zinc-500 text-sm">
              <li>
                <Link href="#" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="#" className="hover:text-white">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between text-zinc-600 text-sm gap-4">
          <p>© 2025 CopDrop Inc. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">
              <Twitter size={20} />
            </a>
            <a href="#" className="hover:text-white transition-colors">
              <Instagram size={20} />
            </a>
            <a
              href="mailto:support@copdrop.io"
              className="hover:text-white transition-colors"
            >
              <Mail size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
