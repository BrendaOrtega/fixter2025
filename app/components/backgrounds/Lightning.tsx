import { useEffect, useState } from 'react';

const Lightning = ({ hue = 230, xOffset = 0, speed = 1, intensity = 1, size = 1 }) => {
  const [bolts, setBolts] = useState([]);

  useEffect(() => {
    // Generate random lightning bolt paths
    const generateBolts = () => {
      const newBolts = [];
      const numBolts = Math.floor(3 + Math.random() * 3); // 3-5 bolts
      
      for (let i = 0; i < numBolts; i++) {
        const bolt = {
          id: i,
          path: generateBoltPath(),
          opacity: Math.random() * 0.7 + 0.3,
          width: Math.random() * 3 + 1,
          delay: Math.random() * 2,
        };
        newBolts.push(bolt);
      }
      setBolts(newBolts);
    };

    const generateBoltPath = () => {
      const segments = 15;
      let path = `M ${50 + (Math.random() - 0.5) * 20 + xOffset * 5} 0`;
      let currentX = 50 + (Math.random() - 0.5) * 20 + xOffset * 5;
      
      for (let i = 1; i <= segments; i++) {
        const y = (100 / segments) * i;
        const deviation = (Math.random() - 0.5) * 30 * size;
        currentX += deviation;
        currentX = Math.max(10, Math.min(90, currentX)); // Keep within bounds
        path += ` L ${currentX} ${y}`;
      }
      
      return path;
    };

    generateBolts();
    const interval = setInterval(generateBolts, 2000 / speed);

    return () => clearInterval(interval);
  }, [hue, xOffset, speed, intensity, size]);

  return (
    <div className="w-full h-full relative overflow-hidden">
      {/* Background gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 30%, hsla(${hue}, 80%, 60%, ${0.15 * intensity}) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, hsla(${hue}, 70%, 50%, ${0.1 * intensity}) 0%, transparent 50%),
            linear-gradient(135deg, hsla(${hue}, 60%, 20%, ${0.05 * intensity}) 0%, hsla(${hue}, 40%, 10%, ${0.1 * intensity}) 100%)
          `
        }}
      />
      
      {/* Lightning bolts */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <filter id={`glow-${hue}`}>
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {bolts.map((bolt) => (
          <g key={bolt.id}>
            {/* Outer glow */}
            <path
              d={bolt.path}
              fill="none"
              stroke={`hsl(${hue}, 100%, 80%)`}
              strokeWidth={bolt.width * 3}
              opacity={bolt.opacity * 0.3 * intensity}
              filter={`url(#glow-${hue})`}
              style={{
                animation: `lightning-flicker ${1.5 / speed}s ease-in-out infinite`,
                animationDelay: `${bolt.delay}s`
              }}
            />
            {/* Inner bolt */}
            <path
              d={bolt.path}
              fill="none"
              stroke={`hsl(${hue}, 100%, 95%)`}
              strokeWidth={bolt.width}
              opacity={bolt.opacity * intensity}
              style={{
                animation: `lightning-pulse ${1 / speed}s ease-in-out infinite`,
                animationDelay: `${bolt.delay}s`
              }}
            />
          </g>
        ))}
      </svg>
      
      {/* Flickering overlay */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at center, hsla(${hue}, 90%, 70%, ${0.05 * intensity}) 0%, transparent 70%)`,
          animation: `lightning-ambient ${3 / speed}s ease-in-out infinite alternate`
        }}
      />
      
      <style jsx>{`
        @keyframes lightning-flicker {
          0%, 90%, 100% { opacity: 0; }
          95% { opacity: 1; }
        }
        
        @keyframes lightning-pulse {
          0%, 85%, 100% { opacity: 0; }
          90%, 95% { opacity: 1; }
        }
        
        @keyframes lightning-ambient {
          0% { opacity: 0.3; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default Lightning;