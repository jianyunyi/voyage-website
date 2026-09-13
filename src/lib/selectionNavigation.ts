import { useCallback, useRef, type WheelEvent } from 'react';

export function nextSelection<T>(options: readonly T[], current: T, direction: number): T {
  const index = options.indexOf(current);
  const currentIndex = index === -1 ? 0 : index;
  const step = direction < 0 ? -1 : 1;
  return options[(currentIndex + step + options.length) % options.length];
}

export function useWheelSelection<T>(options: readonly T[], current: T, onSelect: (next: T) => void) {
  const lastChangeAt = useRef(0);

  return useCallback((event: WheelEvent<HTMLElement>) => {
    if (options.length < 2 || Math.abs(event.deltaY) < 4) return;

    const now = Date.now();
    if (now - lastChangeAt.current < 280) return;

    event.preventDefault();
    lastChangeAt.current = now;
    onSelect(nextSelection(options, current, event.deltaY));
  }, [current, onSelect, options]);
}
