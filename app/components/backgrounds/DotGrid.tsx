import { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

interface DotGridProps {
  dotSize?: number;
  gap?: number;
  baseColor?: string;
  activeColor?: string;
  proximity?: number;
  shockRadius?: number;
  shockStrength?: number;
  resistance?: number;
  returnDuration?: number;
}

interface Dot {
  id: string;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  offsetX: number;
  offsetY: number;
  scale: number;
  opacity: number;
}

const DotGrid: React.FC<DotGridProps> = ({
  dotSize = 3,
  gap = 15,
  baseColor = '#666',
  activeColor = '#ff7e5f',
  proximity = 100,
  shockRadius = 200,
  shockStrength = 3,
  resistance = 500,
  returnDuration = 1.2,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dots, setDots] = useState<Dot[]>([]);
  const [mousePos, setMousePos] = useState({ x: -9999, y: -9999 });
  const animationFrameRef = useRef<number>();

  // Initialize dots grid
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDots = () => {
      const rect = containerRef.current!.getBoundingClientRect();
      const cols = Math.floor(rect.width / (dotSize + gap));
      const rows = Math.floor(rect.height / (dotSize + gap));
      const newDots: Dot[] = [];

      for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
          const x = i * (dotSize + gap) + gap / 2;
          const y = j * (dotSize + gap) + gap / 2;
          newDots.push({ 
            id: `${i}-${j}`,
            x, 
            y, 
            baseX: x, 
            baseY: y,
            offsetX: 0,
            offsetY: 0,
            scale: 1,
            opacity: 0.3
          });
        }
      }

      setDots(newDots);
    };

    updateDots();
    window.addEventListener('resize', updateDots);

    return () => window.removeEventListener('resize', updateDots);
  }, [dotSize, gap]);

  // Update dots based on mouse position
  const updateDotsAnimation = useCallback(() => {
    setDots(prevDots => 
      prevDots.map(dot => {
        const dx = mousePos.x - dot.baseX;
        const dy = mousePos.y - dot.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < shockRadius && mousePos.x !== -9999) {
          // Calculate attraction force (pulling towards mouse)
          const force = Math.max(0, (shockRadius - distance) / shockRadius);
          const angle = Math.atan2(dy, dx);
          
          // Apply attraction effect (instead of repulsion)
          const offsetX = Math.cos(angle) * force * shockStrength * 5;
          const offsetY = Math.sin(angle) * force * shockStrength * 5;
          
          // Visual feedback
          let scale = 1;
          let opacity = 0.3;
          
          if (distance < proximity) {
            const proximityRatio = 1 - distance / proximity;
            scale = 1 + proximityRatio * 0.3; // Reduced scale effect
            opacity = 0.3 + proximityRatio * 0.5; // Reduced opacity effect
          }
          
          return {
            ...dot,
            offsetX,
            offsetY,
            scale,
            opacity
          };
        } else {
          // Return to base position
          return {
            ...dot,
            offsetX: dot.offsetX * 0.9, // Smooth return
            offsetY: dot.offsetY * 0.9,
            scale: dot.scale + (1 - dot.scale) * 0.1,
            opacity: dot.opacity + (0.3 - dot.opacity) * 0.1
          };
        }
      })
    );

    animationFrameRef.current = requestAnimationFrame(updateDotsAnimation);
  }, [mousePos, proximity, shockRadius, shockStrength]);

  // Start animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(updateDotsAnimation);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateDotsAnimation]);

  // Handle mouse events
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
      setMousePos({ x: -9999, y: -9999 });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: 'crosshair' }}
    >
      {dots.map((dot) => {
        const dx = mousePos.x - dot.baseX;
        const dy = mousePos.y - dot.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isActive = distance < proximity && mousePos.x !== -9999;
        
        return (
          <motion.div
            key={dot.id}
            initial={false}
            animate={{
              x: dot.baseX + dot.offsetX,
              y: dot.baseY + dot.offsetY,
              scale: dot.scale,
              opacity: dot.opacity,
            }}
            transition={{
              type: "spring",
              stiffness: resistance,
              damping: 30,
              mass: 0.5,
            }}
            style={{
              position: 'absolute',
              width: dotSize,
              height: dotSize,
              borderRadius: '50%',
              backgroundColor: isActive ? activeColor : baseColor,
              boxShadow: isActive ? `0 0 ${dotSize * 2}px ${activeColor}` : 'none',
              transformOrigin: 'center',
            }}
          />
        );
      })}
    </div>
  );
};

export default DotGrid;