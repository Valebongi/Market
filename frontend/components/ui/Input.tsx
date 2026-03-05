"use client";

import { forwardRef, InputHTMLAttributes, ReactNode, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  required?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      helperText,
      error,
      success,
      leftIcon,
      rightIcon,
      required,
      className,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-medium text-carbon-gray flex items-center gap-1">
            {label}
            {required && <span className="text-soft-coral">*</span>}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <span className="absolute left-3 text-slate-gray pointer-events-none">
              {leftIcon}
            </span>
          )}

          <input
            ref={ref}
            type={inputType}
            className={cn(
              "w-full h-10 border border-fog-gray rounded-lg text-base bg-white text-carbon-gray placeholder:text-slate-gray",
              "transition-all duration-150",
              "focus:outline-none focus:border-2 focus:border-electric-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]",
              "disabled:bg-snow-gray disabled:cursor-not-allowed",
              leftIcon ? "pl-10 pr-4" : "px-4",
              (rightIcon || isPassword) ? "pr-10" : "",
              error && "border-2 border-soft-coral shadow-[0_0_0_3px_rgba(220,38,38,0.1)]",
              success && !error && "border-2 border-deep-emerald",
              className
            )}
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              className="absolute right-3 text-slate-gray hover:text-carbon-gray transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          )}

          {rightIcon && !isPassword && (
            <span className="absolute right-3 text-slate-gray pointer-events-none">
              {rightIcon}
            </span>
          )}
        </div>

        {(helperText || error) && (
          <p
            className={cn(
              "text-xs",
              error ? "text-soft-coral" : "text-slate-gray"
            )}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;

// Textarea separado
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  helperText?: string;
  error?: string;
  maxLength?: number;
  showCount?: boolean;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, maxLength, showCount, required, className, value, onChange, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-carbon-gray flex items-center gap-1">
              {label}
              {required && <span className="text-soft-coral">*</span>}
            </label>
            {showCount && maxLength && (
              <span className="text-xs text-slate-gray">
                {String(value || "").length}/{maxLength}
              </span>
            )}
          </div>
        )}

        <textarea
          ref={ref}
          maxLength={maxLength}
          value={value}
          onChange={onChange}
          className={cn(
            "w-full min-h-[120px] px-4 py-3 border border-fog-gray rounded-lg text-base bg-white text-carbon-gray placeholder:text-slate-gray resize-y",
            "transition-all duration-150",
            "focus:outline-none focus:border-2 focus:border-electric-blue focus:shadow-[0_0_0_3px_rgba(37,99,235,0.1)]",
            "disabled:bg-snow-gray disabled:cursor-not-allowed",
            error && "border-2 border-soft-coral shadow-[0_0_0_3px_rgba(220,38,38,0.1)]",
            className
          )}
          {...props}
        />

        {(helperText || error) && (
          <p className={cn("text-xs", error ? "text-soft-coral" : "text-slate-gray")}>
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export { Input };
