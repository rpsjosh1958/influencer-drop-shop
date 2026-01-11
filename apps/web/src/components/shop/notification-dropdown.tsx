"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, ShoppingBag, Zap, Bell } from "lucide-react";
import { useNotifications, Notification } from "@/context/notification-context";
import { formatDistanceToNow } from "date-fns";
import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock";
import { useShopUI } from "@/context/shop-ui-context";

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationDropdown({
  isOpen,
  onClose,
}: NotificationDropdownProps) {
  const { notifications, markAsRead, loading } = useNotifications();
  const { openOrderDetails } = useShopUI();

  useBodyScrollLock(isOpen);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop (invisible but handles outside click) */}
          <div
            onClick={onClose}
            className="fixed inset-0 z-40 bg-transparent"
          />

          {/* Wrapper to position correctly relative to the bell if needed, OR fixed simplified */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed top-20 right-4 sm:right-20 w-80 sm:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[60vh]"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-white" />
                <h3 className="text-white font-bold text-sm">Notifications</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-zinc-800 rounded-full text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-1">
              {loading ? (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  Loading...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-center px-6">
                  <div className="w-12 h-12 rounded-full bg-zinc-800/50 flex items-center justify-center mb-3">
                    <Bell size={20} className="text-zinc-600" />
                  </div>
                  <p className="text-zinc-400 text-sm font-medium">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (!item.read) markAsRead(item.id);
                      const orderId = item.data?.orderId || item.orderId;
                      if (item.type === "order_update" && orderId) {
                        onClose();
                        openOrderDetails(orderId);
                      }
                    }}
                    className={`w-full text-left p-3 rounded-xl flex gap-3 transition-all ${
                      item.read
                        ? "hover:bg-zinc-800/50 opacity-60 hover:opacity-100"
                        : "bg-zinc-800/40 hover:bg-zinc-800 border-l-2 border-cyan-500"
                    }`}
                  >
                    <div className="h-8 w-8 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700 shrink-0">
                      {item.type === "drop" || item.type === "broadcast" ? (
                        <Zap
                          size={14}
                          className="text-yellow-400 fill-yellow-400"
                        />
                      ) : (
                        <ShoppingBag size={14} className="text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-0.5">
                        <p
                          className={`text-sm truncate pr-2 ${
                            item.read
                              ? "text-zinc-400 font-medium"
                              : "text-white font-bold"
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-zinc-500 shrink-0">
                          {item.createdAt?.seconds
                            ? formatDistanceToNow(
                                new Date(item.createdAt.seconds * 1000),
                                { addSuffix: true }
                              )
                            : "Just now"}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
