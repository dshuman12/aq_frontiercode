import { useEffect, useRef } from 'react';

interface UseScanDetectionOptions {
  onScan: (barcode: string) => void;
  minLength?: number;
  timeOut?: number; // Time to wait for the next character before clearing buffer
  targetClass?: string; // Only listen if event target has this class (optional)
  ignoreIfFocusOn?: string[]; // Ignore if focused element matches select/textarea etc.
}

export const useScanDetection = ({
  onScan,
  minLength = 3,
  timeOut = 50, // Scanners are usually very fast (<50ms between keys)
  ignoreIfFocusOn = ['INPUT', 'TEXTAREA', 'SELECT'],
}: UseScanDetectionOptions) => {
  const buffer = useRef<string>('');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyTime = useRef<number>(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      
      // If we are focused on an input, we might still want to capture scan if it looks like a scan,
      // BUT for this specific requirement, the user wants "global" scan.
      // However, if the user is typing in the search box manually, we don't want to interfere unless it's fast.
      // The issue is distinguishing manual typing vs scan in an input.
      // For now, let's allow it even in inputs if it is FAST enough.
      
      const currentTime = Date.now();
      const timeGap = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Reset buffer if typing is too slow (manual entry)
      if (timeGap > timeOut && buffer.current.length > 0) {
        buffer.current = '';
      }

      if (e.key === 'Enter') {
        if (buffer.current.length >= minLength) {
          // It's a valid scan width
          e.preventDefault();
          e.stopPropagation();
          onScan(buffer.current);
          buffer.current = '';
        } else {
            // Probably manual enter
            buffer.current = '';
        }
        return;
      }

      // buffer printable characters
      if (e.key.length === 1) {
        buffer.current += e.key;
        
        // Reset the timeout to clear buffer
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          buffer.current = '';
        }, timeOut * 2); // Give a little grace period
      }
    };

    window.addEventListener('keydown', handleKeyDown, true); // Capture phase to prevent others from stopping it if needed

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [onScan, minLength, timeOut]);
};
