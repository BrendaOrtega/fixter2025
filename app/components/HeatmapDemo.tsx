import React from "react";
import { HeatmapVisualization } from "./HeatmapVisualization";

interface HeatmapDemoProps {
  postId: string;
  title?: string;
  showControls?: boolean;
}

export const HeatmapDemo: React.FC<HeatmapDemoProps> = ({
  postId,
  title = "Click Heatmap",
  showControls = false,
}) => {
  const [opacity, setOpacity] = React.useState(0.6);
  const [radius, setRadius] = React.useState(25);

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        <p className="text-sm text-gray-600">
          Visualization of user click patterns on this content
        </p>
      </div>

      {showControls && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Opacity: {opacity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Radius: {radius}px
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      <div className="relative border border-gray-200 rounded-lg overflow-hidden">
        {/* Sample content area for demonstration */}
        <div className="p-8 bg-white min-h-[400px]">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Sample Content</h1>
            <p className="text-gray-700 mb-4">
              This is a sample content area where the heatmap overlay will show
              user click patterns. The heatmap visualization will display as a
              colored overlay on top of this content.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                Sample Button 1
              </button>
              <button className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                Sample Button 2
              </button>
            </div>
            <p className="text-gray-700">
              Click patterns will be visualized with different colors
              representing click density: blue for low activity, yellow for
              medium activity, and red for high activity areas.
            </p>
          </div>
        </div>

        {/* Heatmap overlay */}
        <HeatmapVisualization
          postId={postId}
          className="absolute inset-0"
          opacity={opacity}
          radius={radius}
          maxIntensity={10}
        />
      </div>

      <div className="mt-2 text-xs text-gray-500">Post ID: {postId}</div>
    </div>
  );
};

export default HeatmapDemo;
