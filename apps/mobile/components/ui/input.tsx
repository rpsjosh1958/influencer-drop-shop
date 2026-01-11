import { useState } from "react";
import {
  TextInput,
  View,
  Text,
  TextInputProps,
  TouchableOpacity,
} from "react-native";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Eye, EyeOff } from "lucide-react-native";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
}

export function Input({
  label,
  error,
  className,
  secureTextEntry,
  ...props
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View className="space-y-2">
      {label && (
        <Text className="text-sm font-bold uppercase tracking-wider text-zinc-500 ml-1">
          {label}
        </Text>
      )}
      <View className="relative">
        <TextInput
          placeholderTextColor="#a1a1aa"
          className={cn(
            "w-full bg-zinc-50 border mb-5 border-zinc-200 p-4 rounded-xl text-black font-medium",
            error && "border-red-500 bg-red-50 text-red-900",
            secureTextEntry && "pr-12",
            className
          )}
          style={{ fontSize: 16 }}
          secureTextEntry={secureTextEntry && !showPassword}
          {...props}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-4"
          >
            {showPassword ? (
              <EyeOff size={20} color="#a1a1aa" />
            ) : (
              <Eye size={20} color="#a1a1aa" />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error && (
        <Text className="text-xs font-bold text-red-500 ml-1 -mt-4 mb-4">
          {error}
        </Text>
      )}
    </View>
  );
}
