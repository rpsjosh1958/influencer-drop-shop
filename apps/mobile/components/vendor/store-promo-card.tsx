import { useState } from "react";
import { View, Text, Image, ActivityIndicator, StyleSheet } from "react-native";
import type { ImageSourcePropType, ImageStyle, StyleProp } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import QRCode from "react-native-qrcode-svg";
import type { Product } from "@/types";
import { fitStoreName, fitSingleLine } from "@/lib/flyer-text-fit";

export type StorePromoTemplate = "signal" | "rack";

const FALLBACK_LOGO = require("@/assets/images/drop_logo.jpg");

// Story (9:16) only — the Post format was dropped from the picker, so
// there's no reason to keep the format-conditional sizing around.
const CARD_WIDTH = 360;
const CARD_HEIGHT = 640;

interface StorePromoCardProps {
  template: StorePromoTemplate;
  storeName: string;
  storeLogo?: string;
  storeSlug: string;
  products: Product[]; // up to 3, "rack" only
  onImageLoad?: () => void;
}

// Shows a small spinner over a placeholder box until the image has
// actually loaded, instead of leaving a blank/broken-looking gap —
// used for every remote (and fallback) image on the flyer.
function LoadingImage({
  source,
  style,
  resizeMode = "cover",
  onLoad,
}: {
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
  resizeMode?: "cover" | "contain";
  onLoad?: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <View style={style}>
      {!loaded && (
        <View style={[StyleSheet.absoluteFill, styles.imageSkeleton]}>
          <ActivityIndicator size="small" color="rgba(255,255,255,0.55)" />
        </View>
      )}
      <Image
        source={source}
        resizeMode={resizeMode}
        style={StyleSheet.absoluteFill}
        onLoad={() => {
          setLoaded(true);
          onLoad?.();
        }}
      />
    </View>
  );
}

function QRChip({ value, size = 120 }: { value: string; size?: number }) {
  return (
    <View style={styles.qrChip}>
      <View style={{ width: size, height: size }}>
        <QRCode value={value} size={size} backgroundColor="#fff" color="#0A0A0C" />
      </View>
      <Text style={styles.qrChipLabel}>Scan to Shop</Text>
    </View>
  );
}

export function StorePromoCard({
  template,
  storeName,
  storeLogo,
  storeSlug,
  products,
  onImageLoad,
}: StorePromoCardProps) {
  const shopUrl = `https://copdrop.io/shop/${storeSlug}`;
  const rackProducts = products.slice(0, 3);

  return (
    <View style={[styles.card, { width: CARD_WIDTH, height: CARD_HEIGHT }]}>
      {template === "signal" ? (
        <SignalFlyer
          storeName={storeName}
          storeLogo={storeLogo}
          shopUrl={shopUrl}
          onImageLoad={onImageLoad}
        />
      ) : (
        <RackFlyer
          storeName={storeName}
          storeLogo={storeLogo}
          shopUrl={shopUrl}
          products={rackProducts}
          onImageLoad={onImageLoad}
        />
      )}

      <Text style={styles.footer}>Powered by CopDrop.io</Text>

      <Image source={FALLBACK_LOGO} style={styles.cornerMark} resizeMode="contain" />
    </View>
  );
}

function SignalFlyer({
  storeName,
  storeLogo,
  shopUrl,
  onImageLoad,
}: {
  storeName: string;
  storeLogo?: string;
  shopUrl: string;
  onImageLoad?: () => void;
}) {
  const nameFit = fitStoreName(storeName, 44, 20);

  return (
    <View style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={["#3a1e5c", "#1a1030", "#0A0A0C"]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.7 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.signalStack, { paddingVertical: 56 }]}>
        <View style={{ alignItems: "center", gap: 20 }}>
          <View style={styles.newTag}>
            <Text style={styles.newTagText}>Now on The Drop.</Text>
          </View>

          <LoadingImage
            source={storeLogo ? { uri: storeLogo } : FALLBACK_LOGO}
            resizeMode="contain"
            onLoad={onImageLoad}
            style={{ width: 220, height: 84 }}
          />

          <Text
            style={[styles.signalName, { fontSize: nameFit.fontSize }]}
            numberOfLines={nameFit.numberOfLines}
          >
            {storeName.toUpperCase()}
          </Text>

          <View style={{ alignItems: "center", gap: 10, marginTop: 28 }}>
            <Text style={styles.visitLabel}>Visit the Store</Text>
            <View style={styles.linkPill}>
              <Text style={styles.linkPillText}>{shopUrl.replace(/^https?:\/\//, "")}</Text>
            </View>
          </View>
        </View>
        <Text style={styles.visitLabel}>OR</Text>
        <QRChip value={shopUrl} />
      </View>
    </View>
  );
}

function RackFlyer({
  storeName,
  storeLogo,
  shopUrl,
  products,
  onImageLoad,
}: {
  storeName: string;
  storeLogo?: string;
  shopUrl: string;
  products: Product[];
  onImageLoad?: () => void;
}) {
  const nameSize = fitSingleLine(storeName, 18, 12);
  const heroFlex = 1.55;

  const tile = (p: Product, key: string) => (
    <View key={key} style={styles.rackTile}>
      <LoadingImage
        source={{ uri: p.imageUrl }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={onImageLoad}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.7)"]}
        start={{ x: 0.5, y: 0.4 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.rackTileLabel}>
        <Text style={styles.rackTileName} numberOfLines={1}>
          {p.name}
        </Text>
        <Text style={styles.rackTilePrice}>GHS {p.price.toFixed(2)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { padding: 22, paddingTop: 26, paddingBottom: 40 }]}>
      <View style={styles.rackHeader}>
        <LoadingImage
          source={storeLogo ? { uri: storeLogo } : FALLBACK_LOGO}
          resizeMode="contain"
          onLoad={onImageLoad}
          style={{ width: 90, height: 32 }}
        />
        <Text style={[styles.rackStoreName, { fontSize: nameSize }]} numberOfLines={1}>
          {storeName.toUpperCase()}
        </Text>
      </View>

      <View style={{ flex: 1, gap: 10 }}>
        {products.length >= 3 && (
          <>
            <View style={{ flex: heroFlex, flexDirection: "row" }}>{tile(products[0], "hero")}</View>
            <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
              {tile(products[1], "b")}
              {tile(products[2], "c")}
            </View>
          </>
        )}
        {products.length === 2 && (
          <View style={{ flex: 1, flexDirection: "row", gap: 10 }}>
            {tile(products[0], "a")}
            {tile(products[1], "b")}
          </View>
        )}
        {products.length === 1 && (
          <View style={{ flex: 1, flexDirection: "row" }}>{tile(products[0], "a")}</View>
        )}
      </View>

      <View style={styles.rackFooter}>
        <View style={styles.shopNowBtn}>
          <Text style={styles.shopNowText}>Shop Now</Text>
        </View>
        <View style={styles.qrChipSm}>
          <QRCode value={shopUrl} size={46} backgroundColor="#fff" color="#0A0A0C" />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0A0A0C",
    overflow: "hidden",
    position: "relative",
  },
  footer: {
    position: "absolute",
    bottom: 9,
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 8.5,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.35)",
  },
  cornerMark: {
    position: "absolute",
    bottom: 14,
    right: 14,
    width: 22,
    height: 22,
    opacity: 0.9,
  },
  imageSkeleton: {
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  signalStack: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
  },
  newTag: {
    backgroundColor: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  newTagText: {
    color: "#0A0A0C",
    fontWeight: "900",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  signalName: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  visitLabel: {
    color: "rgba(255,255,255,0.55)",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  linkPill: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
  },
  linkPillText: {
    color: "#0A0A0C",
    fontWeight: "800",
    fontSize: 12,
    fontFamily: "monospace",
  },
  qrChip: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    gap: 6,
  },
  qrChipSm: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
  },
  qrChipLabel: {
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: "#111",
  },
  rackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  rackStoreName: {
    color: "#fff",
    fontWeight: "900",
    letterSpacing: 0.4,
    flexShrink: 1,
  },
  rackTile: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#202020",
    position: "relative",
  },
  rackTileLabel: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 10,
  },
  rackTileName: {
    color: "#fff",
    fontSize: 11,
    lineHeight: 14,
  },
  rackTilePrice: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 11.5,
  },
  rackFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  shopNowBtn: {
    flex: 1,
    backgroundColor: "#fff",
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: "center",
  },
  shopNowText: {
    color: "#0A0A0C",
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
});
