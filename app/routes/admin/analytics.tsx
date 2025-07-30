import type { Route } from "./+types/analytics";
import { db } from "~/.server/db";
import { cohortAnalysis } from "~/.server/services/cohort-analysis";
import { performanceScoring } from "~/.server/services/performance-scoring";
import { useState, useCallback } from "react";
import { Form, Link } from "react-router";
import { HeatmapVisualization } from "~/components/HeatmapVisualization";
import Spinner from "~/components/common/Spinner";
import { getAdminOrRedirect } from "~/.server/dbGetters";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await getAdminOrRedirect(request);
  try {
    const url = new URL(request.url);
    const startDateParam = url.searchParams.get("startDate");
    const endDateParam = url.searchParams.get("endDate");

    // Default to last 30 days if no date range specified
    const endDate = endDateParam ? new Date(endDateParam) : new Date();
    const startDate = startDateParam
      ? new Date(startDateParam)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Validate date range
    if (startDate > endDate) {
      throw new Error("Start date cannot be after end date");
    }

    // Limit date range to prevent performance issues (max 1 year)
    const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
    if (endDate.getTime() - startDate.getTime() > maxRange) {
      throw new Error("Date range cannot exceed 1 year");
    }

    // Get cohort metrics with error handling
    let cohortSummary;
    try {
      cohortSummary = await cohortAnalysis.getCohortSummary(startDate, endDate);
    } catch (error) {
      console.error("Error loading cohort summary:", error);
      cohortSummary = {
        userMetrics: {
          totalUsers: 0,
          newUsers: 0,
          returningUsers: 0,
          retentionRate: 0,
        },
        engagementDistribution: {
          low: 0,
          medium: 0,
          high: 0,
        },
        topNewUserContent: [],
        topReturningUserContent: [],
      };
    }

    // Get performance trends and scores with error handling
    let performanceTrends, topPerformingContent;
    try {
      performanceTrends = await performanceScoring.getPerformanceTrends();
      topPerformingContent = await performanceScoring.getPerformanceScores(
        startDate,
        endDate,
        10
      );
    } catch (error) {
      console.error("Error loading performance data:", error);
      performanceTrends = {
        thisWeek: [],
        lastWeek: [],
        recommendations: [],
      };
      topPerformingContent = [];
    }

    // Get posts with analytics data for heatmap previews
    let postsWithAnalytics;
    try {
      const posts = await db.post.findMany({
        where: {
          published: true,
        },
        select: {
          id: true,
          title: true,
          slug: true,
          createdAt: true,
          coverImage: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      });

      // Get click counts for each post to show which have heatmap data
      postsWithAnalytics = await Promise.all(
        posts.map(async (post) => {
          try {
            const clickCount = await db.blogAnalytics.count({
              where: {
                postId: post.id,
                event: "click",
                clickX: { not: null },
                timestamp: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            });

            const pageViews = await db.blogAnalytics.count({
              where: {
                postId: post.id,
                event: "page_view",
                timestamp: {
                  gte: startDate,
                  lte: endDate,
                },
              },
            });

            return {
              ...post,
              clickCount,
              pageViews,
            };
          } catch (error) {
            console.error(
              `Error loading analytics for post ${post.id}:`,
              error
            );
            return {
              ...post,
              clickCount: 0,
              pageViews: 0,
            };
          }
        })
      );
    } catch (error) {
      console.error("Error loading posts:", error);
      postsWithAnalytics = [];
    }

    return {
      cohortSummary,
      postsWithAnalytics,
      performanceTrends,
      topPerformingContent,
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      error: null,
    };
  } catch (error) {
    console.error("Analytics loader error:", error);

    // Return error state with minimal data
    const endDate = new Date();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    return {
      cohortSummary: {
        userMetrics: {
          totalUsers: 0,
          newUsers: 0,
          returningUsers: 0,
          retentionRate: 0,
        },
        engagementDistribution: {
          low: 0,
          medium: 0,
          high: 0,
        },
        topNewUserContent: [],
        topReturningUserContent: [],
      },
      postsWithAnalytics: [],
      performanceTrends: {
        thisWeek: [],
        lastWeek: [],
        recommendations: [],
      },
      topPerformingContent: [],
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      error:
        error instanceof Error
          ? error.message
          : "Failed to load analytics data",
    };
  }
};

export default function AnalyticsPage({
  loaderData: {
    cohortSummary,
    postsWithAnalytics,
    performanceTrends,
    topPerformingContent,
    dateRange,
    error,
  },
}: Route.ComponentProps) {
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // CSV Export functionality
  const exportToCSV = useCallback(
    async (dataType: "cohort" | "performance" | "posts") => {
      setIsExporting(true);
      setExportError(null);

      try {
        let csvData = "";
        let filename = "";

        switch (dataType) {
          case "cohort":
            csvData = generateCohortCSV(cohortSummary);
            filename = `cohort-analysis-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
            break;
          case "performance":
            csvData = generatePerformanceCSV(topPerformingContent);
            filename = `content-performance-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
            break;
          case "posts":
            csvData = generatePostsCSV(postsWithAnalytics);
            filename = `posts-analytics-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
            break;
        }

        // Create and download CSV file
        const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error("Export error:", error);
        setExportError("Failed to export data. Please try again.");
      } finally {
        setIsExporting(false);
      }
    },
    [cohortSummary, topPerformingContent, postsWithAnalytics, dateRange]
  );

  // CSV generation functions
  const generateCohortCSV = (data: typeof cohortSummary) => {
    const headers = ["Metric", "Value", "Description"];
    const rows = [
      [
        "Total Users",
        data.userMetrics.totalUsers.toString(),
        "Unique sessions tracked",
      ],
      [
        "New Users",
        data.userMetrics.newUsers.toString(),
        "First-time visitors",
      ],
      [
        "Returning Users",
        data.userMetrics.returningUsers.toString(),
        "Multiple sessions",
      ],
      [
        "Retention Rate",
        `${data.userMetrics.retentionRate.toFixed(1)}%`,
        "Users who return",
      ],
      [
        "Low Engagement",
        (data.engagementDistribution.low || 0).toString(),
        "Low engagement users",
      ],
      [
        "Medium Engagement",
        (data.engagementDistribution.medium || 0).toString(),
        "Medium engagement users",
      ],
      [
        "High Engagement",
        (data.engagementDistribution.high || 0).toString(),
        "High engagement users",
      ],
    ];

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  const generatePerformanceCSV = (data: typeof topPerformingContent) => {
    const headers = [
      "Rank",
      "Title",
      "Score",
      "Views",
      "Avg Reading Time (s)",
      "Avg Scroll Depth (%)",
      "Trend Direction",
      "Score Change",
    ];
    const rows = data.map((content, index) => [
      (index + 1).toString(),
      content.title,
      content.score.toString(),
      content.metrics.viewCount.toString(),
      Math.round(content.metrics.avgReadingTime).toString(),
      Math.round(content.metrics.avgScrollDepth).toString(),
      content.trend.direction,
      content.trend.scoreChange.toString(),
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  const generatePostsCSV = (data: typeof postsWithAnalytics) => {
    const headers = [
      "Title",
      "Slug",
      "Page Views",
      "Click Count",
      "Created Date",
      "Has Heatmap Data",
    ];
    const rows = data.map((post) => [
      post.title,
      post.slug,
      post.pageViews.toString(),
      post.clickCount.toString(),
      new Date(post.createdAt).toLocaleDateString(),
      post.clickCount > 0 ? "Yes" : "No",
    ]);

    return [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");
  };

  // Loading component
  const LoadingCard = ({ title }: { title: string }) => (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
      <div className="flex items-center justify-center h-32">
        <div className="text-center">
          <Spinner className="w-8 h-8 mb-3" />
          <p className="text-gray-400 text-sm">Loading {title}...</p>
        </div>
      </div>
    </div>
  );

  // Error component
  const ErrorCard = ({
    title,
    error,
    onRetry,
  }: {
    title: string;
    error: string;
    onRetry?: () => void;
  }) => (
    <div className="bg-gradient-to-br from-red-900/20 to-gray-900 rounded-xl p-6 border border-red-500/30">
      <div className="text-center">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="text-lg font-semibold text-red-400 mb-2">
          Error Loading {title}
        </h3>
        <p className="text-gray-400 text-sm mb-4">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-20">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Analytics Dashboard
              </h1>
              <p className="text-gray-400">
                Advanced user behavior insights and content performance metrics
              </p>
            </div>

            {/* Export Controls */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => exportToCSV("cohort")}
                disabled={isExporting}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                {isExporting ? <Spinner className="w-4 h-4" /> : "📊"}
                Export Cohort Data
              </button>
              <button
                onClick={() => exportToCSV("performance")}
                disabled={isExporting}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                {isExporting ? <Spinner className="w-4 h-4" /> : "🏆"}
                Export Performance
              </button>
              <button
                onClick={() => exportToCSV("posts")}
                disabled={isExporting}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:opacity-50 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
              >
                {isExporting ? <Spinner className="w-4 h-4" /> : "📝"}
                Export Posts Data
              </button>
            </div>
          </div>

          {/* Export Error Display */}
          {exportError && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
              <div className="flex items-center gap-2 text-red-400">
                <span>⚠️</span>
                <span className="text-sm">{exportError}</span>
                <button
                  onClick={() => setExportError(null)}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Loader Error Display */}
        {error && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="text-red-400 text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-400 mb-2">
                  Analytics Data Error
                </h3>
                <p className="text-gray-300 text-sm mb-3">{error}</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.location.reload()}
                    className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Retry Loading
                  </button>
                  <Link
                    to="/admin/analytics"
                    className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    Reset Filters
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Date Range Filter */}
        <div className="mb-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">📅</span>
              Date Range Filter
            </h2>
            <div className="text-sm text-gray-400">
              Showing data from{" "}
              {new Date(dateRange.startDate).toLocaleDateString()} to{" "}
              {new Date(dateRange.endDate).toLocaleDateString()}
            </div>
          </div>

          <Form method="get" className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="startDate"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Start Date
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={dateRange.startDate}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="endDate"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                End Date
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={dateRange.endDate}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>🔍</span>
                Apply Filter
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = "/admin/analytics")}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <span>🔄</span>
                Reset
              </button>
            </div>
          </Form>

          {/* Quick Date Presets */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="text-sm text-gray-400 mr-2">Quick filters:</span>
            {[
              { label: "Last 7 days", days: 7 },
              { label: "Last 30 days", days: 30 },
              { label: "Last 90 days", days: 90 },
            ].map((preset) => {
              const endDate = new Date();
              const startDate = new Date(
                Date.now() - preset.days * 24 * 60 * 60 * 1000
              );
              const href = `/admin/analytics?startDate=${
                startDate.toISOString().split("T")[0]
              }&endDate=${endDate.toISOString().split("T")[0]}`;

              return (
                <Link
                  key={preset.days}
                  to={href}
                  className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded-full text-gray-300 hover:text-white transition-colors"
                >
                  {preset.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Cohort Metrics */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-blue-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-200">
                Total Users
              </h3>
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <span className="text-blue-400 text-xl">👥</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-blue-400 mb-1">
              {cohortSummary.userMetrics.totalUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">Unique sessions tracked</p>
            <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-400 rounded-full"
                style={{ width: "100%" }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-green-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-200">New Users</h3>
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <span className="text-green-400 text-xl">✨</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-green-400 mb-1">
              {cohortSummary.userMetrics.newUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">First-time visitors</p>
            <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-400 rounded-full"
                style={{
                  width: `${
                    cohortSummary.userMetrics.totalUsers > 0
                      ? (cohortSummary.userMetrics.newUsers /
                          cohortSummary.userMetrics.totalUsers) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-yellow-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-200">
                Returning Users
              </h3>
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <span className="text-yellow-400 text-xl">🔄</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-yellow-400 mb-1">
              {cohortSummary.userMetrics.returningUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-400">Multiple sessions</p>
            <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full"
                style={{
                  width: `${
                    cohortSummary.userMetrics.totalUsers > 0
                      ? (cohortSummary.userMetrics.returningUsers /
                          cohortSummary.userMetrics.totalUsers) *
                        100
                      : 0
                  }%`,
                }}
              ></div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 hover:border-purple-500/30 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-200">
                Retention Rate
              </h3>
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <span className="text-purple-400 text-xl">📈</span>
              </div>
            </div>
            <p className="text-3xl font-bold text-purple-400 mb-1">
              {cohortSummary.userMetrics.retentionRate.toFixed(1)}%
            </p>
            <p className="text-sm text-gray-400">Users who return</p>
            <div className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-400 rounded-full"
                style={{ width: `${cohortSummary.userMetrics.retentionRate}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Engagement Distribution */}
        <div className="mb-8 bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <span className="text-2xl">📊</span>
            User Engagement Distribution
          </h2>

          {(() => {
            const total =
              (cohortSummary.engagementDistribution.low || 0) +
              (cohortSummary.engagementDistribution.medium || 0) +
              (cohortSummary.engagementDistribution.high || 0);

            const lowPercent =
              total > 0
                ? ((cohortSummary.engagementDistribution.low || 0) / total) *
                  100
                : 0;
            const mediumPercent =
              total > 0
                ? ((cohortSummary.engagementDistribution.medium || 0) / total) *
                  100
                : 0;
            const highPercent =
              total > 0
                ? ((cohortSummary.engagementDistribution.high || 0) / total) *
                  100
                : 0;

            return (
              <div className="space-y-6">
                {/* Visual Bar Chart */}
                <div className="relative h-8 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="absolute left-0 top-0 h-full bg-red-400 transition-all duration-1000"
                    style={{ width: `${lowPercent}%` }}
                  ></div>
                  <div
                    className="absolute top-0 h-full bg-yellow-400 transition-all duration-1000"
                    style={{
                      left: `${lowPercent}%`,
                      width: `${mediumPercent}%`,
                    }}
                  ></div>
                  <div
                    className="absolute top-0 h-full bg-green-400 transition-all duration-1000"
                    style={{
                      left: `${lowPercent + mediumPercent}%`,
                      width: `${highPercent}%`,
                    }}
                  ></div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-red-400 text-lg">🔴</span>
                      <span className="text-sm font-medium text-gray-300">
                        Low Engagement
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-red-400 mb-1">
                      {(
                        cohortSummary.engagementDistribution.low || 0
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {lowPercent.toFixed(1)}% of users
                    </p>
                  </div>

                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-yellow-400 text-lg">🟡</span>
                      <span className="text-sm font-medium text-gray-300">
                        Medium Engagement
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-yellow-400 mb-1">
                      {(
                        cohortSummary.engagementDistribution.medium || 0
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {mediumPercent.toFixed(1)}% of users
                    </p>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <span className="text-green-400 text-lg">🟢</span>
                      <span className="text-sm font-medium text-gray-300">
                        High Engagement
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-green-400 mb-1">
                      {(
                        cohortSummary.engagementDistribution.high || 0
                      ).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      {highPercent.toFixed(1)}% of users
                    </p>
                  </div>
                </div>

                {total === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-400">
                      No engagement data available for the selected period.
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Content Performance Scoring */}
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Performing Content */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-2xl">🏆</span>
                Top Performing Content
              </h2>
              <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                Top {Math.min(5, topPerformingContent.length)}
              </div>
            </div>

            <div className="space-y-4">
              {topPerformingContent.slice(0, 5).map((content, index) => (
                <div
                  key={content.postId}
                  className="group relative bg-gray-700/50 hover:bg-gray-700 border border-gray-600/50 hover:border-gray-500 rounded-lg p-4 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                            index === 0
                              ? "bg-yellow-500/20 text-yellow-400"
                              : index === 1
                              ? "bg-gray-500/20 text-gray-400"
                              : index === 2
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-blue-500/20 text-blue-400"
                          }`}
                        >
                          #{index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-gray-200 truncate group-hover:text-white transition-colors">
                            {content.title}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs text-gray-400 mb-2">
                        <div className="flex items-center gap-1">
                          <span>👁️</span>
                          <span>
                            {content.metrics.viewCount.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>⏱️</span>
                          <span>
                            {Math.round(content.metrics.avgReadingTime)}s
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span>📜</span>
                          <span>
                            {Math.round(content.metrics.avgScrollDepth)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className={`text-2xl font-bold ${
                            content.score >= 80
                              ? "text-green-400"
                              : content.score >= 60
                              ? "text-yellow-400"
                              : "text-red-400"
                          }`}
                        >
                          {content.score}
                        </div>
                        <div className="text-xs text-gray-500">/100</div>
                      </div>

                      {content.trend.direction !== "stable" && (
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            content.trend.direction === "up"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          <span>
                            {content.trend.direction === "up" ? "↗️" : "↘️"}
                          </span>
                          <span>{Math.abs(content.trend.scoreChange)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Performance Bar */}
                  <div className="mt-3 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${
                        content.score >= 80
                          ? "bg-green-400"
                          : content.score >= 60
                          ? "bg-yellow-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${content.score}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>

            {topPerformingContent.length === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <p className="text-gray-400 text-sm">
                  No performance data available for the selected period.
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Try adjusting your date range or check back later.
                </p>
              </div>
            )}
          </div>

          {/* Performance Trends */}
          <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <span className="text-2xl">📈</span>
              Performance Trends
            </h2>

            <div className="space-y-6">
              {(() => {
                const thisWeekAvg =
                  performanceTrends.thisWeek.length > 0
                    ? Math.round(
                        performanceTrends.thisWeek.reduce(
                          (sum, p) => sum + p.score,
                          0
                        ) / performanceTrends.thisWeek.length
                      )
                    : 0;
                const lastWeekAvg =
                  performanceTrends.lastWeek.length > 0
                    ? Math.round(
                        performanceTrends.lastWeek.reduce(
                          (sum, p) => sum + p.score,
                          0
                        ) / performanceTrends.lastWeek.length
                      )
                    : 0;
                const weeklyChange = thisWeekAvg - lastWeekAvg;

                return (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-blue-400 text-lg">📅</span>
                        <span className="text-sm font-medium text-gray-300">
                          This Week Avg
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-blue-400 mb-1">
                        {thisWeekAvg}
                      </p>
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-400 rounded-full transition-all duration-1000"
                          style={{ width: `${thisWeekAvg}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-4 text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <span className="text-gray-400 text-lg">📊</span>
                        <span className="text-sm font-medium text-gray-300">
                          Last Week Avg
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-gray-400 mb-1">
                        {lastWeekAvg}
                      </p>
                      <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gray-400 rounded-full transition-all duration-1000"
                          style={{ width: `${lastWeekAvg}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Weekly Change Indicator */}
              {(() => {
                const thisWeekAvg =
                  performanceTrends.thisWeek.length > 0
                    ? Math.round(
                        performanceTrends.thisWeek.reduce(
                          (sum, p) => sum + p.score,
                          0
                        ) / performanceTrends.thisWeek.length
                      )
                    : 0;
                const lastWeekAvg =
                  performanceTrends.lastWeek.length > 0
                    ? Math.round(
                        performanceTrends.lastWeek.reduce(
                          (sum, p) => sum + p.score,
                          0
                        ) / performanceTrends.lastWeek.length
                      )
                    : 0;
                const weeklyChange = thisWeekAvg - lastWeekAvg;

                if (weeklyChange !== 0) {
                  return (
                    <div
                      className={`text-center p-3 rounded-lg border ${
                        weeklyChange > 0
                          ? "bg-green-500/10 border-green-500/20 text-green-400"
                          : "bg-red-500/10 border-red-500/20 text-red-400"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-lg">
                          {weeklyChange > 0 ? "📈" : "📉"}
                        </span>
                        <span className="font-medium">
                          {weeklyChange > 0 ? "+" : ""}
                          {weeklyChange} points from last week
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div>
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <span className="text-lg">🔥</span>
                  Trending Content
                </h3>
                <div className="space-y-3">
                  {performanceTrends.thisWeek
                    .filter((content) => content.trend.direction !== "stable")
                    .slice(0, 3)
                    .map((content) => (
                      <div
                        key={content.postId}
                        className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg border border-gray-600/30"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-gray-200 truncate block">
                            {content.title}
                          </span>
                          <div className="text-xs text-gray-400 mt-1">
                            Score: {content.score}/100
                          </div>
                        </div>
                        <div
                          className={`flex items-center gap-2 ml-3 ${
                            content.trend.direction === "up"
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          <span className="text-lg">
                            {content.trend.direction === "up" ? "↗️" : "↘️"}
                          </span>
                          <span className="font-medium">
                            {Math.abs(content.trend.scoreChange)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {performanceTrends.thisWeek.filter(
                  (c) => c.trend.direction !== "stable"
                ).length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm">
                      No trending content this week.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Performance Recommendations */}
        <div className="mb-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">
            Performance Recommendations
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {performanceTrends.recommendations.map((rec, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 ${
                  rec.impact === "high"
                    ? "border-red-400 bg-red-900/20"
                    : rec.impact === "medium"
                    ? "border-yellow-400 bg-yellow-900/20"
                    : "border-blue-400 bg-blue-900/20"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      rec.impact === "high"
                        ? "bg-red-600 text-white"
                        : rec.impact === "medium"
                        ? "bg-yellow-600 text-white"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    {rec.impact.toUpperCase()}
                  </span>
                  <span className="font-medium text-sm">{rec.contentType}</span>
                </div>
                <p className="text-sm text-gray-300">{rec.suggestion}</p>
              </div>
            ))}
          </div>
          {performanceTrends.recommendations.length === 0 && (
            <p className="text-gray-400 text-sm">
              No specific recommendations at this time. Keep monitoring your
              content performance!
            </p>
          )}
        </div>

        {/* Posts with Heatmap Previews */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <span className="text-2xl">📝</span>
              Posts with Analytics Data
            </h2>
            <div className="text-sm text-gray-400 bg-gray-800 px-3 py-1 rounded-full">
              {postsWithAnalytics.length} posts found
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {postsWithAnalytics.map((post) => (
              <div
                key={post.id}
                className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl overflow-hidden border border-gray-700 hover:border-gray-600 transition-all duration-200"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-gray-100 truncate mb-1">
                        {post.title}
                      </h3>
                      <div className="text-xs text-gray-400">
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        setSelectedPost(
                          selectedPost === post.id ? null : post.id
                        )
                      }
                      className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-blue-400 hover:text-blue-300 text-sm font-medium transition-all duration-200"
                    >
                      <span className="text-xs">
                        {selectedPost === post.id ? "👁️‍🗨️" : "👁️"}
                      </span>
                      {selectedPost === post.id ? "Hide" : "Show"} Heatmap
                    </button>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-blue-400 text-sm">👁️</span>
                        <span className="text-xs text-gray-400">Views</span>
                      </div>
                      <p className="text-lg font-bold text-blue-400">
                        {post.pageViews.toLocaleString()}
                      </p>
                    </div>

                    <div className="bg-gray-700/50 rounded-lg p-3 text-center">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <span className="text-purple-400 text-sm">👆</span>
                        <span className="text-xs text-gray-400">Clicks</span>
                      </div>
                      <p className="text-lg font-bold text-purple-400">
                        {post.clickCount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Status and Performance */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      {post.clickCount > 0 ? (
                        <div className="flex items-center gap-1 text-sm text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                          <span>✅</span>
                          <span>Heatmap Ready</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sm text-gray-500 bg-gray-600/20 px-2 py-1 rounded-full">
                          <span>⏳</span>
                          <span>No Clicks Yet</span>
                        </div>
                      )}
                    </div>

                    {/* Performance Score */}
                    {(() => {
                      const performanceData = topPerformingContent.find(
                        (p) => p.postId === post.id
                      );
                      if (performanceData) {
                        return (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">
                              Score:
                            </span>
                            <div
                              className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm font-bold ${
                                performanceData.score >= 80
                                  ? "bg-green-500/20 text-green-400"
                                  : performanceData.score >= 60
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-red-500/20 text-red-400"
                              }`}
                            >
                              <span>{performanceData.score}</span>
                              <span className="text-xs opacity-70">/100</span>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div className="text-xs text-gray-500 bg-gray-600/20 px-2 py-1 rounded-full">
                          No Score Yet
                        </div>
                      );
                    })()}
                  </div>

                  {/* Performance Recommendations */}
                  {(() => {
                    const performanceData = topPerformingContent.find(
                      (p) => p.postId === post.id
                    );
                    if (
                      performanceData &&
                      performanceData.recommendations.length > 0
                    ) {
                      return (
                        <div className="mt-2">
                          <details className="text-sm">
                            <summary className="cursor-pointer text-blue-400 hover:text-blue-300">
                              View Recommendations (
                              {performanceData.recommendations.length})
                            </summary>
                            <div className="mt-2 space-y-1">
                              {performanceData.recommendations
                                .slice(0, 2)
                                .map((rec, idx) => (
                                  <div
                                    key={idx}
                                    className="text-xs text-gray-300 bg-gray-700 p-2 rounded"
                                  >
                                    {rec}
                                  </div>
                                ))}
                            </div>
                          </details>
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Heatmap Preview */}
                {selectedPost === post.id && (
                  <div className="border-t border-gray-700 bg-gray-800/50">
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium flex items-center gap-2">
                          <span className="text-lg">🔥</span>
                          Click Heatmap Preview
                        </h4>
                        {post.clickCount > 0 && (
                          <div className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                            {post.clickCount} clicks recorded
                          </div>
                        )}
                      </div>

                      {post.clickCount > 0 ? (
                        <div>
                          <div
                            className="relative bg-gray-700 rounded-lg border border-gray-600 overflow-hidden"
                            style={{ height: "300px" }}
                          >
                            {/* Simulated content background */}
                            <div className="absolute inset-0 p-4 text-xs text-gray-500">
                              <div className="mb-3 font-semibold text-gray-400 truncate">
                                {post.title}
                              </div>
                              <div className="space-y-2">
                                <div className="h-2 bg-gray-600 rounded w-full"></div>
                                <div className="h-2 bg-gray-600 rounded w-4/5"></div>
                                <div className="h-2 bg-gray-600 rounded w-full"></div>
                                <div className="h-2 bg-gray-600 rounded w-3/4"></div>
                                <div className="h-2 bg-gray-600 rounded w-full"></div>
                                <div className="h-2 bg-gray-600 rounded w-2/3"></div>
                                <div className="h-2 bg-gray-600 rounded w-5/6"></div>
                                <div className="h-2 bg-gray-600 rounded w-full"></div>
                              </div>
                            </div>

                            {/* Heatmap overlay with error boundary */}
                            <div className="absolute inset-0">
                              <HeatmapVisualization
                                postId={post.id}
                                className="w-full h-full"
                                opacity={0.7}
                                radius={20}
                              />
                            </div>
                          </div>

                          <div className="mt-4 flex justify-between items-center">
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <span>📊</span>
                                {post.clickCount} clicks
                              </span>
                              <span className="flex items-center gap-1">
                                <span>👁️</span>
                                {post.pageViews} views
                              </span>
                            </div>
                            <Link
                              to={`/admin/heatmap/${post.id}`}
                              className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 hover:border-blue-500/50 px-3 py-1.5 rounded-lg text-blue-400 hover:text-blue-300 text-sm font-medium transition-all duration-200"
                            >
                              <span>🔍</span>
                              Full Analysis
                            </Link>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <div className="text-4xl mb-3">📊</div>
                          <p className="text-gray-400 text-sm mb-2">
                            No click data available yet
                          </p>
                          <p className="text-gray-500 text-xs">
                            Heatmap will appear once users start interacting
                            with this post
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {postsWithAnalytics.length === 0 && (
            <div className="col-span-full bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-12 text-center border border-gray-700">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">
                No Posts Found
              </h3>
              <p className="text-gray-400 mb-4">
                No posts found for the selected date range.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                <Link
                  to="/admin/posts"
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Create New Post
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                >
                  Refresh Data
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Top Content by User Type */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* New Users' Top Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Top Content - New Users
            </h3>
            {cohortSummary.topNewUserContent.length > 0 ? (
              <div className="space-y-3">
                {cohortSummary.topNewUserContent.map((content, index) => (
                  <div
                    key={content.postId}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span className="ml-2 text-sm text-gray-300">
                        {content.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {content.viewCount} views
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round(content.avgReadingTime)}s avg read
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>

          {/* Returning Users' Top Content */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">
              Top Content - Returning Users
            </h3>
            {cohortSummary.topReturningUserContent.length > 0 ? (
              <div className="space-y-3">
                {cohortSummary.topReturningUserContent.map((content, index) => (
                  <div
                    key={content.postId}
                    className="flex justify-between items-center"
                  >
                    <div>
                      <span className="text-sm font-medium">#{index + 1}</span>
                      <span className="ml-2 text-sm text-gray-300">
                        {content.category}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {content.viewCount} views
                      </div>
                      <div className="text-xs text-gray-400">
                        {Math.round(content.avgReadingTime)}s avg read
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-sm">No data available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
