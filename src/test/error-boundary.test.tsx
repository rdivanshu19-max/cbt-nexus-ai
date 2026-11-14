import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ErrorBoundary, AppCrashFallback } from "@/components/ErrorBoundary";

/** A subtree that always throws during render, the way a failed WebGL context does. */
const Boom = () => {
  throw new Error("canvas context lost");
};

describe("ErrorBoundary", () => {
  it("renders its children when nothing throws", () => {
    render(
      <ErrorBoundary fallback={<p>fallback</p>}>
        <p>healthy child</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("healthy child")).toBeInTheDocument();
    expect(screen.queryByText("fallback")).not.toBeInTheDocument();
  });

  it("renders the fallback instead of unmounting the page when a child throws", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>fallback</p>} label="hero-3d">
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fallback")).toBeInTheDocument();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("renders nothing when a decorative subtree fails and no fallback is given", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(container).toBeEmptyDOMElement();
    spy.mockRestore();
  });

  it("keeps surrounding content on the page when only one subtree fails", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <div>
        <h1>Landing page heading</h1>
        <ErrorBoundary label="hero-3d">
          <Boom />
        </ErrorBoundary>
      </div>,
    );
    // This is the regression that blanked the landing page: the heading survives.
    expect(screen.getByText("Landing page heading")).toBeInTheDocument();
    spy.mockRestore();
  });

  it("gives the application crash screen a way to recover", () => {
    render(<AppCrashFallback />);
    expect(screen.getByRole("button", { name: /reload the page/i })).toBeInTheDocument();
  });
});
