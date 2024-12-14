import { useMotionValue, useSpring } from "motion/react";
import { useRef, useState, type MouseEvent } from "react";

export const use3DHover = ({
  onMouseEnter,
  onMouseLeave,
}: {
  onMouseEnter?: (event: MouseEvent<HTMLDivElement>) => void;
  onMouseLeave?: (event: MouseEvent<HTMLDivElement>) => void;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { bounce: 0.2 });
  const springY = useSpring(rotateY, { bounce: 0.2 });
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const { width, top, left, height } =
      containerRef.current?.getBoundingClientRect();
    rotateX.set((event.clientY - top - height / 2) * -0.1);
    rotateY.set((event.clientX - left - width / 2) * 0.1);
  };
  const handleMouseEnter = (event: MouseEvent<HTMLDivElement>) => {
    setIsHovered(true);
    onMouseEnter?.(event);
  };
  const handleMouseLeave = (event: MouseEvent<HTMLDivElement>) => {
    setIsHovered(false);
    rotateX.set(0);
    rotateY.set(0);
    onMouseLeave?.(event);
  };
  return {
    containerRef,
    isHovered,
    handleMouseEnter,
    handleMouseLeave,
    handleMouseMove,
    rotateX,
    rotateY,
    springX,
    springY,
  };
};
