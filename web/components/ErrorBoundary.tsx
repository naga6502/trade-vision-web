"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  label?: string;
}
interface State {
  error: Error | null;
}

// Contains render/commit errors (including React's "removeChild ... not a child"
// DOM exception from third-party widgets) so one bad widget can't blank the page.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="alert alert-warning small">
          <i className="bi bi-exclamation-triangle me-1" />
          {this.props.label ?? "This widget"} failed to render.
          <div className="text-muted mt-1">{this.state.error.message}</div>
        </div>
      );
    }
    return this.props.children;
  }
}
