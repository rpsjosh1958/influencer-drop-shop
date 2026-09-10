import { useRef, useState } from "react";
import { View, ScrollView, Pressable, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
import { Menu, Radio, LayoutGrid, Download, Share2, Copy, Check } from "lucide-react-native";
import { useVendor } from "@/context/vendor-context";
import { useAlert } from "@/context/alert-context";
import { H1, P } from "@/components/ui/text";
import {
  StorePromoCard,
  StorePromoTemplate,
} from "@/components/vendor/store-promo-card";

export default function ShareStoreScreen() {
  const navigation = useNavigation();
  const { store, products } = useVendor();
  const { showAlert } = useAlert();

  const shareableProducts = products.filter((p) => !!p.imageUrl).slice(0, 3);
  const rackAvailable = shareableProducts.length > 0;

  const [template, setTemplate] = useState<StorePromoTemplate>("signal");
  const [imagesReady, setImagesReady] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const viewShotRef = useRef<ViewShot>(null);

  const requiredImages = 1 + (template === "rack" ? shareableProducts.length : 0);

  const selectTemplate = (t: StorePromoTemplate) => {
    if (t === "rack" && !rackAvailable) return;
    setTemplate(t);
    setImagesReady(false);
    setLoadedCount(0);
  };

  const handleImageLoad = () => {
    setLoadedCount((c) => {
      const next = c + 1;
      if (next >= requiredImages) setImagesReady(true);
      return next;
    });
  };

  const captureFlyer = async (): Promise<string | null> => {
    if (!viewShotRef.current?.capture) return null;
    try {
      return await viewShotRef.current.capture();
    } catch (err) {
      console.error("Failed to capture flyer", err);
      showAlert({
        title: "Couldn't create image",
        message: "Something went wrong generating the flyer. Try again.",
        type: "error",
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!imagesReady || saving) return;
    setSaving(true);
    try {
      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        showAlert({
          title: "Photos access needed",
          message: canAskAgain
            ? "Allow access to your photos so the flyer can be saved."
            : "Photos access was previously denied. Enable it for this app in your device Settings to save flyers.",
          type: "warning",
        });
        return;
      }

      const uri = await captureFlyer();
      if (!uri) return;

      await MediaLibrary.saveToLibraryAsync(uri);
      showAlert({
        title: "Saved!",
        message: "The flyer was saved to your Photos.",
        type: "success",
        singleButton: true,
      });
    } catch (err) {
      console.error("Failed to save flyer", err);
      showAlert({
        title: "Couldn't save image",
        message: "Something went wrong saving the flyer. Try again.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!imagesReady || sharing) return;
    setSharing(true);
    try {
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        showAlert({
          title: "Sharing unavailable",
          message: "Sharing isn't available on this device.",
          type: "error",
        });
        return;
      }
      const uri = await captureFlyer();
      if (!uri) return;
      await Sharing.shareAsync(uri, {
        mimeType: "image/png",
        dialogTitle: "Share your store",
      });
    } catch (err) {
      console.error("Failed to share flyer", err);
    } finally {
      setSharing(false);
    }
  };

  const shopUrl = `https://copdrop.io/shop/${store?.id || ""}`;

  const handleCopyLink = async () => {
    await Clipboard.setStringAsync(`${store?.name || "My store"} is now on The Drop!\n${shopUrl}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-50" edges={["top"]}>
      <View className="px-6 py-4 border-b border-zinc-100 bg-white flex-row items-center gap-3">
        <Pressable onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
          <Menu size={24} color="black" />
        </Pressable>
        <View>
          <H1 className="text-xl font-black uppercase">Share Store</H1>
          <P className="text-xs text-zinc-400 font-bold">Get the word out</P>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 24, gap: 20, paddingBottom: 60, alignItems: "center" }}
      >
        {/* Template picker */}
        <View className="w-full flex-row gap-2">
          <Pressable
            onPress={() => selectTemplate("signal")}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${
              template === "signal" ? "bg-black border-black" : "border-zinc-200 bg-white"
            }`}
          >
            <Radio size={16} color={template === "signal" ? "#fff" : "#71717a"} />
            <P className={`font-bold text-xs uppercase ${template === "signal" ? "text-white" : "text-zinc-500"}`}>
              Signal
            </P>
          </Pressable>
          <Pressable
            onPress={() => selectTemplate("rack")}
            disabled={!rackAvailable}
            className={`flex-1 flex-row items-center justify-center gap-2 py-3 rounded-xl border-2 ${
              !rackAvailable ? "opacity-40" : ""
            } ${template === "rack" ? "bg-black border-black" : "border-zinc-200 bg-white"}`}
          >
            <LayoutGrid size={16} color={template === "rack" ? "#fff" : "#71717a"} />
            <P className={`font-bold text-xs uppercase ${template === "rack" ? "text-white" : "text-zinc-500"}`}>
              Rack
            </P>
          </Pressable>
        </View>
        {!rackAvailable && (
          <P className="text-[10px] text-zinc-400 -mt-3 text-center">
            Add products with photos to unlock the Rack design.
          </P>
        )}

        {/* Preview / capture target — the shadow/rounding lives on this
            outer wrapper, not on the ViewShot itself. Rounding the exact
            view that gets captured would bake transparent rounded corners
            into the exported PNG, which looks like a bug once posted to
            an Instagram Story (IG doesn't round story-image corners). */}
        <View
          style={{
            borderRadius: 16,
            overflow: "hidden",
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 20,
            shadowOffset: { width: 0, height: 10 },
            elevation: 8,
          }}
        >
          <ViewShot ref={viewShotRef} options={{ format: "png", quality: 1 }}>
            <StorePromoCard
              key={template}
              template={template}
              storeName={store?.name || "My Store"}
              storeLogo={store?.logo}
              storeSlug={store?.id || ""}
              products={shareableProducts}
              onImageLoad={handleImageLoad}
            />
          </ViewShot>
        </View>

        {/* Actions */}
        <View className="w-full gap-3">
          <Pressable
            onPress={handleSave}
            disabled={!imagesReady || saving}
            className={`w-full bg-black py-4 rounded-2xl flex-row items-center justify-center gap-2 ${
              !imagesReady || saving ? "opacity-40" : ""
            }`}
          >
            {saving || !imagesReady ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Download size={18} color="#fff" />
            )}
            <P className="text-white font-black uppercase text-sm tracking-wide">
              {saving ? "Saving..." : !imagesReady ? "Preparing..." : "Save to Photos"}
            </P>
          </Pressable>

          <Pressable
            onPress={handleShare}
            disabled={!imagesReady || sharing}
            className={`w-full bg-zinc-100 py-4 rounded-2xl flex-row items-center justify-center gap-2 ${
              !imagesReady || sharing ? "opacity-40" : ""
            }`}
          >
            {sharing ? <ActivityIndicator color="#000" /> : <Share2 size={18} color="#000" />}
            <P className="text-black font-black uppercase text-sm tracking-wide">Share</P>
          </Pressable>

          <Pressable
            onPress={handleCopyLink}
            className="w-full flex-row items-center justify-center gap-2 py-3"
          >
            {copied ? <Check size={16} color="#16a34a" /> : <Copy size={16} color="#71717a" />}
            <P className={`font-bold text-xs uppercase ${copied ? "text-green-600" : "text-zinc-500"}`}>
              {copied ? "Copied!" : "Copy Store Link"}
            </P>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
