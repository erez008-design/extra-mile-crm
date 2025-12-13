import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "gold" | "navy";
}

export function StatCard({ title, value, icon: Icon, trend, variant = "default" }: StatCardProps) {
  return (
    <div className={cn(
      "stat-card animate-fade-in",
      variant === "gold" && "gold-gradient text-navy-dark",
      variant === "navy" && "navy-gradient text-primary-foreground"
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            variant === "default" ? "text-muted-foreground" : "opacity-80"
          )}>
            {title}
          </p>
          <p className="mt-2 text-3xl font-bold">{value}</p>
          {trend && (
            <p className={cn(
              "mt-2 text-sm font-medium flex items-center gap-1",
              trend.isPositive ? "text-emerald-600" : "text-red-500",
              variant !== "default" && (trend.isPositive ? "text-emerald-300" : "text-red-300")
            )}>
              {trend.isPositive ? "+" : ""}{trend.value}%
              <span className="opacity-70">מהחודש שעבר</span>
            </p>
          )}
        </div>
        <div className={cn(
          "flex h-12 w-12 items-center justify-center rounded-xl",
          variant === "default" && "bg-primary/10",
          variant === "gold" && "bg-navy-dark/20",
          variant === "navy" && "bg-gold/20"
        )}>
          <Icon className={cn(
            "h-6 w-6",
            variant === "default" && "text-primary",
            variant === "gold" && "text-navy-dark",
            variant === "navy" && "text-gold"
          )} />
        </div>
      </div>
    </div>
  );
}
