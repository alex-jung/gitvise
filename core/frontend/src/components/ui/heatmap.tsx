"use client";

import React, { useState } from "react";

interface HeatmapProps {
  /** data[row][col] – values to visualize */
  data: number[][];
  rowLabels?: string[];
  colLabels?: string[];
  /** CSS color for zero / low values (default: var(--color-border)) */
  colorLow?: string;
  /** CSS color for maximum values (default: var(--color-primary)) */
  colorHigh?: string;
  /** Cell size in px */
  cellSize?: number;
  /** Gap between cells in px */
  cellGap?: number;
  formatValue?: (value: number) => string;
}

/** Linear interpolation between two hex/rgb colors via CSS color-mix */
function interpolateColor(low: string, high: string, t: number): string {
  const pct = Math.round(t * 100);
  return `color-mix(in srgb, ${high} ${pct}%, ${low})`;
}

export function Heatmap({
  data,
  rowLabels,
  colLabels,
  colorLow = "var(--color-border)",
  colorHigh = "var(--color-primary)",
  cellSize = 16,
  cellGap = 2,
  formatValue = (v) => String(Math.round(v)),
}: HeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    value: number;
    row: number;
    col: number;
    x: number;
    y: number;
  } | null>(null);

  if (!data.length) return null;

  const allValues = data.flat();
  const maxVal = Math.max(...allValues, 0.001);
  const minVal = Math.min(...allValues, 0);

  const numRows = data.length;
  const numCols = Math.max(...data.map((r) => r.length));
  const labelColW = rowLabels ? 56 : 0;
  const labelRowH = colLabels ? 20 : 0;

  const totalW = labelColW + numCols * (cellSize + cellGap) - cellGap;
  const totalH = labelRowH + numRows * (cellSize + cellGap) - cellGap;

  return (
    <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
      <div
        style={{
          display: "inline-block",
          width: totalW,
          height: totalH + labelRowH,
          position: "relative",
        }}
      >
        {/* Column labels */}
        {colLabels && (
          <div
            style={{
              display: "flex",
              marginLeft: labelColW,
              marginBottom: 4,
              gap: cellGap,
            }}
          >
            {colLabels.slice(0, numCols).map((label, ci) => (
              <div
                key={ci}
                style={{
                  width: cellSize,
                  flexShrink: 0,
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                  textAlign: "center",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}

        {/* Rows */}
        {data.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: "flex",
              alignItems: "center",
              gap: cellGap,
              marginBottom: ri < numRows - 1 ? cellGap : 0,
            }}
          >
            {/* Row label */}
            {rowLabels && (
              <div
                style={{
                  width: labelColW - cellGap,
                  flexShrink: 0,
                  fontSize: 9,
                  color: "var(--color-text-muted)",
                  textAlign: "right",
                  paddingRight: 4,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}
              >
                {rowLabels[ri]}
              </div>
            )}

            {/* Cells */}
            {Array.from({ length: numCols }, (_, ci) => {
              const v = row[ci] ?? 0;
              const t =
                maxVal === minVal ? 0 : (v - minVal) / (maxVal - minVal);
              const bg = v === 0 ? colorLow : interpolateColor(colorLow, colorHigh, t);
              return (
                <div
                  key={ci}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    flexShrink: 0,
                    background: bg,
                    borderRadius: Math.max(cellSize * 0.15, 2),
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({ value: v, row: ri, col: ci, x: rect.left, y: rect.top });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            top: tooltip.y - 36,
            left: tooltip.x,
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-sm)",
            padding: "2px 8px",
            fontSize: "var(--font-size-xs)",
            color: "var(--color-text-primary)",
            pointerEvents: "none",
            zIndex: 500,
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {rowLabels?.[tooltip.row] && `${rowLabels[tooltip.row]} · `}
          {colLabels?.[tooltip.col] && `${colLabels[tooltip.col]} · `}
          {formatValue(tooltip.value)}
        </div>
      )}
    </div>
  );
}
