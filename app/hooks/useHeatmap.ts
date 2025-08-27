import { useState, useEffect } from "react";

interface ClickPoint {
  x: number;
  y: number;
  intensity?: number;
}

interface HeatmapData {
  clicks: ClickPoint[];
  totalClicks: number;
  postId: string;
}

interface UseHeatmapOptions {
  enabled?: boolean;
  refetchInterval?: number;
}

export const useHeatmap = (postId: string, options: UseHeatmapOptions = {}) => {
  const { enabled = true, refetchInterval } = options;
  const [data, setData] = useState<HeatmapData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHeatmapData = async () => {
    if (!postId || !enabled) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/heatmap/${postId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch heatmap data: ${response.statusText}`);
      }

      const heatmapData = await response.json();
      setData(heatmapData);
    } catch (err) {
      console.error("Error fetching heatmap data:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load heatmap data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmapData();
  }, [postId, enabled]);

  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const interval = setInterval(fetchHeatmapData, refetchInterval);
    return () => clearInterval(interval);
  }, [refetchInterval, enabled, postId]);

  return {
    data,
    loading,
    error,
    refetch: fetchHeatmapData,
  };
};
