// Store theme fonts, downloaded on demand by components/font-loader.tsx.
// These are the @expo-google-fonts npm packages' files, pinned by version on
// jsDelivr so they can't move. (They used to point at raw.githubusercontent
// .com/google/fonts/main/..., where most of the static files have since been
// removed — every font but Lato 404'd.)
const font = (pkg: string, version: string, name: string) => ({
  regular: `https://cdn.jsdelivr.net/npm/@expo-google-fonts/${pkg}@${version}/400Regular/${name}_400Regular.ttf`,
  bold: `https://cdn.jsdelivr.net/npm/@expo-google-fonts/${pkg}@${version}/700Bold/${name}_700Bold.ttf`,
});

export const FONT_MAP: Record<string, { regular: string; bold: string }> = {
  Oswald: font("oswald", "0.4.2", "Oswald"),
  Inter: font("inter", "0.4.2", "Inter"),
  Roboto: font("roboto", "0.4.2", "Roboto"),
  "Playfair Display": font("playfair-display", "0.4.2", "PlayfairDisplay"),
  "Open Sans": font("open-sans", "0.4.2", "OpenSans"),
  Montserrat: font("montserrat", "0.4.2", "Montserrat"),
  Lato: font("lato", "0.4.1", "Lato"),
};

// Fallback for getting a URL if not in map (could try to guess, but risky)
export const getFontConfig = (fontFamily: string) => {
  return FONT_MAP[fontFamily] || null;
};
