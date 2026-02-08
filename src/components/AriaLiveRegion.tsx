/**
 * Global aria-live regions for screen reader announcements.
 * Placed once in the app root to announce dynamic content changes,
 * toast notifications, route changes, and other live updates.
 */
export function AriaLiveRegion() {
  return (
    <>
      {/* Polite announcements (non-urgent status updates) */}
      <div
        id="aria-live-polite"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      {/* Assertive announcements (urgent alerts, errors) */}
      <div
        id="aria-live-assertive"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  )
}
