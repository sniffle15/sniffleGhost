import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border border-rose-400/40 bg-rose-500 text-white hover:bg-rose-600",
        ghost: "border border-white/10 bg-white/5 text-fog/80 hover:bg-white/10 hover:text-fog",
        outline: "border border-white/20 bg-transparent text-fog hover:bg-white/5"
      },
      size: {
        sm: "h-9 px-4",
        md: "h-10 px-5",
        lg: "h-11 px-6"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md"
    }
  }
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp ref={ref} className={cn(buttonVariants({ variant, size, className }))} {...props} />;
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
