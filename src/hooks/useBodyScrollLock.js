import { useEffect } from "react";

/**
 * Custom hook to lock background body scrolling when a modal or dialog is open,
 * preventing the background page from scrolling on wheel/touch events.
 * Optionally listens to Escape key for quick accessible dismissal.
 */
export function useBodyScrollLock(isLocked, onEscape = null) {
  useEffect(() => {
    if (!isLocked) return;

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // Calculate scrollbar width to prevent page content shifting
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && typeof onEscape === "function") {
        onEscape();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLocked, onEscape]);
}

export default useBodyScrollLock;
