import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { CheckCircle, AlertCircle, XCircle, Info } from "lucide-react-native";
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
  // Red confirm button regardless of `type` — for "Close Store", "Sign Out" etc.
  destructive?: boolean;
}

interface ActionSheetOption {
  label: string;
  onPress: () => void;
  destructive?: boolean;
}

interface ActionSheetOptions {
  title: string;
  message?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  // A list of choices in the same card style — replaces ActionSheetIOS and
  // native Alert button lists (which Android caps at 3 buttons).
  showActionSheet: (options: ActionSheetOptions) => void;
}

type Dialog =
  | ({ kind: "alert" } & AlertOptions)
  | ({ kind: "sheet" } & ActionSheetOptions);

interface DialogState {
  dialog: Dialog | null;
  visible: boolean;
  loading: boolean;
  topHostId: number | null;
  registerHost: (id: number) => void;
  unregisterHost: (id: number) => void;
  confirm: () => void;
  cancel: () => void;
  requestClose: () => void;
  pick: (option: ActionSheetOption) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);
const DialogStateContext = createContext<DialogState | undefined>(undefined);

let hostCounter = 0;

export function AlertProvider({ children }: { children: ReactNode }) {
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  // <AlertHost />s inside currently-open modals, in the order they opened.
  const [hostIds, setHostIds] = useState<number[]>([]);
  // Bumped on every open, so confirm() can tell whether onConfirm opened a
  // follow-up dialog (e.g. "Order updated" after a confirm) and leave it up.
  const dialogIdRef = useRef(0);

  const openDialog = useCallback((next: Dialog) => {
    dialogIdRef.current += 1;
    setDialog(next);
    setLoading(false);
    setVisible(true);
  }, []);

  const showAlert = useCallback(
    (options: AlertOptions) => openDialog({ kind: "alert", ...options }),
    [openDialog],
  );

  const showActionSheet = useCallback(
    (options: ActionSheetOptions) => openDialog({ kind: "sheet", ...options }),
    [openDialog],
  );

  const registerHost = useCallback((id: number) => {
    setHostIds((ids) => [...ids, id]);
  }, []);

  // If the modal an alert is showing in closes first, the alert moves to the
  // next host down (or the root). On iOS a modal's children only unmount once
  // its dismiss animation has finished, so the next one can present by then.
  const unregisterHost = useCallback((id: number) => {
    setHostIds((ids) => ids.filter((hostId) => hostId !== id));
  }, []);

  const closeDialog = () => {
    setVisible(false);
    setLoading(false);
    // The dialog itself isn't cleared, so its content stays rendered while
    // the modal fades out. It's overwritten by the next showAlert.
  };

  const confirm = async () => {
    if (dialog?.kind !== "alert" || !dialog.onConfirm) {
      closeDialog();
      return;
    }
    const id = dialogIdRef.current;
    const result = dialog.onConfirm();
    if (dialogIdRef.current !== id) return;
    // A sync onConfirm closes in the same update as whatever it did (e.g.
    // closing the modal this alert sits in), so nothing flashes in between.
    if (!(result instanceof Promise)) {
      closeDialog();
      return;
    }
    setLoading(true);
    try {
      await result;
    } finally {
      if (dialogIdRef.current === id) closeDialog();
    }
  };

  const cancel = () => {
    const onCancel = dialog?.kind === "alert" ? dialog.onCancel : undefined;
    closeDialog();
    onCancel?.();
  };

  // Android back button / iOS swipe-down.
  const requestClose = () => {
    if (loading) return;
    if (dialog?.kind === "alert" && dialog.singleButton) return;
    cancel();
  };

  // Closes the sheet before running the option, so an option that opens
  // another dialog (e.g. a confirm) just swaps the content in place.
  const pick = (option: ActionSheetOption) => {
    closeDialog();
    option.onPress();
  };

  const topHostId = hostIds.length > 0 ? hostIds[hostIds.length - 1] : null;

  const actions = useMemo(
    () => ({ showAlert, showActionSheet }),
    [showAlert, showActionSheet],
  );

  const state: DialogState = {
    dialog,
    visible,
    loading,
    topHostId,
    registerHost,
    unregisterHost,
    confirm,
    cancel,
    requestClose,
    pick,
  };

  return (
    <AlertContext.Provider value={actions}>
      <DialogStateContext.Provider value={state}>
        {children}
        <Modal
          visible={visible && topHostId === null}
          transparent
          animationType="fade"
          statusBarTranslucent
          presentationStyle="overFullScreen"
          onRequestClose={requestClose}
        >
          <DialogBackdrop>
            <DialogCard state={state} />
          </DialogBackdrop>
        </Modal>
      </DialogStateContext.Provider>
    </AlertContext.Provider>
  );
}

/**
 * Render as the last child of any <Modal> that can raise an alert while it's
 * open. The root alert modal can't show over another open modal on iOS
 * (UIKit won't present from a view controller that's already presenting),
 * so alerts raised while this modal is open render here instead.
 */
export function AlertHost() {
  const state = useContext(DialogStateContext);
  if (!state) {
    throw new Error("AlertHost must be used within an AlertProvider");
  }
  const [id] = useState(() => ++hostCounter);
  const { registerHost, unregisterHost } = state;

  useLayoutEffect(() => {
    registerHost(id);
    return () => unregisterHost(id);
  }, [id, registerHost, unregisterHost]);

  const active = state.visible && state.topHostId === id;

  if (Platform.OS === "ios") {
    // Drawn in place, over this modal's content (a Modal's children sit in a
    // full-screen container, so absoluteFill covers the whole modal).
    if (!active) return null;
    return (
      <FadeIn>
        <DialogBackdrop>
          <DialogCard state={state} />
        </DialogBackdrop>
      </FadeIn>
    );
  }

  // Android stacks dialogs fine, and a nested Modal gets the back button.
  return (
    <Modal
      visible={active}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={state.requestClose}
    >
      <DialogBackdrop>
        <DialogCard state={state} />
      </DialogBackdrop>
    </Modal>
  );
}

// Plain Animated rather than Moti/Reanimated — see store-switcher.tsx for the
// freeze those cause when they start inside a <Modal>.
function FadeIn({ children }: { children: ReactNode }) {
  const [opacity] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [opacity]);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { opacity, zIndex: 1000 }]}>
      {children}
    </Animated.View>
  );
}

function DialogBackdrop({ children }: { children: ReactNode }) {
  return (
    <View className="flex-1 justify-center items-center bg-black/50 px-6">
      {children}
    </View>
  );
}

const getIcon = (type: AlertType = "info") => {
  const size = 40;
  const strokeWidth = 3;
  switch (type) {
    case "success":
      return (
        <CheckCircle size={size} strokeWidth={strokeWidth} color="#16a34a" />
      ); // green-600
    case "error":
      return <XCircle size={size} strokeWidth={strokeWidth} color="#dc2626" />; // red-600
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

function DialogCard({ state }: { state: DialogState }) {
  const { dialog, loading, confirm, cancel, pick } = state;

  if (dialog?.kind === "sheet") {
    return (
      <View className="bg-white w-full max-w-sm rounded-[40px] p-6 shadow-2xl">
        <Text className="text-xl font-black text-center uppercase text-black">
          {dialog.title}
        </Text>
        {!!dialog.message && (
          <Text className="text-zinc-500 text-center text-sm mt-1">
            {dialog.message}
          </Text>
        )}
        <View className="gap-2 mt-6">
          {dialog.options.map((option) => (
            <TouchableOpacity
              key={option.label}
              onPress={() => pick(option)}
              className={clsx(
                "p-4 rounded-2xl border active:opacity-75",
                option.destructive
                  ? "bg-red-50 border-red-100"
                  : "bg-zinc-50 border-zinc-100",
              )}
            >
              <Text
                className={clsx(
                  "text-center font-bold text-base",
                  option.destructive ? "text-red-600" : "text-zinc-900",
                )}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity
          onPress={cancel}
          className="mt-4 bg-black p-4 rounded-2xl active:opacity-75"
        >
          <Text className="text-center font-bold text-base text-white">
            {dialog.cancelLabel || "Cancel"}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const colors = dialog ? getColors(dialog.type) : { bg: "", button: "" };

  return (
    <View className="bg-white w-full max-w-sm rounded-[48px] p-8 items-center shadow-2xl">
      {dialog && (
        <>
          <View
            className={clsx(
              "w-20 h-20 rounded-full items-center justify-center mb-6",
              colors.bg,
            )}
          >
            {getIcon(dialog.type)}
          </View>

          <Text className="text-2xl font-black text-center mb-2 text-black">
            {dialog.title}
          </Text>

          <Text className="text-zinc-500 text-center text-base leading-6 mb-8">
            {dialog.message}
          </Text>

          <View className="flex-row gap-3 w-full">
            {!dialog.singleButton && (
              <TouchableOpacity
                onPress={cancel}
                disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-zinc-100 items-center justify-center active:opacity-75"
              >
                <Text className="font-bold text-lg text-black">
                  {dialog.cancelLabel || "Cancel"}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={confirm}
              disabled={loading}
              className={clsx(
                "flex-1 py-4 rounded-2xl items-center justify-center active:opacity-75 shadow-md",
                dialog.destructive ? "bg-red-500" : colors.button,
              )}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="font-bold text-lg text-white">
                  {dialog.confirmLabel || "Okay"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return context;
}
