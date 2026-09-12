import { useEffect } from "react";

/**
 * Fades `.reveal` elements up as they enter the viewport. Runs once per element;
 * `prefers-reduced-motion` is handled in CSS, where `.reveal` is already visible.
 *
 * Pass anything that adds `.reveal` elements later (async content) as `deps` so
 * they get observed too.
 */
export function useScrollReveal(deps: unknown[] = []): void {
  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(".reveal")).filter(
      (element) => !element.classList.contains("is-visible"),
    );
    if (elements.length === 0) return;

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 },
    );

    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
