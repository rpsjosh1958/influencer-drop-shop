"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag, Zap } from "lucide-react";

type NotificationKind = "order" | "payout";

interface MockNotification {
  title: string;
  message: string;
  kind: NotificationKind;
}

interface QueueItem {
  seq: number;
  notif: MockNotification;
}

// Purely decorative — mirrors the shape and dark-card styling of the real
// in-app notification toast (apps/web/src/components/shop/notification-toast.tsx,
// apps/mobile/components/in-app-notification-banner.tsx), not wired to any
// live Firestore data.
const MOCK_NOTIFICATIONS: MockNotification[] = [
  { title: "New order", message: "Ama K. just paid GH₵180 for 2 items", kind: "order" },
  { title: "New booking", message: "Kojo booked Saturday, 2:00 PM", kind: "order" },
  { title: "New order", message: "Efua S. just paid GH₵95 for 1 item", kind: "order" },
  { title: "Payout sent", message: "GH₵1,240 is on its way to your MoMo", kind: "payout" },
];

const MAX_VISIBLE = 3;
const CYCLE_MS = 1700;

export function HeroNotificationLoop() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const seqRef = useRef(0);
  const indexRef = useRef(0);

  useEffect(() => {
    // Continuous conveyor: a new notification joins at the bottom every
    // tick; once there are more than MAX_VISIBLE, the oldest (top) one
    // drops off so the stack never fully empties or resets.
    const timer = setInterval(() => {
      const notif = MOCK_NOTIFICATIONS[indexRef.current % MOCK_NOTIFICATIONS.length];
      indexRef.current += 1;
      const item: QueueItem = { seq: seqRef.current++, notif };
      setQueue((prev) => {
        const next = [...prev, item];
        return next.length > MAX_VISIBLE
          ? next.slice(next.length - MAX_VISIBLE)
          : next;
      });
    }, CYCLE_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="mt-1 max-w-[360px] mx-auto md:mx-0 md:ml-auto flex flex-col gap-2.5 h-[210px] overflow-hidden relative">
      <AnimatePresence initial={false}>
        {queue.map((item) => (
          <motion.div
            key={item.seq}
            layout
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.96, transition: { duration: 0.3 } }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3"
          >
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {item.notif.kind === "payout" ? (
                <Zap size={16} className="text-amber-400" fill="currentColor" />
              ) : (
                <ShoppingBag size={16} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-white font-semibold text-sm">
                {item.notif.title}
              </div>
              <div className="text-zinc-400 text-xs truncate">
                {item.notif.message}
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
