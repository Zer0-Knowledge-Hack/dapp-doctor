/**
 * Brings a freshly arrived result into view and hands it focus.
 *
 * The result renders below the form, often below the fold: without this, a
 * click on Diagnose looks like nothing happened. Scrolling also lets the
 * verdict stamp land in view, which is when its animation plays. Focus moves
 * to the result heading so a screen reader announces the verdict. Motion is
 * skipped for anyone who asked the system to reduce it.
 */
export function revealResult(headingId: string): void {
  const heading = document.getElementById(headingId);
  if (!heading) return;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  (heading.closest('section') ?? heading).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  heading.focus({ preventScroll: true });
}
