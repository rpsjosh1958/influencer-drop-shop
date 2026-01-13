import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react-native";
import { BlurView } from "expo-blur";
import clsx from "clsx";

type AlertType = "success" | "error" | "warning" | "info";

interface AlertOptions {
  title: string;
  message: string;
  type?: AlertType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  singleButton?: boolean;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alert, setAlert] = useState<AlertOptions | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const showAlert = (options: AlertOptions) => {
    console.log("showAlert called with:", options.title);
    setAlert(options);
    setVisible(true);
  };

  const closeAlert = () => {
    setVisible(false);
    setLoading(false);
    // Note: We do NOT clear setAlert(null) here to allow the modal to fade out
    // while the content is still rendered. It will be overwritten next time,
    // or we could use a timeout to clear it if strictly necessary, but not needed.
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
    const size = 40;
    const strokeWidth = 3;
    switch (type) {
      case "success":
        return (
          <CheckCircle size={size} strokeWidth={strokeWidth} color="#16a34a" />
        ); // green-600
      case "error":
        return (
          <XCircle size={size} strokeWidth={strokeWidth} color="#dc2626" />
        ); // red-600
      case "warning":
        return (
          <AlertCircle size={size} strokeWidth={strokeWidth} color="#d97706" />
        ); // amber-600
      default:
        return <Info size={size} strokeWidth={strokeWidth} color="#2563eb" />; // blue-600
    }
  };

  const getColors = (type: AlertType = "info") => {
    switch (type) {
      case "success":
        return {
          bg: "bg-green-100",
          button: "bg-black",
        };
      case "error":
        return {
          bg: "bg-red-100",
          button: "bg-red-500",
        };
      case "warning":
        return {
          bg: "bg-amber-100",
          button: "bg-black",
        };
      default:
        return {
          bg: "bg-blue-100",
          button: "bg-black",
        };
    }
  };

  const styles = alert ? getColors(alert.type) : { bg: "", button: "" };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        presentationStyle="overFullScreen"
        onRequestClose={() => {
          if (!loading && !alert?.singleButton) {
            alert?.onCancel?.();
            closeAlert();
          }
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50 px-6">
          <View className="bg-white w-full max-w-sm rounded-[48px] p-8 items-center shadow-2xl">
            {alert && (
              <>
                <View
                  className={clsx(
                    "w-20 h-20 rounded-full items-center justify-center mb-6",
                    styles.bg
                  )}
                >
                  {getIcon(alert.type)}
                </View>

                <Text className="text-2xl font-black text-center mb-2 text-black">
                  {alert.title}
                </Text>

                <Text className="text-zinc-500 text-center text-base leading-6 mb-8">
                  {alert.message}
                </Text>

                <View className="flex-row gap-3 w-full">
                  {!alert.singleButton && (
                    <TouchableOpacity
                      onPress={() => {
                        alert.onCancel?.();
                        closeAlert();
                      }}
                      disabled={loading}
                      className="flex-1 py-4 rounded-2xl bg-zinc-100 items-center justify-center active:opacity-75"
                    >
                      <Text className="font-bold text-lg text-black">
                        {alert.cancelLabel || "Cancel"}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleConfirm}
                    disabled={loading}
                    className={clsx(
                      "flex-1 py-4 rounded-2xl items-center justify-center active:opacity-75 shadow-md",
                      styles.button
                    )}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text className="font-bold text-lg text-white">
                        {alert.confirmLabel || "Okay"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
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
