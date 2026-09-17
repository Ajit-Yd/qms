"use client";

import * as React from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "dark"
  | "subtle"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "xl" | "icon" | "icon-sm";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap " +
  "transition-all duration-200 ease-out " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white " +
  "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none " +
  "active:scale-[0.98]";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-[#1D9E75] text-white border border-[#1D9E75] shadow-[0_1px_2px_rgba(29,158,117,0.15),0_4px_12px_rgba(29,158,117,0.15)] " +
    "hover:bg-[#188a65] hover:border-[#188a65] hover:shadow-[0_4px_16px_rgba(29,158,117,0.25)] " +
    "active:bg-[#157a5b] focus-visible:ring-[#1D9E75]/30",
  secondary:
    "bg-white text-slate-700 border border-slate-200 shadow-sm " +
    "hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 hover:shadow " +
    "active:bg-slate-100 focus-visible:ring-slate-400/25",
  outline:
    "bg-transparent text-slate-700 border border-slate-300 " +
    "hover:bg-white hover:border-slate-400 hover:text-slate-900 hover:shadow-sm " +
    "active:bg-slate-50 focus-visible:ring-slate-400/25",
  ghost:
    "bg-transparent text-slate-600 border border-transparent " +
    "hover:bg-slate-100 hover:text-slate-900 " +
    "active:bg-slate-200 focus-visible:ring-slate-400/20",
  subtle:
    "bg-slate-100 text-slate-700 border border-transparent " +
    "hover:bg-slate-200 hover:text-slate-900 " +
    "active:bg-slate-300 focus-visible:ring-slate-400/20",
  dark:
    "bg-[#1E2530] text-white border border-[#1E2530] shadow-sm " +
    "hover:bg-[#2a3441] hover:border-[#2a3441] hover:shadow-md " +
    "active:bg-[#151c25] focus-visible:ring-slate-900/25",
  success:
    "bg-[#5C9271] text-white border border-[#5C9271] shadow-sm " +
    "hover:bg-[#4d7e60] hover:border-[#4d7e60] hover:shadow " +
    "active:bg-[#426e53] focus-visible:ring-[#5C9271]/25",
  destructive:
    "bg-[#C1614F] text-white border border-[#C1614F] shadow-sm " +
    "hover:bg-[#a94e3e] hover:border-[#a94e3e] hover:shadow " +
    "active:bg-[#914636] focus-visible:ring-[#C1614F]/25",
  link:
    "bg-transparent text-[#1D9E75] border border-transparent underline-offset-4 " +
    "hover:underline hover:text-[#188a65] p-0 h-auto shadow-none",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded-lg gap-1.5",
  md: "h-9 px-4 text-sm rounded-xl",
  lg: "h-10 px-5 text-sm rounded-xl",
  xl: "h-11 px-6 text-[15px] rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg p-0",
  icon: "h-9 w-9 rounded-xl p-0",
};

function Spinner({ size = "md" }: { size?: ButtonSize }) {
  const dim = size === "sm" || size === "icon-sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      aria-hidden
      className={`${dim} animate-spin rounded-full border-2 border-current border-t-transparent`}
    />
  );
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = "",
      variant = "primary",
      size = "md",
      loading = false,
      leftIcon,
      rightIcon,
      fullWidth,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;
    // link variant ignores size padding
    const sizeClass = variant === "link" ? "" : sizes[size];
    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        className={[
          base,
          variants[variant],
          sizeClass,
          fullWidth ? "w-full" : "",
          loading ? "cursor-wait" : "",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      >
        {loading ? <Spinner size={size} /> : leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
        {children && <span className={loading ? "opacity-90" : ""}>{children}</span>}
        {!loading && rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
      </button>
    );
  }
);
Button.displayName = "Button";

// Compact icon button used for row actions / header controls
export function IconButton({
  className = "",
  size = "icon",
  variant = "ghost",
  ...props
}: ButtonProps) {
  return <Button size={size as ButtonSize} variant={variant} className={className} {...props} />;
}

// Pill toggle for things like By team / By person
export function SegmentedControl({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="inline-flex rounded-full bg-slate-100 p-1 shadow-inner">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 ${
            value === opt.value
              ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
