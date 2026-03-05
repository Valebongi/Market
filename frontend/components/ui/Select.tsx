"use client";

import { SelectHTMLAttributes, forwardRef, ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, required, children, className, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-carbon-gray flex items-center gap-1">
            {label}
            {required && <span className="text-soft-coral">*</span>}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            className={cn(
              "w-full h-10 px-4 pr-10 border border-fog-gray rounded-lg text-base bg-white text-carbon-gray appearance-none",
              "transition-all duration-150",
              "focus:outline-none focus:border-2 focus:border-electric-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]",
              "disabled:bg-snow-gray disabled:cursor-not-allowed",
              error && "border-2 border-soft-coral shadow-[0_0_0_3px_rgba(220,38,38,0.1)]",
              className
            )}
            {...props}
          >
            {children}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-gray pointer-events-none" />
        </div>

        {(helperText || error) && (
          <p className={cn("text-xs", error ? "text-soft-coral" : "text-slate-gray")}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";

export default Select;
