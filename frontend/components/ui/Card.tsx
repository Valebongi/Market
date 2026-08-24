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
    elevated: "bg-white dark:bg-gray-900 border border-fog-gray/60 dark:border-white/10 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-none",
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
    <Card className={cn("p-3 sm:p-6 overflow-hidden relative", accentBorder && `border-t-4 ${accentBorder}`, className)}>
      {/* Decorative background orb */}
      <div className={cn("absolute -right-5 -top-5 w-28 h-28 rounded-full opacity-[0.08] blur-sm", iconBg)} />
      <div className="flex items-start justify-between relative">
        <div className={cn("w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm ring-1 ring-black/5", iconBg, iconColor)}>
          <span className="scale-75 sm:scale-100">{icon}</span>
        </div>
        {trend && (
          <span className={cn("text-[10px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full", trend.positive ? "text-deep-emerald bg-emerald-50" : "text-warm-amber bg-amber-50")}>
            {trend.value}
          </span>
        )}
      </div>
      <div className="mt-2 sm:mt-4 relative">
        <p className="text-2xl sm:text-3xl font-bold text-carbon-gray dark:text-gray-100 font-display tracking-tight">{value}</p>
        <p className="text-xs sm:text-sm text-slate-gray dark:text-gray-400 mt-0.5 sm:mt-1 font-medium leading-tight">{label}</p>
      </div>
    </Card>
  );
}
