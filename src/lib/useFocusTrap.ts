import { useEffect, useRef } from 'preact/hooks';

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab/Shift+Tab focus cycling within a modal/dialog while it's open,
 * and moves initial focus into it — WCAG 2.1 AA keyboard requirement for
 * dialogs (Requirements.md §8.3). Used by AnimalDetailModal and
 * GalleryLightbox; both are unmounted on close, so no restore-focus logic
 * is needed beyond what the browser already does when the trigger element
 * is still in the DOM.
 */
export function useFocusTrap<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const focusables = node.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables[0]?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return ref;
}
