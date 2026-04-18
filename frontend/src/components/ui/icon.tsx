import React from "react";

export type IconName =
  | "dashboard"
  | "repo-health"
  | "pull-requests"
  | "ci-cd"
  | "security"
  | "team"
  | "dev-metrics"
  | "alerts";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

// All icons use a 16×16 viewBox, stroke-only, strokeWidth 1.5, round caps/joins.
// SVG elements use fill="none" stroke="currentColor" unless explicitly noted.
const ICONS: Record<IconName, React.ReactNode> = {
  // Four squares in a 2×2 grid
  dashboard: (
    <>
      <rect x="2"   y="2"   width="5" height="5" rx="1" />
      <rect x="9"   y="2"   width="5" height="5" rx="1" />
      <rect x="2"   y="9"   width="5" height="5" rx="1" />
      <rect x="9"   y="9"   width="5" height="5" rx="1" />
    </>
  ),

  // ECG / health pulse waveform
  "repo-health": (
    <polyline points="1,8.5 3,8.5 4.5,4 6,13 7.5,6.5 8.5,8.5 15,8.5" />
  ),

  // Two branch heads → single merge commit
  "pull-requests": (
    <>
      <circle cx="4"  cy="3.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="12" cy="3.5" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="8"  cy="13"  r="1.5" fill="currentColor" stroke="none" />
      <path d="M4,5 L4,9 Q4,11.5 8,11.5" />
      <path d="M12,5 Q12,11.5 8,11.5" />
    </>
  ),

  // Three forward chevrons — pipeline stages / continuous flow
  "ci-cd": (
    <>
      <polyline points="2,5 5.5,8 2,11" />
      <polyline points="6,5 9.5,8 6,11" />
      <polyline points="10,5 13.5,8 10,11" />
    </>
  ),

  // Shield with inner checkmark
  security: (
    <>
      <path d="M8,2 L13,4 L13,9.5 Q13,13.5 8,15 Q3,13.5 3,9.5 L3,4 Z" />
      <polyline points="5.5,8.5 7.5,10.5 10.5,6" />
    </>
  ),

  // Two person silhouettes (head circle + torso arc)
  team: (
    <>
      {/* back person (right) */}
      <circle cx="10.5" cy="5"  r="2" />
      <path   d="M7.5,14 Q7.5,9.5 10.5,9.5 Q13.5,9.5 14,13.5" />
      {/* front person (left, slightly overlapping) */}
      <circle cx="5.5"  cy="5"  r="2" />
      <path   d="M2,14 Q2,9.5 5.5,9.5 Q9,9.5 9,14" />
    </>
  ),

  // Three ascending bars with a baseline
  "dev-metrics": (
    <>
      <line x1="1"  y1="14" x2="15" y2="14" />
      <rect x="2"   y="10" width="3" height="4" rx="0.5" />
      <rect x="6.5" y="7"  width="3" height="7" rx="0.5" />
      <rect x="11"  y="3.5" width="3" height="10.5" rx="0.5" />
    </>
  ),

  // Bell body + clapper curve + stem
  alerts: (
    <>
      <line x1="8"   y1="1"    x2="8"    y2="2.5" />
      <path d="M5,2.5 Q3,3.5 3,7.5 L3,10.5 L13,10.5 L13,7.5 Q13,3.5 11,2.5 Q9.5,2 8,2.5 Q6.5,2 5,2.5 Z" />
      <path d="M6.5,10.5 Q6.5,13 8,13 Q9.5,13 9.5,10.5" />
    </>
  ),
};

export function Icon({ name, size = 16, color, className, style }: IconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      style={{ color, flexShrink: 0, display: "inline-block", verticalAlign: "middle", ...style }}
    >
      {ICONS[name]}
    </svg>
  );
}
