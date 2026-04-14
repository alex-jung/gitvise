import React from "react";
import { PieChart, type PieSlice } from "./pie-chart";

interface DonutChartProps {
  slices: PieSlice[];
  size?: number;
  /** Hole size as fraction of radius (default 0.55) */
  innerRadius?: number;
  showLegend?: boolean;
  centerLabel?: string;
  centerSublabel?: string;
  formatValue?: (value: number, total: number) => string;
}

export function DonutChart({
  innerRadius = 0.55,
  ...props
}: DonutChartProps) {
  return <PieChart {...props} innerRadius={innerRadius} />;
}
