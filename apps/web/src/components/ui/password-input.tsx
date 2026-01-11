import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  wrapperClassName?: string;
  iconClassName?: string;
}

export function PasswordInput({
  className,
  wrapperClassName,
  iconClassName,
  type, // Detach type from props so it doesn't override
  ...props
}: PasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className={cn("relative", wrapperClassName)}>
      <input
        type={showPassword ? "text" : "password"}
        className={cn("pr-12", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className={cn(
          "absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-black transition-colors p-1",
          iconClassName
        )}
        style={{ WebkitTapHighlightColor: "transparent" }}
        tabIndex={-1}
      >
        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
