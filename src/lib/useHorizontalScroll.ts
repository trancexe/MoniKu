import { useCallback, useRef } from "react";

export function useHorizontalScroll<T extends HTMLElement>() {
  const cleanupRef = useRef<(() => void) | null>(null);

  const ref = useCallback((node: T | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (node) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY === 0) return;
        // Prevent vertical scrolling of the page
        e.preventDefault();
        // Scroll horizontally instead
        node.scrollBy({
          left: e.deltaY * 1.5,
          behavior: "smooth",
        });
      };

      // Mouse drag to scroll
      let isDown = false;
      let startX: number;
      let scrollLeft: number;

      const onMouseDown = (e: MouseEvent) => {
        isDown = true;
        startX = e.pageX - node.offsetLeft;
        scrollLeft = node.scrollLeft;
      };

      const onMouseLeave = () => {
        isDown = false;
      };

      const onMouseUp = () => {
        isDown = false;
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isDown) return;
        e.preventDefault(); // prevent text selection
        const x = e.pageX - node.offsetLeft;
        const walk = (x - startX) * 2; // speed multiplier
        // Using direct assignment for immediate response without smooth behavior during drag
        node.scrollLeft = scrollLeft - walk;
      };

      node.addEventListener("wheel", onWheel, { passive: false });
      node.addEventListener("mousedown", onMouseDown);
      node.addEventListener("mouseleave", onMouseLeave);
      node.addEventListener("mouseup", onMouseUp);
      node.addEventListener("mousemove", onMouseMove);

      cleanupRef.current = () => {
        node.removeEventListener("wheel", onWheel);
        node.removeEventListener("mousedown", onMouseDown);
        node.removeEventListener("mouseleave", onMouseLeave);
        node.removeEventListener("mouseup", onMouseUp);
        node.removeEventListener("mousemove", onMouseMove);
      };
    }
  }, []);

  return ref;
}
