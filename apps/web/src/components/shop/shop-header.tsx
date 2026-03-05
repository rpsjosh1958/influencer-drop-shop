"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Package,
  User,
  LogOut,
  MoreHorizontal,
  X,
  ShoppingCart,
} from "lucide-react";
import { HeaderSearch } from "./header-search";
import { StoreSwitcher } from "./store-switcher";
import { NotificationDropdown } from "./notification-dropdown";
import { useNotifications } from "@/context/notification-context";

interface ShopHeaderProps {
  user: any;
  storeId: string;
  bgColor: string;
  primaryColor: string;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (val: boolean) => void;
  isNotificationsOpen: boolean;
  setIsNotificationsOpen: (val: boolean) => void;
  isOrdersOpen: boolean;
  setIsOrdersOpen: (val: boolean) => void;
  isDropdownOpen: boolean;
  setIsDropdownOpen: (val: boolean) => void;
  setIsProfileOpen: (val: boolean) => void;
  setIsCartOpen: (val: boolean) => void;
  handleLogout: () => void;
  addToCart: (item: any) => void;
  cartCount: number;
  router: any;
}

export function ShopHeader({
  user,
  storeId,
  bgColor,
  primaryColor,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  isNotificationsOpen,
  setIsNotificationsOpen,
  isOrdersOpen,
  setIsOrdersOpen,
  isDropdownOpen,
  setIsDropdownOpen,
  setIsProfileOpen,
  setIsCartOpen,
  handleLogout,
  addToCart,
  cartCount,
  router,
}: ShopHeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 backdrop-blur-md border-b border-black/5 px-6 py-4 flex items-center justify-between transition-colors duration-300"
      style={{
        backgroundColor: `${bgColor}CC`,
        borderColor: `${primaryColor}10`,
      }}
    >
      {/* Store Name / Switcher */}
      <div className="md:hidden flex-1 min-w-0">
        <AnimatePresence mode="popLayout">
          {!isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <StoreSwitcher />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="hidden md:flex items-center gap-2 flex-1 min-w-0">
        <StoreSwitcher />
      </div>

      {/* Action Bar */}
      <div className="flex items-center gap-4 justify-end shrink-0">
        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-4">
          <HeaderSearch
            onAddToCart={addToCart}
            onSearchOpen={() => {}} // Can be passed if needed
          />

          {user && (
            <div className="relative">
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
                style={{ color: primaryColor }}
              >
                <Bell size={20} />
                <NotificationBadge />
              </button>
              <NotificationDropdown
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
              />
            </div>
          )}
          {user && (
            <button
              onClick={() => setIsOrdersOpen(true)}
              className="p-2 hover:bg-black/5 rounded-full transition-colors"
              style={{ color: primaryColor }}
              title="Your Orders"
            >
              <Package size={20} />
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                if (!user) {
                  router.push(`/shop/${storeId}/login`);
                } else {
                  setIsDropdownOpen(!isDropdownOpen);
                }
              }}
              className="p-2 hover:bg-black/5 rounded-full transition-colors flex items-center gap-2"
              style={{ color: primaryColor }}
            >
              <User size={20} />
            </button>

            <AnimatePresence>
              {isDropdownOpen && user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 py-1"
                >
                  <button
                    onClick={() => {
                      setIsDropdownOpen(false);
                      setIsProfileOpen(true);
                    }}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-50 flex items-center gap-2 text-black"
                  >
                    <User size={16} /> Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-red-50 text-red-500 flex items-center gap-2"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile Actions */}
        <div className="md:hidden flex items-center gap-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {(!isMobileMenuOpen && (
              <motion.div
                key="mobile-toggle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-4"
              >
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
                  style={{ color: primaryColor }}
                >
                  <MoreHorizontal size={24} />
                  <NotificationBadge />
                </button>
              </motion.div>
            )) || (
              <motion.div
                key="mobile-actions-expanded"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-4"
              >
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  style={{ color: primaryColor }}
                >
                  <X size={24} />
                </button>

                <HeaderSearch
                  onAddToCart={addToCart}
                  onSearchOpen={() => {}}
                />

                {user && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setIsNotificationsOpen(!isNotificationsOpen)
                      }
                      className="p-2 hover:bg-black/5 rounded-full transition-colors relative"
                      style={{ color: primaryColor }}
                    >
                      <Bell size={20} />
                      <NotificationBadge />
                    </button>
                    <NotificationDropdown
                      isOpen={isNotificationsOpen}
                      onClose={() => setIsNotificationsOpen(false)}
                    />
                  </div>
                )}
                {user && (
                  <button
                    onClick={() => setIsOrdersOpen(true)}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                    style={{ color: primaryColor }}
                    title="Your Orders"
                  >
                    <Package size={20} />
                  </button>
                )}

                <div className="relative">
                  <button
                    onClick={() => {
                      if (!user) {
                        router.push(`/shop/${storeId}/login`);
                      } else {
                        setIsDropdownOpen(!isDropdownOpen);
                      }
                    }}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors flex items-center gap-2"
                    style={{ color: primaryColor }}
                  >
                    <User size={20} />
                  </button>

                  <AnimatePresence>
                    {isDropdownOpen && user && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-zinc-100 overflow-hidden z-50 py-1"
                      >
                        <button
                          onClick={() => {
                            setIsDropdownOpen(false);
                            setIsProfileOpen(true);
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-50 flex items-center gap-2 text-black"
                        >
                          <User size={16} /> Profile
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-3 text-sm font-bold hover:bg-red-50 text-red-500 flex items-center gap-2"
                        >
                          <LogOut size={16} /> Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <button
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 hover:bg-black/5 rounded-full transition-colors"
          style={{ color: primaryColor }}
        >
          <ShoppingCart size={24} />
          {cartCount > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold h-4 w-4 flex items-center justify-center rounded-full">
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}

function NotificationBadge() {
  const { unreadCount } = useNotifications();
  if (!unreadCount || unreadCount <= 0) return null;

  return (
    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-white" />
  );
}
