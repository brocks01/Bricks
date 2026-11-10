/**
 * Types for the Jest matchers that expo-router/testing-library registers at
 * runtime (it ships no declarations for them).
 */
export {};

declare global {
  namespace jest {
    interface Matchers<R> {
      toHavePathname(pathname: string): R;
      toHavePathnameWithParams(pathname: string): R;
      toHaveSegments(segments: string[]): R;
      toHaveSearchParams(params: Record<string, string>): R;
    }
  }
}
