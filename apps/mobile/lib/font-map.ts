export const FONT_MAP: Record<string, { regular: string; bold: string }> = {
  Oswald: {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/static/Oswald-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/oswald/static/Oswald-Bold.ttf",
  },
  Inter: {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/static/Inter-Bold.ttf",
  },
  Roboto: {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Bold.ttf",
  },
  "Playfair Display": {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/static/PlayfairDisplay-Bold.ttf",
  },
  "Open Sans": {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/opensans/static/OpenSans-Bold.ttf",
  },
  Montserrat: {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/static/Montserrat-Bold.ttf",
  },
  Lato: {
    regular:
      "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Regular.ttf",
    bold: "https://raw.githubusercontent.com/google/fonts/main/ofl/lato/Lato-Bold.ttf",
  },
};

// Fallback for getting a URL if not in map (could try to guess, but risky)
export const getFontConfig = (fontFamily: string) => {
  return FONT_MAP[fontFamily] || null;
};
