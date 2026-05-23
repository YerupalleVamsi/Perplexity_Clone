import { useEffect, useRef, type RefObject } from "react";

export function useAutoScroll<T extends HTMLElement>(
  deps: unknown[],
  enabled = true,
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled || !ref.current) return;
    ref.current.scrollTo({
      top: ref.current.scrollHeight,
      behavior: deps.length > 1 ? "smooth" : "auto",
    });
  }, deps);

  return ref;
}
