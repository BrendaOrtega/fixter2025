import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const useCounter = (options?: {
  add?: number;
  limit?: number;
  speed?: number;
}) => {
  const { limit = 20_000, speed = 10, add = 50 } = options || {};
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLElement>(null);
  const isInView = useInView(ref);
  const timeout = useRef<ReturnType<typeof setTimeout>>(null);

  const stopCounting = () => timeout.current && clearTimeout(timeout.current);
  const startCounting = () => {
    timeout.current = setTimeout(() => {
      setCount((n) => {
        if (n > limit) {
          stopCounting();
          return n;
        }
        return n + add;
      });

      startCounting();
    }, speed);
  };

  useEffect(() => {
    if (!isInView) {
      stopCounting();
      setCount(0);
    } else {
      startCounting();
    }
    return () => stopCounting();
  }, [isInView]);

  return { count, ref };
};
