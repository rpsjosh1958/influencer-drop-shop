"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications, Notification } from "@/context/notification-context";
import { useShopUI } from "@/context/shop-ui-context";
import { Zap, ShoppingBag, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function NotificationToast() {
  const { latestNotification, markAsRead } = useNotifications();
  const [visible, setVisible] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<Notification | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (latestNotification && !latestNotification.read) {
      if (currentNotif?.id !== latestNotification.id) {
        setCurrentNotif(latestNotification);
        setVisible(true);
      }
    }
  }, [latestNotification, currentNotif]);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const { openOrderDetails } = useShopUI();

  const handleClick = () => {
    if (!currentNotif) return;
    markAsRead(currentNotif.id);
    setVisible(false);

    // If order type, open modal
    if (currentNotif.type === "order_update" && currentNotif.data?.orderId) {
      openOrderDetails(currentNotif.data.orderId);
    }
  };

  return (
    <AnimatePresence>
      {visible && currentNotif && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed top-6 inset-x-4 md:inset-x-auto md:left-auto md:right-6 md:top-24 z-[60] md:w-full md:max-w-sm"
        >
          <div
            onClick={handleClick}
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-zinc-800 transition-colors relative overflow-hidden"
          >
            {/* Icon */}
            <div className="h-10 w-10 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 items-center justify-center flex">
              {currentNotif.type === "drop" ||
              currentNotif.type === "broadcast" ? (
                <Zap size={18} className="text-yellow-400 fill-yellow-400" />
              ) : (
                <ShoppingBag size={18} className="text-white" />
              )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h4 className="text-white font-bold text-sm truncate">
                {currentNotif.title}
              </h4>
              <p className="text-zinc-400 text-xs truncate">
                {currentNotif.message}
              </p>
            </div>

            {/* Close Button (Optional, click whole tile works too) */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
              className="p-1 hover:bg-zinc-700 rounded-full text-zinc-500 hover:text-white"
            >
              <X size={14} />
            </button>

            {/* Unread indicator */}
            <div className="absolute top-3 left-3 w-2 h-2 bg-cyan-400 rounded-full" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
