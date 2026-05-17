"use client";

import { useEffect } from "react";

/**
 * Dampens trackpad (and high-resolution mouse wheel) scroll speed.
 *
 * macOS trackpads report very large deltaY values with momentum,
 * which makes pages fly past content.  This hook intercepts `wheel`
 * events on `<main>` (or a given selector) and scales the delta down
 * so scrolling feels controlled without killing native momentum entirely.
 *
 * Only kicks in when the delta looks like a trackpad gesture
 * (non-integer deltaY or deltaMode === 0 with large values).
 */
export function useSmoothScroll(
  selector = "main",
  /** 0 – 1, lower = slower. 0.35 feels natural on MacBook trackpads */
  factor = 0.35,
) {
  useEffect(() => {
    const el = document.querySelector(selector);
    if (!el) return;

    // We need the *scrollable ancestor* — for our layout that's `<main>`'s parent
    // or `<main>` itself if it overflows.  In AppLayout the page scrolls on
    // the `<div className="flex flex-col min-h-dvh …">` wrapper, but the
    // actual scrolling element is either <main> or the document.
    // Find the right target:
    const scrollTarget = findScrollParent(el as HTMLElement) ?? document.documentElement;

    function handler(e: WheelEvent) {
      // Only dampen pixel-mode deltas (trackpad / high-res wheel)
      if (e.deltaMode !== 0) return;

      // Skip tiny deltas (low-speed flick — let the browser handle those)
      if (Math.abs(e.deltaY) < 8) return;

      e.preventDefault();
      scrollTarget.scrollTop += e.deltaY * factor;
    }

    // Attach to scrollTarget so it captures all wheel events in the area
    scrollTarget.addEventListener("wheel", handler, { passive: false });
    return () => scrollTarget.removeEventListener("wheel", handler);
  }, [selector, factor]);
}

function findScrollParent(el: HTMLElement): HTMLElement | null {
  let node: HTMLElement | null = el;
  while (node) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if (
      (overflowY === "auto" || overflowY === "scroll") &&
      node.scrollHeight > node.clientHeight
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
