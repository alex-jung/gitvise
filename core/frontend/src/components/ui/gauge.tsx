"use client";

import React from "react";

export interface GaugeZone {
  from: number;
  to: number;
  color: string;
}

interface GaugeProps {
  value: number;
  min?: number;
  max?: number;
  size?: number;
  label?: string;
  formatValue?: (value: number) => string;
  /** Color zones. If omitted, uses a single primary-color arc. */
  zones?: GaugeZone[];
}

// Gauge is a 180° semi-circle (left to right, opening downward)
// Start angle: π (left), end angle: 0 (right), going counter-clockwise

function polarToXY(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy + r * Math.sin(angle),
  };
}

function arcD(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
  sweep: 0 | 1
): string {
  const s = polarToXY(cx, cy, r, startAngle);
  const e = polarToXY(cx, cy, r, endAngle);
  const large = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`;
}

export function Gauge({
  value,
  min = 0,
  max = 100,
  size = 200,
  label,
  formatValue = (v) => String(Math.round(v)),
  zones,
}: GaugeProps) {
  const clamped = Math.min(Math.max(value, min), max);
  const pct = (clamped - min) / (max - min);

  // SVG layout: arc drawn in bottom half of square
  const svgW = size;
  const svgH = size * 0.6; // only need the top 60% for the semi-circle
  const cx = svgW / 2;
  const cy = svgH * 0.9;
  const outerR = (svgW / 2) * 0.82;
  const innerR = outerR * 0.72;
  const strokeW = outerR - innerR;

  // Angles: π (left) → 0 (right), counter-clockwise for value fill
  const startAngle = Math.PI;
  const endAngle = 0;
  const valueAngle = startAngle - pct * Math.PI; // goes left→right

  // Needle
  const needleAngle = startAngle - pct * Math.PI;
  const needleLen = outerR - 4;
  const needleTip = polarToXY(cx, cy, needleLen, needleAngle);

  // Zone-colored background arcs
  const defaultZones: GaugeZone[] = zones ?? [
    { from: 0, to: 40, color: "var(--color-danger)" },
    { from: 40, to: 70, color: "var(--color-warning)" },
    { from: 70, to: 100, color: "var(--color-success)" },
  ];

  function zonePctToAngle(p: number) {
    return startAngle - (p / (max - min)) * Math.PI;
  }

  return (
    <div style={{ width: "100%", textAlign: "center" }}>
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{ width: "100%", maxWidth: size, height: "auto", display: "inline-block" }}
        aria-label={`Gauge: ${formatValue(value)}`}
      >
        {/* Background track */}
        <path
          d={arcD(cx, cy, (outerR + innerR) / 2, startAngle, endAngle, 0)}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeW}
          strokeLinecap="round"
        />

        {/* Zone arcs */}
        {defaultZones.map((z, i) => {
          const from = Math.max(z.from, min);
          const to = Math.min(z.to, max);
          if (from >= to) return null;
          const a1 = zonePctToAngle(from - min);
          const a2 = zonePctToAngle(to - min);
          return (
            <path
              key={i}
              d={arcD(cx, cy, (outerR + innerR) / 2, a1, a2, 0)}
              fill="none"
              stroke={z.color}
              strokeWidth={strokeW}
              strokeLinecap="round"
              opacity={0.25}
            />
          );
        })}

        {/* Value arc */}
        {pct > 0 && (
          <path
            d={arcD(cx, cy, (outerR + innerR) / 2, startAngle, valueAngle, 0)}
            fill="none"
            stroke={
              zones
                ? (defaultZones.find(
                    (z) =>
                      clamped >= z.from && clamped < z.to
                  )?.color ?? "var(--color-primary)")
                : "var(--color-primary)"
            }
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
        )}

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="var(--color-text-primary)"
          strokeWidth={2}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={4} fill="var(--color-text-primary)" />

        {/* Value text */}
        <text
          x={cx}
          y={cy - outerR * 0.18}
          textAnchor="middle"
          fontSize={svgW * 0.13}
          fontWeight={700}
          fill="var(--color-text-primary)"
        >
          {formatValue(value)}
        </text>

        {/* Min / Max */}
        <text
          x={cx - outerR + 4}
          y={cy + 14}
          textAnchor="start"
          fontSize={9}
          fill="var(--color-text-muted)"
        >
          {min}
        </text>
        <text
          x={cx + outerR - 4}
          y={cy + 14}
          textAnchor="end"
          fontSize={9}
          fill="var(--color-text-muted)"
        >
          {max}
        </text>
      </svg>

      {label && (
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            color: "var(--color-text-muted)",
            marginTop: "var(--space-1)",
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
