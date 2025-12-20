import { TextInput, View, Text, TextInputProps } from "react-native";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({ label, error, className, ...props }: InputProps) {
  return (
    <View className="space-y-2">
      {label && (
        <Text className="text-sm font-bold uppercase tracking-wider text-zinc-500 ml-1">
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor="#a1a1aa"
        className={cn(
          "w-full bg-zinc-50 border mb-5 border-zinc-200 p-4 rounded-xl text-black font-medium",
          error && "border-red-500 bg-red-50 text-red-900",
          className
        )}
        style={{ fontSize: 16 }}
        {...props}
      />
      {error && (
        <Text className="text-xs font-bold text-red-500 ml-1">{error}</Text>
      )}
    </View>
  );
}
