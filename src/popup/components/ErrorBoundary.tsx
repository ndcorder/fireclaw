import { Component, type ReactNode } from "react";
import { colors, font, radii, space } from "../design";

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[Fireclaw] Uncaught error:", error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          fontFamily: font.family,
          padding: space.xl,
          minWidth: 360,
          maxWidth: 420,
          color: colors.accentBlack,
          backgroundColor: colors.backgroundBase,
        }}
      >
        <h2
          style={{
            margin: 0,
            fontSize: font.size.lg,
            fontWeight: font.weight.semibold,
          }}
        >
          Something went wrong
        </h2>
        <p
          style={{
            marginTop: space.sm,
            fontSize: font.size.sm,
            color: colors.blackAlpha72,
          }}
        >
          An unexpected error occurred. Your API key and preferences are safe.
        </p>
        {this.state.error && (
          <pre
            style={{
              marginTop: space.sm,
              padding: space.sm,
              borderRadius: radii.sm,
              backgroundColor: colors.dangerTint,
              color: colors.danger,
              fontSize: font.size.xs,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 120,
              overflow: "auto",
            }}
          >
            {this.state.error.message}
          </pre>
        )}
        <button
          onClick={this.handleRetry}
          type="button"
          style={{
            marginTop: space.md,
            padding: `${space.sm}px ${space.lg}px`,
            borderRadius: radii.sm,
            border: "none",
            backgroundColor: colors.heat100,
            color: colors.backgroundLighter,
            fontSize: font.size.sm,
            fontWeight: font.weight.medium,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(250, 93, 25, 0.2)",
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}
