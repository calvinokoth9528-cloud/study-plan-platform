import { cn } from "@/lib/utils";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
  max?: number;
}

export function Progress({ className, value = 0, max = 100, ...props }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--bg-tertiary)]", className)} {...props}>
      <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-150" style={{ width: pct + "%" }} />
    </div>
  );
}
