"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LiveStore {
  id: string;
  name: string;
  category?: string;
  logo?: string;
}

const MAX_STORES = 6;

export function LandingLiveStores() {
  const [stores, setStores] = useState<LiveStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchLiveStores() {
      try {
        // Single-field query only — status+onboardingStatus has no composite
        // index, and adding one risks a silent FAILED_PRECONDITION if it's
        // ever missed on deploy. Filter the rest client-side instead.
        const q = query(collection(db, "stores"), where("status", "==", "live"));
        const snapshot = await getDocs(q);
        const approved = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }) as LiveStore & {
            onboardingStatus?: string;
            isSuspended?: boolean;
            createdAt?: { seconds: number };
          })
          .filter((s) => s.onboardingStatus === "approved" && !s.isSuspended)
          .sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0))
          .slice(0, MAX_STORES);

        if (!cancelled) setStores(approved);
      } catch (error) {
        console.error("LandingLiveStores: failed to fetch stores", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLiveStores();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section
      id="stores"
      className="scroll-mt-20 max-w-[1240px] mx-auto px-6 md:px-7 pt-[110px]"
    >
      <div className="flex items-baseline justify-between gap-6 flex-wrap mb-7">
        <h2 className="font-[family-name:var(--font-gloock)] font-normal text-[clamp(28px,3.4vw,40px)] tracking-[-0.02em]">
          Shops already live
        </h2>
        <Link
          href="/search"
          className="font-[family-name:var(--font-spline-mono)] text-[11.5px] tracking-[0.1em] uppercase text-[#B4472B] hover:opacity-70"
        >
          See all stores →
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-3.5 overflow-x-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="shrink-0 w-[170px] rounded-xl border border-[#14130F]/14 bg-[#F7F5F0] overflow-hidden animate-pulse"
            >
              <div className="w-full aspect-[4/5] bg-[#E5E0D6]" />
              <div className="p-3">
                <div className="h-3.5 w-20 rounded bg-[#E5E0D6] mb-2" />
                <div className="h-2.5 w-14 rounded bg-[#E5E0D6]" />
              </div>
            </div>
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[#14130F]/20 bg-[#F7F5F0] py-16 px-6 text-center">
          <p className="text-[15px] font-medium text-[#14130F]/60">
            First stores launching soon.
          </p>
        </div>
      ) : (
        <div className="flex gap-3.5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1">
          {stores.map((store) => (
            <Link
              key={store.id}
              href={`/shop/${store.id}`}
              className="group shrink-0 w-[170px] snap-start block rounded-xl border border-[#14130F]/14 bg-[#F7F5F0] overflow-hidden hover:border-[#14130F] transition-colors"
            >
              <div className="relative w-full aspect-[4/5] bg-[#E5E0D6] overflow-hidden">
                {store.logo ? (
                  <Image
                    src={store.logo}
                    alt={store.name}
                    fill
                    className="object-cover"
                    sizes="170px"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center font-[family-name:var(--font-gloock)] text-3xl text-[#14130F]/30">
                    {store.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-semibold mb-0.5 truncate">
                  {store.name}
                </div>
                <div className="font-[family-name:var(--font-spline-mono)] text-[10.5px] tracking-[0.06em] uppercase text-[#14130F]/70 truncate">
                  {store.category || "Store"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
