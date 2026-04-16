"use client";

import React, { useEffect, useState } from "react";

function format(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

interface RelativeTimeProps {
  value: string | null | undefined;
  fallback?: string;
}

export function RelativeTime({ value, fallback = "—" }: RelativeTimeProps) {
  const [label, setLabel] = useState<string>(fallback);

  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    setLabel(format(d));
    const id = setInterval(() => setLabel(format(d)), 60_000);
    return () => clearInterval(id);
  }, [value]);

  if (!value) return <span>{fallback}</span>;
  return (
    <time dateTime={value} title={new Date(value).toLocaleString("en")}>
      {label}
    </time>
  );
}
