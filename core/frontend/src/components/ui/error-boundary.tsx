"use client";

import React from "react";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div
          style={{
            padding: "var(--space-6)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--color-danger)",
            background: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
            color: "var(--color-text-primary)",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "var(--space-2)", color: "var(--color-danger)" }}>
            Something went wrong
          </div>
          <div style={{ fontSize: "var(--font-size-sm)", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
            {this.state.error.message}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              marginTop: "var(--space-4)",
              padding: "var(--space-2) var(--space-4)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              background: "transparent",
              color: "var(--color-text-primary)",
              fontSize: "var(--font-size-sm)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
