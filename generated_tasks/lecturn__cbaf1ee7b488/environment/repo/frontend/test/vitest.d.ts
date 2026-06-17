// Re-augment vitest's `expect` with @testing-library/jest-dom matchers
// (toBeInTheDocument, toHaveAttribute, toBeDisabled, etc.) so TS sees the
// runtime augmentation we apply in test/setup.ts.
import "@testing-library/jest-dom/vitest";
