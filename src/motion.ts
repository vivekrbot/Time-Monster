// Motion preferences.
//
// This app ships as a static web build, so matchMedia is the real implementation path —
// but the check fails safe anywhere the API is missing (native, SSR, older runtimes):
// no matchMedia means no stated preference, and no stated preference means motion is fine.
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
