"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const FAQS = [
  {
    q: "How do payouts work?",
    a: "Sales are credited to your store balance immediately. You can request a payout to your Bank Account or Mobile Money wallet whenever you want, processed securely via Paystack."
  },
  {
    q: "Do I need my own website?",
    a: "No. We generate a complete, professional storefront for you automatically. You get a unique link (e.g., drop.io/shop/yourbrand) to share with your fans."
  },
  {
    q: "Is the mobile app included?",
    a: "Yes. Your store is automatically listed on the Drop mobile app, allowing customers to receive push notifications for your new drops."
  },
  {
    q: "Do you handle shipping?",
    a: "You are responsible for fulfilling orders. We provide you with all the customer details and order management tools you need to ship efficiently."
  }
];

export function LandingFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-32 bg-zinc-950 border-t border-white/5 relative z-10 text-white">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-4xl font-black text-center mb-16 text-white">
          Frequently Asked <span className="text-zinc-600">Questions</span>
        </h2>
        
        <div className="space-y-4">
           {FAQS.map((faq, i) => (
             <div 
               key={i} 
               className="border border-white/5 bg-white/5 rounded-2xl overflow-hidden hover:border-white/10 transition-colors"
             >
                <button 
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                   <span className="font-bold text-lg text-white">{faq.q}</span>
                   <div className={`p-2 rounded-full ${openIndex === i ? 'bg-white text-black' : 'bg-black/50 text-white'}`}>
                      {openIndex === i ? <Minus size={16} /> : <Plus size={16} />}
                   </div>
                </button>
                {/* No AnimatePresence, just conditional rendering */}
                {openIndex === i && (
                   <div className="p-6 pt-0 text-zinc-400 leading-relaxed block">
                      {faq.a}
                   </div>
                )}
             </div>
           ))}
        </div>
      </div>
    </section>
)}
