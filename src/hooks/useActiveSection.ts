import { useEffect, useState, type RefObject } from "react";

/**
 * Which section is currently under the navbar.
 *
 * Measured from scroll position rather than with an IntersectionObserver: the
 * gallery and explore sections mount only once their photos arrive, so a set of
 * observed elements captured on mount would permanently miss them. Reading the
 * DOM on each frame costs a handful of `getBoundingClientRect` calls and picks
 * up late arrivals for free.
 */
export function useActiveSection(
  ids: readonly string[],
  headerRef: RefObject<HTMLElement | null>,
): string {
  const [activeId, setActiveId] = useState(ids[0] ?? "");

  useEffect(() => {
    let frame = 0;

    const measure = () => {
      frame = 0;

      // The probe line has to sit at least as low as where an anchored section
      // comes to rest, or clicking a nav link leaves the previous item lit.
      const scrollPadding = Number.parseFloat(
        getComputedStyle(document.documentElement).scrollPaddingTop,
      );
      const offset = Math.max(
        headerRef.current?.offsetHeight ?? 0,
        Number.isFinite(scrollPadding) ? scrollPadding : 0,
        72,
      );
      const probe = window.scrollY + offset + 2;

      let current = "";
      for (const id of ids) {
        const element = document.getElementById(id);
        if (!element) continue;
        if (element.getBoundingClientRect().top + window.scrollY <= probe) current = id;
      }

      // The final section can be shorter than the viewport and never reach the
      // probe line, so at the bottom of the page it wins outright.
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) {
        const last = [...ids].reverse().find((id) => document.getElementById(id));
        if (last) current = last;
      }

      setActiveId(current || ids[0] || "");
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    // oxlint-disable-next-line react/set-state-in-effect
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    // Sections mounting later change the page height; re-measure when it does.
    const resizeObserver = new ResizeObserver(schedule);
    resizeObserver.observe(document.body);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      resizeObserver.disconnect();
    };
  }, [ids, headerRef]);

  return activeId;
}
