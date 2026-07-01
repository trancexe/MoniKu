import { useRef, useEffect } from "react";

export function useHorizontalScroll<T extends HTMLElement>() {
  const elRef = useRef<T>(null);

  useEffect(() => {
    const el = elRef.current;
    if (el) {
      const onWheel = (e: WheelEvent) => {
        if (e.deltaY == 0) return;
        
        // Prevent vertical scrolling of the page
        e.preventDefault();
        
        // Scroll horizontally instead
        el.scrollTo({
          left: el.scrollLeft + (e.deltaY * 1.5), // Multiply by 1.5 for a slightly faster scroll feel
          behavior: "smooth" // smooth makes snap-mandatory less jerky when scrolling with mouse
        });
      };
      
      // Use passive: false to allow preventDefault()
      el.addEventListener("wheel", onWheel, { passive: false });
      return () => el.removeEventListener("wheel", onWheel);
    }
  }, []);

  return elRef;
}
