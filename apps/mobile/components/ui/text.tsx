import { Text as RNText, TextProps } from "react-native";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useStore } from "@/context/store-context";
import * as Font from "expo-font";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function H1({ className, style, ...props }: TextProps) {
  const { store } = useStore();
  const fontFamily = store?.theme?.fontFamily;
  const boldFont = fontFamily ? `${fontFamily}-Bold` : null;
  const fontStyle =
    boldFont && Font.isLoaded(boldFont) ? { fontFamily: boldFont } : {};

  return (
    <RNText
      className={cn(
        "text-5xl font-black tracking-tighter text-black",
        className
      )}
      style={[fontStyle, style]}
      {...props}
    />
  );
}

export function H2({ className, style, ...props }: TextProps) {
  const { store } = useStore();
  const fontFamily = store?.theme?.fontFamily;
  const boldFont = fontFamily ? `${fontFamily}-Bold` : null;
  const fontStyle =
    boldFont && Font.isLoaded(boldFont) ? { fontFamily: boldFont } : {};

  return (
    <RNText
      className={cn(
        "text-3xl font-black tracking-tighter text-black",
        className
      )}
      style={[fontStyle, style]}
      {...props}
    />
  );
}

export function P({ className, style, ...props }: TextProps) {
  const { store } = useStore();
  const fontFamily = store?.theme?.fontFamily;
  const fontStyle =
    fontFamily && Font.isLoaded(fontFamily) ? { fontFamily } : {};

  return (
    <RNText
      className={cn("text-base font-medium text-zinc-500", className)}
      style={[fontStyle, style]}
      {...props}
    />
  );
}
