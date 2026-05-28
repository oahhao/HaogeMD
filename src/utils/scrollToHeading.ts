export interface ScrollCorrectionOptions {
  container: HTMLElement;
  headingId: string;
  scrollOffset: number;
  tolerance?: number;
  delays?: number[];
  onUserInteracted?: () => void;
}

export function scheduleScrollCorrection(
  options: ScrollCorrectionOptions,
): () => void {
  const {
    container,
    headingId,
    scrollOffset,
    tolerance = 6,
    delays = [150, 400, 900],
    onUserInteracted,
  } = options;

  let cancelled = false;
  const timerIds: Set<number> = new Set();

  const onUserScroll = () => {
    cancelled = true;
    onUserInteracted?.();
    cleanup();
  };

  container.addEventListener("wheel", onUserScroll, { passive: true });
  container.addEventListener("touchmove", onUserScroll, { passive: true });

  const cleanup = () => {
    timerIds.forEach((id) => clearTimeout(id));
    timerIds.clear();
    container.removeEventListener("wheel", onUserScroll);
    container.removeEventListener("touchmove", onUserScroll);
  };

  const executeCorrection = (isInitial: boolean, useSmooth: boolean) => {
    if (cancelled) return false;

    const el = container.querySelector(`#${CSS.escape(headingId)}`);
    if (!el) return false;

    const containerRect = container.getBoundingClientRect();
    const headingRect = el.getBoundingClientRect();
    const currentOffset =
      headingRect.top - containerRect.top + container.scrollTop;
    const expectedScrollTop = currentOffset - scrollOffset;
    const diff = container.scrollTop - expectedScrollTop;
    const absDiff = Math.abs(diff);

    if (absDiff <= tolerance) return false;

    // Graded deviation: choose behavior based on correction size
    let behavior: ScrollBehavior;
    if (isInitial) {
      behavior = useSmooth ? "smooth" : "auto";
    } else if (absDiff >= 480) {
      // Large deviation: auto first to snap closer, smooth will follow
      behavior = "auto";
    } else {
      // Small to medium deviation: smooth for gentle correction
      behavior = "smooth";
    }

    container.scrollTo({
      top: expectedScrollTop,
      behavior,
    });
    return true;
  };

  const isInitialDelay = (delay: number, _index: number) =>
    delay === delays[0];

  delays.forEach((delay, index) => {
    const timerId = window.setTimeout(() => {
      if (cancelled) return;
      const initial = isInitialDelay(delay, index);
      executeCorrection(initial, true);
    }, delay);
    timerIds.add(timerId);
  });

  return cleanup;
}
