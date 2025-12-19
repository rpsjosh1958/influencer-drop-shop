import { Text, Pressable } from "react-native";
import { MotiView } from "moti";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps {
  onPress?: () => void;
  title?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  textClassName?: string;
  disabled?: boolean;
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  onPress,
  title,
  variant = "default",
  size = "default",
  className,
  textClassName,
  disabled,
  loading,
  children,
}: ButtonProps) {
  const baseStyles = "flex-row items-center justify-center rounded-xl";

  const variants = {
    default: "bg-black",
    outline: "bg-transparent border border-zinc-200",
    ghost: "bg-transparent",
  };

  const sizes = {
    default: "h-14 px-6",
    sm: "h-10 px-4",
    lg: "h-16 px-8",
  };

  const textBaseStyles = "font-bold tracking-wide uppercase";

  const textVariants = {
    default: "text-white",
    outline: "text-black",
    ghost: "text-black",
  };

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={cn(disabled && "opacity-50")}
    >
      {({ pressed }) => (
        <MotiView
          animate={{ scale: pressed ? 0.96 : 1 }}
          transition={{ type: "timing", duration: 100 }}
          className={cn(baseStyles, variants[variant], sizes[size], className)}
        >
          {loading ? (
            <Text className={cn(textBaseStyles, textVariants[variant])}>
              Loading...
            </Text>
          ) : (
            children || (
              <Text
                className={cn(
                  textBaseStyles,
                  textVariants[variant],
                  textClassName
                )}
              >
                {title}
              </Text>
            )
          )}
        </MotiView>
      )}
    </Pressable>
  );
}
