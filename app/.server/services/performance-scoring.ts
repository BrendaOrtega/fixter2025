import { db } from "~/.server/db";

export interface ContentPerformanceScore {
  postId: string;
  title: string;
  slug: string;
  score: number;
  metrics: {
    avgReadingTime: number;
    avgScrollDepth: number;
    completionRate: number;
    engagementScore: number;
    viewCount: number;
    returnVisitorRate: number;
  };
  trend: {
    scoreChange: number;
    direction: "up" | "down" | "stable";
  };
  recommendations: string[];
}

export interface PerformanceTrend {
  thisWeek: ContentPerformanceScore[];
  lastWeek: ContentPerformanceScore[];
  topPerformers: ContentPerformanceScore[];
  recommendations: {
    contentType: string;
    suggestion: string;
    impact: "high" | "medium" | "low";
  }[];
}

class PerformanceScoringService {
  /**
   * Calculate performance score for a post based on multiple metrics
   */
  private calculatePerformanceScore(metrics: {
    avgReadingTime: number;
    avgScrollDepth: number;
    completionRate: number;
    viewCount: number;
    returnVisitorRate: number;
  }): number {
    // Normalize metrics to 0-100 scale
    const readingTimeScore = Math.min(metrics.avgReadingTime / 300, 1) * 100; // 5 minutes = 100%
    const scrollDepthScore = metrics.avgScrollDepth; // Already 0-100
    const completionScore = metrics.completionRate; // Already 0-100
    const popularityScore = Math.min(metrics.viewCount / 100, 1) * 100; // 100 views = 100%
    const loyaltyScore = metrics.returnVisitorRate * 100; // Already 0-1, convert to 0-100

    // Weighted average (reading time and scroll depth are most important)
    const score =
      readingTimeScore * 0.3 +
      scrollDepthScore * 0.25 +
      completionScore * 0.2 +
      popularityScore * 0.15 +
      loyaltyScore * 0.1;

    return Math.round(score);
  }

  /**
   * Generate recommendations based on performance patterns
   */
  private generateRecommendations(metrics: {
    avgReadingTime: number;
    avgScrollDepth: number;
    completionRate: number;
    viewCount: number;
    returnVisitorRate: number;
  }): string[] {
    const recommendations: string[] = [];

    if (metrics.avgScrollDepth < 50) {
      recommendations.push(
        "Consider adding more engaging content above the fold to improve scroll depth"
      );
    }

    if (metrics.avgReadingTime < 60) {
      recommendations.push(
        "Content might be too short - consider adding more detailed explanations"
      );
    }

    if (metrics.avgReadingTime > 600) {
      recommendations.push(
        "Content might be too long - consider breaking into multiple parts"
      );
    }

    if (metrics.completionRate < 30) {
      recommendations.push(
        "Low completion rate - try improving content structure and readability"
      );
    }

    if (metrics.returnVisitorRate < 0.1) {
      recommendations.push(
        "Low return visitor rate - consider adding related content links"
      );
    }

    if (metrics.viewCount < 10) {
      recommendations.push(
        "Low view count - improve SEO and social media promotion"
      );
    }

    return recommendations;
  }

  /**
   * Get performance scores for posts within a date range
   */
  async getPerformanceScores(
    startDate: Date,
    endDate: Date,
    limit: number = 20
  ): Promise<ContentPerformanceScore[]> {
    // Get posts that have analytics data in the date range
    const postsWithAnalytics = await db.blogAnalytics.groupBy({
      by: ["postId"],
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      _count: {
        postId: true,
      },
    });

    // Get post details for posts with analytics
    const posts = await db.post.findMany({
      where: {
        published: true,
        id: {
          in: postsWithAnalytics.map((p) => p.postId),
        },
      },
      select: {
        id: true,
        title: true,
        slug: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const performanceScores: ContentPerformanceScore[] = [];

    for (const post of posts) {
      // Get analytics data for this post
      const analytics = await db.blogAnalytics.findMany({
        where: {
          postId: post.id,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      if (analytics.length === 0) continue;

      // Calculate metrics
      const pageViews = analytics.filter((a) => a.event === "page_view").length;
      const uniqueSessions = new Set(analytics.map((a) => a.sessionId)).size;

      const readingTimes = analytics
        .filter((a) => a.readingTime !== null && a.readingTime > 0)
        .map((a) => a.readingTime!);

      const scrollDepths = analytics
        .filter((a) => a.scrollDepth !== null && a.scrollDepth > 0)
        .map((a) => a.scrollDepth!);

      const completionRates = analytics
        .filter((a) => a.completionRate !== null && a.completionRate > 0)
        .map((a) => a.completionRate!);

      // Calculate averages
      const avgReadingTime =
        readingTimes.length > 0
          ? readingTimes.reduce((sum, time) => sum + time, 0) /
            readingTimes.length
          : 0;

      const avgScrollDepth =
        scrollDepths.length > 0
          ? scrollDepths.reduce((sum, depth) => sum + depth, 0) /
            scrollDepths.length
          : 0;

      const avgCompletionRate =
        completionRates.length > 0
          ? completionRates.reduce((sum, rate) => sum + rate, 0) /
            completionRates.length
          : 0;

      // Calculate return visitor rate
      const sessionCounts = analytics.reduce((acc, a) => {
        acc[a.sessionId] = (acc[a.sessionId] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const returningSessions = Object.values(sessionCounts).filter(
        (count) => count > 1
      ).length;
      const returnVisitorRate =
        uniqueSessions > 0 ? returningSessions / uniqueSessions : 0;

      const metrics = {
        avgReadingTime,
        avgScrollDepth,
        completionRate: avgCompletionRate,
        engagementScore: (avgReadingTime / 60) * (avgScrollDepth / 100) * 100, // Simple engagement score
        viewCount: pageViews,
        returnVisitorRate,
      };

      const score = this.calculatePerformanceScore(metrics);
      const recommendations = this.generateRecommendations(metrics);

      performanceScores.push({
        postId: post.id,
        title: post.title,
        slug: post.slug,
        score,
        metrics,
        trend: {
          scoreChange: 0, // Will be calculated when comparing periods
          direction: "stable",
        },
        recommendations,
      });
    }

    // Sort by score and return top performers
    return performanceScores.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  /**
   * Get performance trends comparing this week vs last week
   */
  async getPerformanceTrends(): Promise<PerformanceTrend> {
    const now = new Date();
    const thisWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const lastWeekEnd = thisWeekStart;

    // Get scores for both periods
    const [thisWeekScores, lastWeekScores] = await Promise.all([
      this.getPerformanceScores(thisWeekStart, now, 10),
      this.getPerformanceScores(lastWeekStart, lastWeekEnd, 10),
    ]);

    // Calculate trends by comparing scores
    const thisWeekWithTrends = thisWeekScores.map((thisWeek) => {
      const lastWeek = lastWeekScores.find(
        (lw) => lw.postId === thisWeek.postId
      );
      if (lastWeek) {
        const scoreChange = thisWeek.score - lastWeek.score;
        const direction =
          scoreChange > 5 ? "up" : scoreChange < -5 ? "down" : "stable";

        return {
          ...thisWeek,
          trend: {
            scoreChange,
            direction: direction as "up" | "down" | "stable",
          },
        };
      }
      return thisWeek;
    });

    // Generate overall recommendations
    const recommendations = this.generateOverallRecommendations(
      thisWeekScores,
      lastWeekScores
    );

    return {
      thisWeek: thisWeekWithTrends,
      lastWeek: lastWeekScores,
      topPerformers: thisWeekScores.slice(0, 5),
      recommendations,
    };
  }

  /**
   * Generate overall recommendations based on performance patterns
   */
  private generateOverallRecommendations(
    thisWeek: ContentPerformanceScore[],
    lastWeek: ContentPerformanceScore[]
  ): {
    contentType: string;
    suggestion: string;
    impact: "high" | "medium" | "low";
  }[] {
    const recommendations: {
      contentType: string;
      suggestion: string;
      impact: "high" | "medium" | "low";
    }[] = [];

    // Analyze average metrics
    const thisWeekAvg = this.calculateAverageMetrics(thisWeek);
    const lastWeekAvg = this.calculateAverageMetrics(lastWeek);

    if (thisWeekAvg.avgReadingTime < lastWeekAvg.avgReadingTime) {
      recommendations.push({
        contentType: "Content Length",
        suggestion:
          "Reading time has decreased. Consider creating more in-depth content.",
        impact: "medium",
      });
    }

    if (thisWeekAvg.avgScrollDepth < lastWeekAvg.avgScrollDepth) {
      recommendations.push({
        contentType: "Content Structure",
        suggestion:
          "Scroll depth is declining. Improve content layout and add more engaging elements.",
        impact: "high",
      });
    }

    if (thisWeekAvg.returnVisitorRate < lastWeekAvg.returnVisitorRate) {
      recommendations.push({
        contentType: "Content Strategy",
        suggestion:
          "Return visitor rate is down. Focus on creating series or related content.",
        impact: "high",
      });
    }

    // Find top performing content patterns
    const topPerformers = thisWeek.slice(0, 3);
    if (topPerformers.length > 0) {
      const avgTopScore =
        topPerformers.reduce((sum, p) => sum + p.score, 0) /
        topPerformers.length;
      if (avgTopScore > 70) {
        recommendations.push({
          contentType: "Content Replication",
          suggestion:
            "Analyze your top-performing content patterns and create similar content.",
          impact: "high",
        });
      }
    }

    return recommendations;
  }

  /**
   * Calculate average metrics for a set of performance scores
   */
  private calculateAverageMetrics(scores: ContentPerformanceScore[]) {
    if (scores.length === 0) {
      return {
        avgReadingTime: 0,
        avgScrollDepth: 0,
        completionRate: 0,
        returnVisitorRate: 0,
      };
    }

    return {
      avgReadingTime:
        scores.reduce((sum, s) => sum + s.metrics.avgReadingTime, 0) /
        scores.length,
      avgScrollDepth:
        scores.reduce((sum, s) => sum + s.metrics.avgScrollDepth, 0) /
        scores.length,
      completionRate:
        scores.reduce((sum, s) => sum + s.metrics.completionRate, 0) /
        scores.length,
      returnVisitorRate:
        scores.reduce((sum, s) => sum + s.metrics.returnVisitorRate, 0) /
        scores.length,
    };
  }
}

export const performanceScoring = new PerformanceScoringService();
