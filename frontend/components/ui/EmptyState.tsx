import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Button from "./Button";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-16 px-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="w-16 h-16 rounded-full bg-snow-gray flex items-center justify-center text-slate-gray mb-6">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-semibold text-carbon-gray">{title}</h3>
      {description && (
        <p className="text-base text-slate-gray mt-2 max-w-md">{description}</p>
      )}
      {action && (
        <div className="mt-6">
          <Button onClick={action.onClick}>{action.label}</Button>
        </div>
      )}
    </div>
  );
}
