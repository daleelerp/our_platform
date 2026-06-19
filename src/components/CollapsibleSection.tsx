"use client";

import { useState } from "react";

type CollapsibleSectionProps = {
  title: string;
  count?: number;
  /** Uncontrolled initial state (mobile only — always expanded at lg: regardless). */
  defaultOpen?: boolean;
  /** Controlled mode — pass both to drive open state externally (e.g. force-open on selection). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  headerClassName?: string;
  children: React.ReactNode;
};

/**
 * Collapsible header + body, same visual pattern as PricingCard's chevron/max-height
 * accordion. Always fully expanded with no toggle at lg: and above — collapse only
 * applies below lg: so desktop stays pixel-identical to a non-collapsible section.
 */
export function CollapsibleSection({
  title,
  count,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  headerClassName,
  children,
}: CollapsibleSectionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const toggle = () => {
    const next = !open;
    if (isControlled) {
      onOpenChange?.(next);
    } else {
      setInternalOpen(next);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center justify-between py-1 lg:pointer-events-none lg:cursor-default"
      >
        <span className={headerClassName ?? "font-semibold text-slate-900"}>
          {title}
          {count !== undefined && count > 0 && (
            <span className="ml-1.5 font-normal text-slate-500">({count})</span>
          )}
        </span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 lg:hidden ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out lg:!max-h-none lg:!opacity-100 lg:overflow-visible ${
          open ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}
