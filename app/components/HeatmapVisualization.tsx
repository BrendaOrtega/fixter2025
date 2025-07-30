import React, { useEffect, useState, useRef } from "react";

interface ClickPoint {
  x: number; // Percentage (0-100)
  y: number; // Percentage (0-100)
  intensity?: number;
}

interface HeatmapProps {
  postId: string;
  className?: string;
  opacity?: number;
  radius?: number;
  maxIntensity?: number;
}

interface HeatmapData {
  clicks: ClickPoint[];
  totalClicks: number;
}

export const HeatmapVisualization: React.FC<HeatmapProps> = ({
  postId,
  className = "",
  opacity = 0.6,
  radius = 25,
  maxIntensity = 10,
}) => {
  const [heatmapData, setHeatmapData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch click coordinate data from the API
  useEffect(() => {
    const fetchHeatmapData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/heatmap/${postId}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch heatmap data: ${response.statusText}`
          );
        }

        const data = await response.json();
        setHeatmapData(data);
        setError(null);
      } catch (err) {
        console.error("Error fetching heatmap data:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load heatmap data"
        );
      } finally {
        setLoading(false);
      }
    };

    if (postId) {
      fetchHeatmapData();
    }
  }, [postId]);

  // Simple density calculation - group nearby clicks
  const calculateDensity = (
    clicks: ClickPoint[],
    containerWidth: number,
    containerHeight: number
  ) => {
    const densityMap = new Map<string, number>();
    const gridSize = Math.max(containerWidth, containerHeight) / 50; // Adaptive grid size

    clicks.forEach((click) => {
      // Convert percentage to pixel coordinates
      const pixelX = (click.x / 100) * containerWidth;
      const pixelY = (click.y / 100) * containerHeight;

      // Create grid key for grouping nearby clicks
      const gridX = Math.floor(pixelX / gridSize);
      const gridY = Math.floor(pixelY / gridSize);
      const key = `${gridX},${gridY}`;

      densityMap.set(key, (densityMap.get(key) || 0) + 1);
    });

    // Convert back to points with intensity
    const densityPoints: ClickPoint[] = [];
    densityMap.forEach((intensity, key) => {
      const [gridX, gridY] = key.split(",").map(Number);
      const pixelX = gridX * gridSize + gridSize / 2;
      const pixelY = gridY * gridSize + gridSize / 2;

      densityPoints.push({
        x: (pixelX / containerWidth) * 100,
        y: (pixelY / containerHeight) * 100,
        intensity: Math.min(intensity, maxIntensity),
      });
    });

    return densityPoints;
  };

  // Render heatmap on canvas
  const renderHeatmap = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;

    if (!canvas || !container || !heatmapData) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size to match container
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate density points
    const densityPoints = calculateDensity(
      heatmapData.clicks,
      canvas.width,
      canvas.height
    );

    // Render each density point as a radial gradient
    densityPoints.forEach((point) => {
      const pixelX = (point.x / 100) * canvas.width;
      const pixelY = (point.y / 100) * canvas.height;
      const intensity = point.intensity || 1;

      // Create radial gradient
      const gradient = ctx.createRadialGradient(
        pixelX,
        pixelY,
        0,
        pixelX,
        pixelY,
        radius
      );

      // Color intensity based on click density (blue to red scale)
      const normalizedIntensity = intensity / maxIntensity;
      const alpha = normalizedIntensity * opacity;

      if (normalizedIntensity < 0.3) {
        // Low intensity - blue
        gradient.addColorStop(0, `rgba(0, 100, 255, ${alpha})`);
        gradient.addColorStop(1, `rgba(0, 100, 255, 0)`);
      } else if (normalizedIntensity < 0.7) {
        // Medium intensity - green/yellow
        gradient.addColorStop(0, `rgba(255, 255, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 255, 0, 0)`);
      } else {
        // High intensity - red
        gradient.addColorStop(0, `rgba(255, 0, 0, ${alpha})`);
        gradient.addColorStop(1, `rgba(255, 0, 0, 0)`);
      }

      // Draw the gradient circle
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pixelX, pixelY, radius, 0, 2 * Math.PI);
      ctx.fill();
    });
  };

  // Re-render when data changes or container resizes
  useEffect(() => {
    renderHeatmap();
  }, [heatmapData, opacity, radius, maxIntensity]);

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
      setTimeout(renderHeatmap, 100); // Debounce resize
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [heatmapData]);

  if (loading) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-50 rounded">
          <div className="text-sm text-gray-600">Loading heatmap...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-red-100 bg-opacity-50 rounded">
          <div className="text-sm text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (!heatmapData || heatmapData.clicks.length === 0) {
    return (
      <div className={`relative ${className}`}>
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-30 rounded">
          <div className="text-sm text-gray-500">No click data available</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          width: "100%",
          height: "100%",
          zIndex: 10,
        }}
      />
      <div className="absolute top-2 right-2 bg-white bg-opacity-80 rounded px-2 py-1 text-xs text-gray-600 z-20">
        {heatmapData.totalClicks} clicks
      </div>
    </div>
  );
};

export default HeatmapVisualization;
