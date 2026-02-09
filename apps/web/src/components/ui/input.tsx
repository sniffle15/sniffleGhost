import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "h-10 w-full rounded-xl border border-white/15 bg-[#1f242c] px-3 text-sm text-fog placeholder:text-fog/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export { Input };
