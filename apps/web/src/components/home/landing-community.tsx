"use client";

import { Twitter } from "lucide-react";

const TWEETS = [
  {
    name: "Kwame Asante",
    handle: "@kwame_drops",
    content:
      "Chale, I moved my thrift store online last week. Sold out my vintage collection in 20 minutes. The withdrawals to Momo are actually instant. 🔥",
    avatar:
      "https://images.unsplash.com/photo-1531384441138-2736e62e0919?w=100&auto=format&fit=crop&q=60",
  },
  {
    name: "Ama Serwaa",
    handle: "@serwaa_beauty",
    content:
      "Finally a platform that understands the GH market. My customers love the mobile app. No more DM for price! 🙏🏾",
    avatar:
      "https://images.unsplash.com/photo-1589156191108-c762ff4b96ab?w=100&auto=format&fit=crop&q=60",
  },
  {
    name: "Kojo Black",
    handle: "@kojo_streets",
    content:
      "The dashboard is too simple. I don't need to be a tech bro to run my brand. Just upload, post the link, and cash out. 🚀",
    avatar:
      "https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=100&auto=format&fit=crop&q=60",
  },
];

export function LandingCommunity() {
  return (
    <section className="py-32 bg-zinc-950 border-y border-white/5 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] -z-10" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-4">
            <Twitter size={12} fill="currentColor" />
            Community Love
          </div>
          <h2 className="text-4xl md:text-5xl font-black">
            DON'T JUST TAKE OUR <br />{" "}
            <span className="text-zinc-600">WORD FOR IT</span>.
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {TWEETS.map((tweet, i) => (
            <div
              key={i}
              className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl hover:border-white/20 transition-all duration-300 hover:-translate-y-2"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full overflow-hidden border border-white/10">
                  <img
                    src={tweet.avatar}
                    alt={tweet.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-bold text-white leading-none">
                    {tweet.name}
                  </h4>
                  <p className="text-zinc-500 text-sm">{tweet.handle}</p>
                </div>
                <Twitter className="ml-auto text-zinc-700" size={20} />
              </div>
              <p className="text-zinc-300 text-lg leading-relaxed">
                "{tweet.content}"
              </p>
            </div>
          ))}
        </div>

        {/* Stats Strip */}
        <div className="mt-24 pt-12 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <Stat label="Active Stores" value="50+" />
          <Stat label="Drops Hosted" value="120+" />
          <Stat label="Total Volume" value="GH₵ 850k+" />
          <Stat label="Avg. Sellout Time" value="45m" />
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-4xl md:text-5xl font-black text-white">{value}</h4>
      <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">
        {label}
      </p>
    </div>
  );
}
