import { useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";

export const useCounter = () => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const interval = useRef<ReturnType<typeof setInterval>>(null);
  const isInView = useInView(ref);

  const startCounting = () => {
    interval.current = setTimeout(() => {
      let limit;
      setCount((n) => {
        if (n > 19999) limit = true;
        return n + 500;
      });

      !limit && startCounting();
    }, 100);
  };

  useEffect(() => {
    startCounting();
    if (!isInView) {
      setCount(0);
    }
  }, [isInView]);

  return { count, ref };
};
