import { useState, useEffect } from 'react';

/**
 * Custom hook for reliable mobile detection
 * Uses 768px breakpoint to match Tailwind's md: breakpoint
 * 
 * @returns boolean indicating if the current viewport is mobile (< 768px)
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Add resize event listener
    window.addEventListener('resize', checkMobile);

    // Cleanup event listener
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
}
