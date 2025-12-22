"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertCircle, XCircle, Info, X } from "lucide-react";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  singleButton?: boolean; // For just "OK" style alerts
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [loading, setLoading] = useState(false);

  const showAlert = (options: AlertOptions) => {
    setAlert(options);
  };

  const closeAlert = () => {
    setAlert(null);
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (alert?.onConfirm) {
      setLoading(true);
      try {
        await alert.onConfirm();
      } finally {
        setLoading(false);
        closeAlert();
      }
    } else {
      closeAlert();
    }
  };

  const getIcon = (type: AlertType = "info") => {
    switch (type) {
      case "success":
        return <CheckCircle2 size={40} className="stroke-[3]" />;
      case "error":
        return <XCircle size={40} className="stroke-[3]" />;
      case "warning":
        return <AlertCircle size={40} className="stroke-[3]" />;
      default:
        return <Info size={40} className="stroke-[3]" />;
    }
  };

  const getColorClasses = (type: AlertType = "info") => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-100",
          text: "text-green-600",
          button: "bg-black hover:bg-zinc-800",
        };
      case "error":
        return {
          bg: "bg-red-100",
          text: "text-red-600",
          button: "bg-red-600 hover:bg-red-700",
        };
      case "warning":
        return {
          bg: "bg-amber-100",
          text: "text-amber-600",
          button: "bg-black hover:bg-zinc-800",
        };
      default:
        return {
          bg: "bg-blue-100",
          text: "text-blue-600",
          button: "bg-black hover:bg-zinc-800",
        };
    }
  };

  const styles = getColorClasses(alert?.type);

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <AnimatePresence>
        {alert && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden"
            >
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${styles.bg} ${styles.text}`}
              >
                {getIcon(alert.type)}
              </div>

              <h2 className="text-2xl font-black tracking-tight mb-2">
                {alert.title}
              </h2>
              <p className="text-zinc-500 mb-8 leading-relaxed">
                {alert.message}
              </p>

              <div className="flex gap-3">
                {!alert.singleButton && (
                  <button
                    onClick={() => {
                      alert.onCancel?.();
                      closeAlert();
                    }}
                    className="flex-1 py-4 rounded-xl font-bold text-lg bg-zinc-100 text-black hover:bg-zinc-200 transition-colors"
                    disabled={loading}
                  >
                    {alert.cancelLabel || "Cancel"}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className={`flex-1 py-4 rounded-xl font-bold text-lg text-white transition-transform active:scale-95 ${styles.button}`}
                  disabled={loading}
                >
                  {loading ? "..." : alert.confirmLabel || "Okay"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
