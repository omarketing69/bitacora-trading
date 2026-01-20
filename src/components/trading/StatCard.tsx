import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend = "neutral",
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat-card animate-fade-in", className)}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <p
            className={cn(
              "text-2xl font-bold font-mono tracking-tight",
              trend === "positive" && "profit-text",
              trend === "negative" && "loss-text",
              trend === "neutral" && "text-foreground"
            )}
          >
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        <div
          className={cn(
            "p-2 rounded-lg",
            trend === "positive" && "profit-bg",
            trend === "negative" && "loss-bg",
            trend === "neutral" && "bg-muted"
          )}
        >
          <Icon
            className={cn(
              "h-5 w-5",
              trend === "positive" && "profit-text",
              trend === "negative" && "loss-text",
              trend === "neutral" && "text-muted-foreground"
            )}
          />
        </div>
      </div>
    </div>
  );
}
