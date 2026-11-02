import { cn } from "@/lib/utils";

interface FieldGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}

export function FieldGroup({ className, label, error, hint, children, ...props }: FieldGroupProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {label && <label className="text-sm font-medium text-text-primary">{label}</label>}
      {children}
      {hint && !error && <p className="text-xs text-text-muted">{hint}</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
