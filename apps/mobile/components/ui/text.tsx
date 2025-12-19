import { Text as RNText, TextProps } from "react-native";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function H1({ className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(
        "text-5xl font-black tracking-tighter text-black",
        className
      )}
      {...props}
    />
  );
}

export function H2({ className, ...props }: TextProps) {
  return (
    <RNText
      className={cn(
        "text-3xl font-black tracking-tighter text-black",
        className
      )}
      {...props}
    />
  );
}

export function P({ className, ...props }: TextProps) {
  return (
    <RNText
      className={cn("text-base font-medium text-zinc-500", className)}
      {...props}
    />
  );
}
