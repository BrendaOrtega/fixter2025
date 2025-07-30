import type { Route } from "./+types/heatmap.$postId";
import { getAdminOrRedirect } from "~/.server/dbGetters";
import { db } from "~/.server/db";
import { HeatmapVisualization } from "~/components/HeatmapVisualization";
import { Link } from "react-router";
import { useState } from "react";

export const loader = async ({ request, params }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);

  const { postId } = params;

  if (!postId) {
    throw new Response("Post ID is required", { status: 400 });
  }

  // Get post details
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      metaImage: true,
    },
  });

  if (!post) {
    throw new Response("Post not found", { status: 404 });
  }

  // Get analytics summary for this post
  const analyticsCount = await db.blogAnalytics.count({
    where: { postId },
  });

  const clickCount = await db.blogAnalytics.count({
    where: {
      postId,
      event: "click",
      clickX: { not: null },
      clickY: { not: null },
    },
  });

  return {
    post,
    analyticsCount,
    clickCount,
  };
};

export default function AdminHeatmapPage({
  loaderData: { post, analyticsCount, clickCount },
}: Route.ComponentProps) {
  const [opacity, setOpacity] = useState(0.6);
  const [radius, setRadius] = useState(25);
  const [maxIntensity, setMaxIntensity] = useState(10);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link
                to="/admin"
                className="text-blue-400 hover:text-blue-300 text-sm mb-2 inline-block"
              >
                ← Back to Admin Dashboard
              </Link>
              <h1 className="text-2xl font-bold">Heatmap Analysis</h1>
              <p className="text-gray-400 mt-1">{post.title}</p>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-400">
                Total Events:{" "}
                <span className="text-white font-semibold">
                  {analyticsCount}
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Click Events:{" "}
                <span className="text-white font-semibold">{clickCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Opacity: {opacity.toFixed(1)}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Radius: {radius}px
              </label>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Max Intensity: {maxIntensity}
              </label>
              <input
                type="range"
                min="5"
                max="20"
                step="1"
                value={maxIntensity}
                onChange={(e) => setMaxIntensity(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          {/* Post Preview with Heatmap */}
          <div className="relative">
            {/* Simulated post content */}
            <div className="p-8 bg-white text-gray-900 min-h-[600px]">
              <div className="max-w-3xl mx-auto">
                {post.coverImage && (
                  <img
                    src={post.coverImage}
                    alt={post.title}
                    className="w-full h-64 object-cover rounded-lg mb-6"
                  />
                )}
                <h1 className="text-3xl font-bold mb-6">{post.title}</h1>
                <div className="prose prose-lg max-w-none">
                  <p className="text-gray-700 mb-4">
                    This is a preview of the post content where the heatmap
                    overlay shows user click patterns. The visualization
                    displays click density with different colors representing
                    interaction intensity.
                  </p>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <button className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                      Sample Button 1
                    </button>
                    <button className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors">
                      Sample Button 2
                    </button>
                  </div>
                  <p className="text-gray-700 mb-4">
                    Blue areas indicate low click activity, yellow shows medium
                    activity, and red represents high-activity zones where users
                    interact most frequently.
                  </p>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">Analytics Summary</h3>
                    <ul className="text-sm text-gray-600">
                      <li>Total analytics events: {analyticsCount}</li>
                      <li>Click events with coordinates: {clickCount}</li>
                      <li>Post ID: {post.id}</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Heatmap Overlay */}
            <HeatmapVisualization
              postId={post.id}
              className="absolute inset-0"
              opacity={opacity}
              radius={radius}
              maxIntensity={maxIntensity}
            />
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Post Information</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-gray-400 text-sm">Title</dt>
                <dd className="text-white">{post.title}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-sm">Slug</dt>
                <dd className="text-white">{post.slug}</dd>
              </div>
              <div>
                <dt className="text-gray-400 text-sm">Post ID</dt>
                <dd className="text-white font-mono text-sm">{post.id}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <Link
                to={`/blog/${post.slug}`}
                target="_blank"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                View Live Post →
              </Link>
            </div>
          </div>

          <div className="bg-gray-800 p-6 rounded-lg">
            <h3 className="text-lg font-semibold mb-4">Heatmap Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm">Low Activity (1-30% of max)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm">Medium Activity (30-70% of max)</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm">High Activity (70-100% of max)</span>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-400">
              Adjust the controls above to customize the heatmap visualization.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
