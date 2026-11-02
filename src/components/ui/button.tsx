"use client";

import { forwardRef, ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Stark blocky buttons — heavy borders, thick chrome, glowing accents
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-md border border-[var(--border-strong)] bg-[var(--bg-primary)] px-4 py-2.5 text-sm font-bold tracking-wide text-[var(--text-primary)] transition-all duration-120 active:translate-y-[2px] disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        default: "border-[var(--accent)] bg-[linear-gradient(135deg,var(--accent)_0%,var(--accent-strong)_60%,var(--accent-strong)_100%)] text-[var(--bg-primary)] shadow-lg shadow-[var(--accent-glow)] hover:brightness-[1.12] active:shadow-[inset_0_2px_4px_rgba(0,0,0,.35)]",
        secondary: "border-[var(--border-strong)] bg-[linear-gradient(135deg,var(--bg-tertiary)_0%,var(--bg-secondary)_100%)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:brightness-[1.08] active:shadow-[inset_0_1px_3px_rgba(0,0,0,.25)]",
        ghost: "border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]",
        danger: "border-[var(--danger)] bg-[linear-gradient(135deg,var(--danger)_0%,#b71c1c_60%,#b71c1c_100%)] text-[var(--bg-primary)] shadow-lg shadow-[var(--danger-glow)] hover:brightness-[1.12] active:shadow-[inset_0_2px_4px_rgba(0,0,0,.35)]",
        link: "border-[var(--border-strong)] bg-transparent text-[var(--accent)] hover:text-[var(--accent-strong)] hover:border-[var(--accent)] hover:bg-[var(--accent-glow)]",
      },
      size: {
        sm: "h-9 px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-7 text-base",
      },
    },
    defaultVariants: { variant: "default", size: "md" },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      ref={ref}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 16 5.79 16 12h0a8 8 0 01-8 8V0z" />
          </svg>
          Loading
        </>
      ) : (
        children
      )}
    </button>
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
