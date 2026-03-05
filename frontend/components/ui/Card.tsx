import { cn } from "@/lib/utils";
import { ReactNode, HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "elevated" | "flat" | "bordered";
  hover?: boolean;
  children: ReactNode;
}

export default function Card({
  variant = "elevated",
  hover = false,
  children,
  className,
  ...props
}: CardProps) {
  const base = "rounded-xl overflow-hidden";

  const variants = {
    elevated: "bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10 shadow-subtle dark:shadow-none",
    flat: "bg-snow-gray dark:bg-gray-800/50",
    bordered: "bg-white dark:bg-gray-900 border border-fog-gray dark:border-white/10",
  };

  return (
    <div
      className={cn(
        base,
        variants[variant],
        hover && "transition-all duration-200 hover:-translate-y-1 hover:shadow-medium cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

// Sub-componentes de Card
interface CardSectionProps {
  children: ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardSectionProps) {
  return (
    <div className={cn("flex items-center justify-between p-6 pb-4", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: CardSectionProps) {
  return (
    <div className={cn("px-6 py-4", className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: CardSectionProps) {
  return (
    <div className={cn("px-6 py-4 pt-0 flex items-center gap-3", className)}>
      {children}
    </div>
  );
}

// Stat Card (para dashboard)
interface StatCardProps {
  icon: ReactNode;
  value: string | number;
  label: string;
  trend?: { value: string; positive: boolean };
  iconColor?: string;
  iconBg?: string;
  accentBorder?: string;
  className?: string;
}

export function StatCard({ icon, value, label, trend, iconColor = "text-electric-blue", iconBg = "bg-blue-50", accentBorder, className }: StatCardProps) {
  return (
    <Card className={cn("p-6 overflow-hidden relative", accentBorder && `border-t-2 ${accentBorder}`, className)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", iconBg, iconColor)}>
          {icon}
        </div>
        {trend && (
          <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend.positive ? "text-deep-emerald bg-emerald-50" : "text-slate-gray bg-fog-gray")}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-carbon-gray dark:text-gray-100 font-display">{value}</p>
        <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">{label}</p>
      </div>
    </Card>
  );
}
