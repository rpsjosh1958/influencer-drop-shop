import { useEffect, useState } from "react";
import * as Font from "expo-font";
import { useStore } from "@/context/store-context";
import { getFontConfig } from "@/lib/font-map";

export function FontLoader({ children }: { children: React.ReactNode }) {
  const { store } = useStore();
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [loadedFontName, setLoadedFontName] = useState<string | null>(null);

  useEffect(() => {
    async function loadThemeFont() {
      const fontFamily = store?.theme?.fontFamily;
      if (!fontFamily) {
        setFontsLoaded(true);
        return;
      }

      // If already loaded, skip
      if (loadedFontName === fontFamily) {
        setFontsLoaded(true);
        return;
      }

      const config = getFontConfig(fontFamily);
      if (!config) {
        console.warn(`[FontLoader] No font config found for: ${fontFamily}`);
        setFontsLoaded(true);
        return;
      }

      // Check if already loaded by Expo or another component
      if (Font.isLoaded(fontFamily) && Font.isLoaded(`${fontFamily}-Bold`)) {
        setLoadedFontName(fontFamily);
        setFontsLoaded(true);
        return;
      }

      try {
        console.log(`[FontLoader] Loading font: ${fontFamily}`);

        // Load fonts only if not loaded
        const fontsToLoad: Record<string, string> = {};
        if (!Font.isLoaded(fontFamily))
          fontsToLoad[fontFamily] = config.regular;
        if (!Font.isLoaded(`${fontFamily}-Bold`))
          fontsToLoad[`${fontFamily}-Bold`] = config.bold;

        if (Object.keys(fontsToLoad).length > 0) {
          await Font.loadAsync(fontsToLoad);
        }

        setLoadedFontName(fontFamily);
        setFontsLoaded(true);
        console.log(`[FontLoader] Successfully loaded: ${fontFamily}`);
      } catch (e) {
        console.log(
          `[FontLoader] Failed to load font: ${fontFamily}. Falling back.`
        );
        // Fallback to loaded just to show content
        setFontsLoaded(true);
      }
    }

    loadThemeFont();
  }, [store?.theme?.fontFamily]);

  if (!fontsLoaded && store) {
    // Optional: Return distinct loader or null
    // But usually we just want to avoid flash of unstyled text?
    // For now return children, text might swap styles.
    return <>{children}</>;
  }

  return <>{children}</>;
}
