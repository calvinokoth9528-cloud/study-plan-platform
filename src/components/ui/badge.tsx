import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-bold tracking-wide transition-all duration-120",
  {
    variants: {
      variant: {
        default: "border-[var(--accent)] bg-[var(--accent-glow)] text-[var(--bg-primary)]",
        success: "border-[var(--success)] bg-[var(--success-glow)] text-[var(--bg-primary)]",
        warning: "border-[var(--warning)] bg-[var(--warning-glow)] text-[var(--bg-primary)]",
        danger: "border-[var(--danger)] bg-[var(--danger-glow)] text-[var(--bg-primary)]",
        muted: "border-[var(--border-strong)] bg-[var(--bg-secondary)] text-[var(--text-muted)]",
        outline: "border-[var(--border-strong)] bg-transparent text-[var(--text-secondary)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
