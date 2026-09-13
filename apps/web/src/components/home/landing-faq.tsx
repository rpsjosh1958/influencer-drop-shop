"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const FAQS = [
  {
    q: "How do payouts actually work?",
    a: "You link a bank account or mobile money wallet once. After each sale, Paystack settles your earnings there automatically — there is no payout request to remember and no minimum balance.",
  },
  {
    q: "Do I need my own website first?",
    a: "No. We generate a complete storefront at copdrop.io/shop/yourbrand. COMING SOON - you can point your own domain at it later if you want.",
  },
  {
    q: "Is the mobile app included? (COMING SOON)",
    a: "Yes. Every '  Growth' store is reachable from The Drop app on iOS and Android, so buyers get a push notification the moment you release something or broadcast an announcement.",
  },
  {
    q: "Can I run my store from the mobile app?",
    a: "Yes — the vendor side of the app lets you see new orders and bookings the moment they land, update order status, check your payout balance, and share a ready-made promo flyer for Instagram or WhatsApp, all without opening a laptop.",
  },
  {
    q: "Can I sell services as well as products?",
    a: "Yes — the same storefront handles physical items and bookable slots, with availability, deposits and confirmations built in.",
  },
  {
    q: "Who handles shipping and fulfilment?",
    a: "You do. We give you the order details, customer contact and status tools; you choose how to pack and deliver.",
  },
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="scroll-mt-20 max-w-[860px] mx-auto px-6 md:px-7 pt-[120px]">
      <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(30px,3.8vw,46px)] tracking-[-0.02em] mb-10">
        Questions, answered plainly
      </h2>
      <div className="border-t border-[#14130F]/14">
        {FAQS.map((faq, i) => {
          const isOpen = openIndex === i;
          return (
            <div key={faq.q} className="border-b border-[#14130F]/14">
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                className="w-full bg-transparent border-0 cursor-pointer flex items-center justify-between gap-5 py-6 px-0.5 text-left"
              >
                <span className="text-lg font-semibold tracking-[-0.01em] text-[#14130F]">
                  {faq.q}
                </span>
                <span className="font-[family-name:var(--font-spline-mono)] text-lg text-[#B4472B] shrink-0">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="m-0 pb-[26px] pr-[60px] pl-0.5 text-[16.5px] leading-[1.7] text-[#14130F]/66">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
