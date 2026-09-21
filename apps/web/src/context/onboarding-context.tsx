"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Check, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/tooltip";
import { usePathname, useRouter } from "next/navigation";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { useAdminStore } from "@/components/admin/admin-store-provider";

interface TutorialStep {
  target: string;
  title: string;
  content: string;
  path?: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
  padding?: number;
  offsetY?: number;
  offsetX?: number;
  category:
    | "sidebar"
    | "dashboard"
    | "products"
    | "settings"
    | "settings-pro"
    | "orders"
    | "categories"
    | "finance"
    | "support"
    | "complaints"
    | "services"
    | "bookings"
    | "schedule";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  // 1. Sidebar
  {
    target: "sidebar-brand",
    title: "Store Identity",
    content:
      "This is your brand's identity on DROP. All your settings, products, and analytics are tied to this store profile.",
    path: "/admin/dashboard",
    placement: "right",
    padding: 30,
    category: "sidebar",
  },
  {
    target: "sidebar-menu",
    title: "Navigation Menu",
    content:
      "The central hub for your management tools. Each menu here is designed to help you run a specific part of your business.",
    path: "/admin/dashboard",
    placement: "right",
    category: "sidebar",
  },
  {
    target: "sidebar-broadcast",
    title: "Broadcast Tool",
    content:
      "Need to announce a new drop or flash sale? Send instant push notifications to all your customers directly from here.",
    path: "/admin/dashboard",
    placement: "right",
    category: "sidebar",
  },
  {
    target: "sidebar-collapse",
    title: "Sidebar Toggle",
    content:
      "Collapse the sidebar for more screen space or expand it to see full menu labels.",
    path: "/admin/dashboard",
    placement: "right",
    category: "sidebar",
  },
  // 2. Dashboard
  {
    target: "dashboard-status",
    title: "Store Status",
    content:
      "Toggle this to open or close your store. While your store is LIVE, customers can browse and buy, but editing products and services is locked — close the store first to make changes, then reopen when you're ready.",
    path: "/admin/dashboard",
    placement: "bottom",
    category: "dashboard",
  },
  {
    target: "dashboard-filter",
    title: "Date/Month Filter",
    content:
      "Analyze your performance over specific periods. Perfect for tracking monthly growth or reviewing holiday sales spikes.",
    path: "/admin/dashboard",
    placement: "bottom",
    category: "dashboard",
  },
  {
    target: "dashboard-metrics",
    title: "Revenue & Orders Overview",
    content:
      "Your financial pulse. These cards show your total earnings and order volume for the selected time range.",
    path: "/admin/dashboard",
    placement: "bottom",
    category: "dashboard",
  },
  {
    target: "dashboard-analytics",
    title: "Store Performance",
    content:
      "Click here for 'Store Performance'—a deep dive into sales trends, top-selling items, and customer behavior.",
    path: "/admin/dashboard",
    placement: "bottom",
    category: "dashboard",
  },
  {
    // Was pointing at a "dashboard-orders" target that has never existed
    // in the DOM — the real element for this content is the Store
    // Activity feed, which carries data-tour="dashboard-activity".
    target: "dashboard-activity",
    title: "Live Order Feed",
    content:
      "Your business in motion. This real-time feed displays new orders and customer activity the moment it happens.",
    path: "/admin/dashboard",
    placement: "top",
    offsetY: -20,
    category: "dashboard",
  },
  {
    target: "dashboard-needs-attention",
    title: "Needs You Today",
    content:
      "Your priority list — orders waiting to be packed, bookings needing confirmation, low-stock items, and any open complaints, with quick links to sort each one out.",
    path: "/admin/dashboard",
    placement: "top",
    offsetY: -20,
    category: "dashboard",
  },
  {
    target: "dashboard-inventory",
    title: "Inventory Status Summary",
    content:
      "Monitor your stock levels at a glance. Items with low stock are highlighted so you can restock before they sell out.",
    path: "/admin/dashboard",
    placement: "top",
    offsetY: -20, // Shifted up
    category: "dashboard",
  },
  // 3. Products
  {
    target: "products-add",
    title: "Add Product Button",
    content:
      "Ready for a new drop? Click here to create a new product listing with images, pricing, and stock details.",
    path: "/admin/products",
    placement: "bottom",
    category: "products",
  },
  {
    target: "products-bulk",
    title: "Bulk Actions",
    content:
      "Select multiple products to perform batch updates, delete items, or generate promotional images for your entire collection.",
    path: "/admin/products",
    placement: "bottom",
    category: "products",
  },
  {
    target: "products-table",
    title: "Inventory Table",
    content:
      "Manage your items here — edit details and track real-time stock levels. Editing locks automatically while the store is live, to keep what customers see in sync.",
    path: "/admin/products",
    placement: "top",
    offsetY: -20,
    category: "products",
  },
  {
    target: "products-edit-lock",
    title: "Edit or Locked",
    content:
      "This button lets you edit a product — but it shows 'Locked' and can't be tapped while your store is LIVE. Close the store from the dashboard to unlock editing, then reopen once you're done.",
    path: "/admin/products",
    placement: "top",
    offsetY: -20,
    category: "products",
  },
  // 5. Orders
  {
    target: "orders-header",
    title: "Order Management",
    content:
      "This is your orders command center. Use the status filter and date range to quickly find any transaction, then add a manual order or export a PDF report from here.",
    path: "/admin/orders",
    placement: "bottom",
    category: "orders",
  },
  {
    target: "orders-add",
    title: "Add Order",
    content:
      "Record a sale that didn't come through checkout — a walk-in customer, a WhatsApp order, or anything paid outside the platform. It's tagged 'Manual' and won't affect your real payout balance.",
    path: "/admin/orders",
    placement: "bottom",
    category: "orders",
  },
  {
    target: "orders-status-filter",
    title: "Status Filters",
    content:
      "Filter orders by their fulfilment stage — from Open/Paid all the way to Delivered. Stay on top of every shipment.",
    path: "/admin/orders",
    placement: "bottom",
    category: "orders",
  },
  {
    target: "orders-export",
    title: "Export PDF",
    content:
      "Download paginated, filtered, or all orders as a PDF report — perfect for your accounting records.",
    path: "/admin/orders",
    placement: "bottom",
    category: "orders",
  },
  {
    target: "orders-list",
    title: "Order Feed",
    content:
      "Click any order row to open a detailed view, update its status, or view customer shipping information.",
    path: "/admin/orders",
    placement: "top",
    offsetY: -20,
    category: "orders",
  },
  // 6. Categories
  {
    target: "categories-add",
    title: "Add Category",
    content:
      "Create product categories like 'Streetwear' or 'Accessories' to help customers browse your store more easily.",
    path: "/admin/categories",
    placement: "bottom",
    category: "categories",
  },
  {
    target: "categories-list",
    title: "Your Categories",
    content:
      "All your store's categories live here. Hover over one to reveal the delete button. Categories are used to filter products in your shop.",
    path: "/admin/categories",
    placement: "top",
    offsetY: -20,
    category: "categories",
  },
  // 7. Finance
  {
    target: "finance-payout-method",
    title: "Payout Method",
    content:
      "Your earnings settle automatically to this account via Paystack — no need to click withdraw. Tap here anytime to see or change where it goes.",
    path: "/admin/finance",
    placement: "bottom",
    category: "finance",
  },
  {
    target: "finance-statements",
    title: "Monthly Statements",
    content:
      "Download PDF or Excel reports for any month. Great for bookkeeping and tax records.",
    path: "/admin/finance",
    placement: "bottom",
    category: "finance",
  },
  {
    target: "finance-balance",
    title: "Your Earnings",
    content:
      "Settlement shows where your money is headed and how. This Month and Total Earned track what you've made recently and over the store's lifetime — no manual withdrawal needed, it's already on its way.",
    path: "/admin/finance",
    placement: "bottom",
    category: "finance",
  },
  {
    target: "finance-transactions",
    title: "Recent Settlements",
    content:
      "Every sale that's been verified and auto-settled appears here, so you always know exactly where your money came from.",
    path: "/admin/finance",
    placement: "top",
    offsetY: -20,
    category: "finance",
  },
  // 8. Support (Vendor Tickets)
  {
    target: "support-new-ticket",
    title: "New Support Ticket",
    content:
      "Experiencing an issue? Submit a support ticket to the DROP platform team. Include as much detail as possible for a faster resolution.",
    path: "/admin/support",
    placement: "bottom",
    category: "support",
  },
  {
    target: "support-tickets",
    title: "Your Tickets",
    content:
      "All your open and resolved tickets live here. The platform team will respond via email. Check back for status updates.",
    path: "/admin/support",
    placement: "top",
    offsetY: -20,
    category: "support",
  },
  // 9. Complaints (Customer Inbox)
  {
    target: "complaints-filters",
    title: "Complaint Filters",
    content:
      "Filter your inbox by Unread, In Progress, or Resolved to focus on what needs your attention most.",
    path: "/admin/complaints",
    placement: "bottom",
    category: "complaints",
  },
  {
    target: "complaints-list",
    title: "Complaint Inbox",
    content:
      "Customer complaints appear here in real time. Click any complaint to read the full message and take action.",
    path: "/admin/complaints",
    placement: "right",
    padding: 12,
    category: "complaints",
  },
  {
    target: "complaints-detail",
    title: "Reply & Resolve",
    content:
      "Use 'Reply via Email' to respond directly to the customer, then mark the complaint as Resolved to close the ticket.",
    path: "/admin/complaints",
    placement: "left",
    category: "complaints",
  },
  // 10. Services
  {
    target: "services-add",
    title: "Add Service",
    content:
      "Create a new bookable service with a name, description, duration, price, and a cover image.",
    path: "/admin/services",
    placement: "bottom",
    category: "services",
  },
  {
    target: "services-grid",
    title: "Your Services",
    content:
      "Each card shows the service's status. Toggle Active/Inactive to instantly enable or disable booking availability for your customers.",
    path: "/admin/services",
    placement: "top",
    offsetY: -20,
    category: "services",
  },
  // 11. Bookings
  {
    target: "bookings-view-toggle",
    title: "Calendar vs List View",
    content:
      "Switch between a calendar to see your week at a glance, or a list view to manage all bookings in a sortable table.",
    path: "/admin/bookings",
    placement: "bottom",
    category: "bookings",
  },
  {
    target: "bookings-calendar",
    title: "Booking Calendar",
    content:
      "Days with bookings show blue dots. Click any date to see all scheduled appointments and their current status.",
    path: "/admin/bookings",
    placement: "bottom",
    category: "bookings",
  },
  {
    target: "bookings-date-panel",
    title: "Day Detail Panel",
    content:
      "Appointments for the selected date appear here. Click any booking to confirm, complete, cancel, or mark a no-show.",
    path: "/admin/bookings",
    placement: "left",
    category: "bookings",
  },
  // 12. Schedule
  {
    target: "schedule-hours",
    title: "Working Hours",
    content:
      "Toggle each day on or off, then define one or more time slots. This sets when customers can book your services.",
    path: "/admin/schedule",
    placement: "bottom",
    category: "schedule",
  },
  {
    target: "schedule-blocked",
    title: "Blocked Dates",
    content:
      "Select specific dates you're unavailable — holidays, vacations, or personal days. Customers won't be able to book on blocked dates.",
    path: "/admin/schedule",
    placement: "bottom",
    category: "schedule",
  },
  {
    target: "schedule-cancellation",
    title: "Cancellation Window",
    content:
      "Set how many hours before an appointment customers can cancel. This protects your business from last-minute no-shows.",
    path: "/admin/schedule",
    placement: "bottom",
    offsetY: -20,
    category: "schedule",
  },
  // 4. Settings
  {
    // Was tuned for the old vertical left sidebar (placement "right",
    // large negative offsetY to sit alongside a tall element). The
    // tabs are now a horizontal row along the top, so "bottom" with no
    // offset is the correct placement.
    target: "settings-tabs",
    title: "Settings Tabs",
    content:
      "Everything about your store lives here — General details, your Profile, Style, Hero Section, Footer, Announcement banner, Delivery info, Billing, and Payouts. We'll walk through each one.",
    path: "/admin/settings",
    placement: "bottom",
    padding: 12,
    category: "settings",
  },
  {
    target: "settings-type",
    title: "Store Type Configuration",
    content:
      "Tell us what you sell. Choose 'Products' for physical goods, 'Services' for appointments, or 'Hybrid' for both.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-profile",
    title: "Profile & Security",
    content:
      "Your vendor/company details and identity documents live here — reach out to support if anything needs correcting. You can also change your password.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-style",
    title: "Style",
    content:
      "Set your storefront's background color, primary color, and font — this is what shoppers see the moment they land on your shop.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-hero",
    title: "Hero Section",
    content:
      "The big banner at the top of your storefront. Turn it on or off and customize its headline, background, and layout.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-footer",
    title: "Footer",
    content:
      "Add your contact details and social links to the bottom of your storefront, so customers know how to reach you.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-announcement",
    title: "Announcement Banner",
    content:
      "Put a short message across the top of your storefront — a closure, a sale, anything shoppers should see first. Turn it on, set a color, and it appears immediately.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-delivery",
    title: "Delivery Info",
    content:
      "Set which days you deliver and a short delivery estimate — shown to buyers on the product page and at checkout, so they know what to expect before they order.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings",
  },
  {
    target: "settings-billing",
    title: "Billing & Growth Plan",
    content:
      "Manage your subscription. Upgrade to the 'Growth' plan for a Verified Badge, lower transaction fees, and advanced styling options.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings-pro",
  },
  {
    target: "settings-payouts",
    title: "Payout Settings",
    content:
      "Crucial Step: Link your Mobile Money account (MTN, Telecel, AirtelTigo) here to receive your earnings automatically.",
    path: "/admin/settings",
    placement: "top",
    offsetY: -20,
    category: "settings-pro",
  },
];

// Some pages render two versions of the same element for different
// breakpoints (a desktop table + a mobile card list, one always hidden
// via `hidden md:*`/`md:hidden`). A plain querySelector always returns
// the first DOM match regardless of visibility, which can silently
// spotlight a hidden (zero-size) element on the "wrong" breakpoint.
// This picks the first match that's actually visible, falling back to
// whatever matched if none are.
function findVisibleTourTarget(target: string): Element | null {
  const candidates = document.querySelectorAll(`[data-tour="${target}"]`);
  for (const el of Array.from(candidates)) {
    const rect = el.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) return el;
  }
  return candidates[0] ?? null;
}

interface OnboardingContextType {
  isActive: boolean;
  currentStep: number;
  currentStepTarget: string | null;
  startTutorial: (category?: TutorialStep["category"]) => void;
  startStep: (target: string) => void;
  nextStep: () => void;
  prevStep: () => void;
  exitTutorial: () => void;
  hasSeenTutorial: boolean;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(
  undefined,
);

const PATH_TO_CATEGORY: Record<string, TutorialStep["category"]> = {
  "/admin/dashboard": "dashboard",
  "/admin/products": "products",
  "/admin/settings": "settings",
  "/admin/orders": "orders",
  "/admin/categories": "categories",
  "/admin/finance": "finance",
  "/admin/support": "support",
  "/admin/complaints": "complaints",
  "/admin/services": "services",
  "/admin/bookings": "bookings",
  "/admin/schedule": "schedule",
};

export function OnboardingProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [seenTutorials, setSeenTutorials] = useState<Record<string, boolean>>(
    {},
  );
  const seenTutorialsRef = useRef<Record<string, boolean>>({});
  const justExitedRef = useRef(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // 1. Initial Load from Firestore
  useEffect(() => {
    if (!auth.currentUser) return;
    const fetchTutorialStatus = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser!.uid));
        if (userDoc.exists()) {
          const seen = userDoc.data().seenAdminTutorials || {};
          setSeenTutorials(seen);
          seenTutorialsRef.current = seen;
        }
        setHasInitialized(true);
      } catch (e) {
        console.error("Failed to fetch tutorial status", e);
        setHasInitialized(true); // Still initialize to prevent block
      }
    };
    fetchTutorialStatus();
  }, [auth.currentUser]);

  // 2. Automatic Trigger Logic
  // NOTE: seenTutorials is read from ref to avoid re-triggering this effect on exit
  useEffect(() => {
    if (!auth.currentUser || isActive || !hasInitialized) return;

    // Cooldown: prevent immediate re-trigger after exiting a tutorial
    if (justExitedRef.current) {
      justExitedRef.current = false;
      return;
    }

    // Don't show the tutorial on mobile — the dialogue box is not mobile-responsive
    if (typeof window !== "undefined" && window.innerWidth < 768) return;

    const seen = seenTutorialsRef.current;
    const currentCategory = PATH_TO_CATEGORY[pathname];

    if (pathname.startsWith("/admin/")) {
      // Priority 1: Sidebar (Always first if never seen)
      if (!seen["sidebar"]) {
        const timer = setTimeout(() => {
          const index = TUTORIAL_STEPS.findIndex(
            (s) => s.category === "sidebar",
          );
          if (index !== -1) {
            setCurrentStep(index);
            setIsActive(true);
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
      // Priority 2: Page-specific tutorial
      else if (currentCategory && !seen[currentCategory]) {
        const delay = 1500;
        const timer = setTimeout(() => {
          const index = TUTORIAL_STEPS.findIndex(
            (s) => s.category === currentCategory,
          );
          if (index !== -1) {
            setCurrentStep(index);
            setIsActive(true);
          }
        }, delay);
        return () => clearTimeout(timer);
      }
    }
  }, [pathname, hasInitialized]);

  const updateTargetRect = useCallback(() => {
    const step = TUTORIAL_STEPS[currentStep];
    const element = findVisibleTourTarget(step.target);
    if (element) {
      setTargetRect(element.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [currentStep]);

  // Scroll logic
  useEffect(() => {
    if (isActive) {
      const step = TUTORIAL_STEPS[currentStep];
      const element = findVisibleTourTarget(step.target);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        // After scrolling finishes, update the rect
        setTimeout(updateTargetRect, 500);
      }
    }
  }, [isActive, currentStep, updateTargetRect]);

  useEffect(() => {
    if (isActive) {
      updateTargetRect();
      const interval = setInterval(updateTargetRect, 300); // Fast poll for transitions
      window.addEventListener("resize", updateTargetRect);
      window.addEventListener("scroll", updateTargetRect, true);
      return () => {
        clearInterval(interval);
        window.removeEventListener("resize", updateTargetRect);
        window.removeEventListener("scroll", updateTargetRect, true);
      };
    }
  }, [isActive, updateTargetRect]);

  const startTutorial = (category?: TutorialStep["category"]) => {
    if (category) {
      const index = TUTORIAL_STEPS.findIndex((s) => s.category === category);
      if (index !== -1) {
        setCurrentStep(index);
        setIsActive(true);
        return;
      }
    }
    setCurrentStep(0);
    setIsActive(true);
  };

  const startStep = (target: string) => {
    const index = TUTORIAL_STEPS.findIndex((s) => s.target === target);
    if (index !== -1) {
      setCurrentStep(index);
      setIsActive(true);
    }
  };

  const nextStep = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const currentCategory = TUTORIAL_STEPS[currentStep].category;
      const nextIndex = currentStep + 1;
      const nextStepObj = TUTORIAL_STEPS[nextIndex];

      // If category changes, exit automatically (prevents overflow from general settings to pro)
      if (nextStepObj.category !== currentCategory) {
        exitTutorial();
        return;
      }

      if (nextStepObj.path && nextStepObj.path !== pathname) {
        router.push(nextStepObj.path);
      }
      setCurrentStep(nextIndex);
    } else {
      exitTutorial();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const currentCategory = TUTORIAL_STEPS[currentStep].category;
      const prevIndex = currentStep - 1;
      const prevStepObj = TUTORIAL_STEPS[prevIndex];

      // Stop if previous step is a different category
      if (prevStepObj.category !== currentCategory) {
        return;
      }

      if (prevStepObj.path && prevStepObj.path !== pathname) {
        router.push(prevStepObj.path);
      }
      setCurrentStep(prevIndex);
    }
  };

  const exitTutorial = async () => {
    const currentCategory = TUTORIAL_STEPS[currentStep].category;
    justExitedRef.current = true;
    setIsActive(false);

    if (auth.currentUser) {
      try {
        const newSeen = { ...seenTutorials, [currentCategory]: true };
        seenTutorialsRef.current = newSeen;
        // setDoc+merge, not updateDoc — see store-switcher.tsx's
        // AddStoreModal for why (updateDoc throws NOT_FOUND on a missing
        // users/{uid} doc; this failed the same way for any account
        // without one, e.g. a super-admin login).
        await setDoc(
          doc(db, "users", auth.currentUser.uid),
          { seenAdminTutorials: newSeen },
          { merge: true }
        );
        setSeenTutorials(newSeen);
      } catch (e) {
        console.error("Failed to update tutorial status", e);
      }
    }
  };

  const step = TUTORIAL_STEPS[currentStep];

  // Positioning Logic
  const getDialogueStyles = () => {
    const boxWidth = 320;
    // Content length varies a lot between steps (some are one short
    // sentence, some are several) but this box height is only an
    // estimate used to decide placement — it can't measure the real
    // rendered card without a two-pass layout. Sized generously so the
    // flip logic below errs toward "not enough room" rather than
    // silently letting a taller card overlap the target.
    const boxHeight = 360;
    const gap = 25;
    const margin = 20;

    if (!targetRect) {
      return {
        left: "50%",
        top: "50%",
        x: "-50%",
        y: "-50%",
        position: "fixed" as const,
        placement: step.placement,
      };
    }

    let left = targetRect.left + targetRect.width / 2 - boxWidth / 2;
    let top = targetRect.bottom + gap;
    let placement = step.placement;

    // Flip to the opposite side if the preferred placement doesn't
    // actually have room — otherwise the boundary clamp below just
    // pins the box in place and it ends up covering the target it's
    // supposed to be pointing at (which is what was happening here).
    // The arrow below reads this same (possibly flipped) placement, so
    // it always points back at the target regardless of which side the
    // card actually landed on.
    if (placement === "top" && targetRect.top - boxHeight - gap < margin) {
      placement = "bottom";
    } else if (
      placement === "bottom" &&
      targetRect.bottom + boxHeight + gap > window.innerHeight - margin
    ) {
      placement = "top";
    }

    if (placement === "right") {
      left = targetRect.right + gap;
      top = targetRect.top + targetRect.height / 2 - boxHeight / 2;
      if (left + boxWidth > window.innerWidth - margin) {
        left = targetRect.left - boxWidth - gap;
        placement = "left";
      }
    } else if (placement === "left") {
      left = targetRect.left - boxWidth - gap;
      top = targetRect.top + targetRect.height / 2 - boxHeight / 2;
      if (left < margin) {
        left = targetRect.right + gap;
        placement = "right";
      }
    } else if (placement === "top") {
      top = targetRect.top - boxHeight - gap;
    } else {
      top = targetRect.bottom + gap;
    }

    // Apply manual offsets
    left += step.offsetX || 0;
    top += step.offsetY || 0;

    // Boundary checks — last-resort safety net if flipping still
    // doesn't leave enough room (e.g. a very short viewport).
    left = Math.min(Math.max(margin, left), window.innerWidth - boxWidth - margin);
    top = Math.min(Math.max(margin, top), window.innerHeight - boxHeight - margin);

    return { left, top, x: 0, y: 0, placement };
  };

  const dialogStyles = getDialogueStyles();

  return (
    <OnboardingContext.Provider
      value={{
        isActive,
        currentStep,
        currentStepTarget: step.target,
        startTutorial,
        startStep,
        nextStep,
        prevStep,
        exitTutorial,
        hasSeenTutorial: Object.keys(seenTutorials).length > 0,
      }}
    >
      {children}
      <AnimatePresence>
        {isActive && (
          <div className="fixed inset-0 z-[10000] pointer-events-none">
            {/* Dark overlay with a "hole" cut around the target — a
                box-shadow spotlight rather than an SVG mask, since
                mask + backdrop-filter combinations are a known rough edge
                across browsers. Falls back to a plain full dim (no hole)
                when there's no target yet. */}
            {targetRect ? (
              <div
                className="absolute rounded-2xl pointer-events-auto"
                style={{
                  left: targetRect.left - (step.padding || 12),
                  top: targetRect.top - (step.padding || 12),
                  width:
                    targetRect.width + (step.padding ? step.padding * 2 : 24),
                  height:
                    targetRect.height +
                    (step.padding ? step.padding * 2 : 24),
                  boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.75)",
                }}
                onClick={exitTutorial}
              />
            ) : (
              <div
                className="absolute inset-0 pointer-events-auto"
                style={{ backgroundColor: "rgba(0, 0, 0, 0.75)" }}
                onClick={exitTutorial}
              />
            )}

            {/* Dialogue Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, ...dialogStyles }}
              animate={{ opacity: 1, scale: 1, ...dialogStyles }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: "spring", damping: 30, stiffness: 250 }}
              className="absolute w-[320px] bg-white dark:bg-zinc-900 rounded-[2.5rem] shadow-2xl p-7 pointer-events-auto border border-zinc-200 dark:border-zinc-800"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="px-3 py-1 bg-purple-500/10 rounded-full">
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-600">
                    {(() => {
                      const categorySteps = TUTORIAL_STEPS.filter(
                        (s) => s.category === step.category,
                      );
                      const relativeIndex =
                        categorySteps.findIndex(
                          (s) => s.target === step.target,
                        ) + 1;
                      const categoryLabel =
                        step.category.includes("pro") ||
                        step.category.includes("payouts")
                          ? "PRO "
                          : "";
                      return `${categoryLabel}Step ${relativeIndex} / ${categorySteps.length}`;
                    })()}
                  </span>
                </div>
                <button
                  onClick={exitTutorial}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              <h3 className="text-xl font-black uppercase tracking-tighter text-zinc-900 dark:text-zinc-50 mb-2">
                {step.title}
              </h3>
              <p className="text-[13px] text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8">
                {step.content}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  <button
                    onClick={prevStep}
                    disabled={currentStep === 0}
                    className="w-10 h-10 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded-2xl disabled:opacity-30 transition-all hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={nextStep}
                    className="w-10 h-10 flex items-center justify-center bg-black dark:bg-white text-white dark:text-black rounded-2xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-black/10"
                  >
                    {currentStep === TUTORIAL_STEPS.length - 1 ? (
                      <Check size={20} />
                    ) : (
                      <ChevronRight size={20} />
                    )}
                  </button>
                </div>

                <button
                  onClick={exitTutorial}
                  className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 transition-colors"
                >
                  Exit Tour
                </button>
              </div>

              {/* Dynamic Arrow - Only if targetRect exists. Reads the
                  same (possibly flip-adjusted) placement the card was
                  actually positioned with, not the step's declared
                  placement, so it always points back at the target. */}
              {targetRect && (
                <div
                  className={cn(
                    "absolute w-4 h-4 bg-white dark:bg-zinc-900 rotate-45 border-zinc-200 dark:border-zinc-800",
                    dialogStyles.placement === "right"
                      ? "left-[-8px] top-1/2 -translate-y-1/2 border-l border-b"
                      : dialogStyles.placement === "left"
                        ? "right-[-8px] top-1/2 -translate-y-1/2 border-r border-t"
                        : dialogStyles.placement === "top"
                          ? "bottom-[-8px] left-1/2 -translate-x-1/2 border-r border-b"
                          : "top-[-8px] left-1/2 -translate-x-1/2 border-l border-t",
                  )}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined)
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  return context;
};

// Help Trigger Component
export function HelpTrigger({
  category,
  target,
}: {
  category?: TutorialStep["category"];
  target?: string;
}) {
  const { startTutorial, startStep } = useOnboarding();
  return (
    <span className="hidden md:inline-flex">
      <Tooltip content="How it works?" side="right">
        <button
          onClick={() => {
            if (target) startStep(target);
            else if (category) startTutorial(category);
          }}
          className="p-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-400 hover:text-purple-500 rounded-lg transition-all"
        >
          <HelpCircle size={18} />
        </button>
      </Tooltip>
    </span>
  );
}
