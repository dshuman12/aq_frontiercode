import { cn } from "~/lib/utils";

interface LecturnMarkProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
}

// L inherits currentColor so it adapts to the container theme; play triangle is locked to amber.
export function LecturnMark({ className, ...props }: LecturnMarkProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      aria-hidden
      className={cn("size-6", className)}
      {...props}
    >
      <rect x="5" y="3.5" width="3.5" height="13.5" rx="1.25" fill="currentColor" />
      <rect x="5" y="16.5" width="14" height="3.5" rx="1.25" fill="currentColor" />
      <path
        d="M13.25 5.5 L20 9.75 L13.25 14 Z"
        fill="var(--color-amber-accent)"
      />
    </svg>
  );
}
