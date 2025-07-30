import { db } from "~/.server/db";

// Types for cohort analysis
export type UserCohort = {
  sessionId: string;
  firstVisit: Date;
  totalSessions: number;
  totalReadingTime: number;
  avgScrollDepth: number;
  postsViewed: number;
  engagementLevel: "low" | "medium" | "high";
  contentPreferences: string[];
};

export type RetentionMetrics = {
  totalUsers: number;
  newUsers: number;
  returningUsers: number;
  retentionRate: number;
  avgSessionsPerUser: number;
};

export type ContentPreference = {
  postId: string;
  category: string;
  engagementScore: number;
  viewCount: number;
  avgReadingTime: number;
};

class CohortAnalysisService {
  /**
   * Identify new vs returning users by session
   * A returning user is one who has more than one session
   */
  async getNewVsReturningUsers(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    newUsers: string[];
    returningUsers: string[];
    metrics: RetentionMetrics;
  }> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get all sessions with their first occurrence
    const sessionData = await db.blogAnalytics.groupBy({
      by: ["sessionId"],
      where: {
        event: "page_view",
        ...dateFilter,
      },
      _count: {
        sessionId: true,
      },
      _min: {
        timestamp: true,
      },
    });

    const newUsers: string[] = [];
    const returningUsers: string[] = [];

    sessionData.forEach((session) => {
      if (session._count.sessionId === 1) {
        newUsers.push(session.sessionId);
      } else {
        returningUsers.push(session.sessionId);
      }
    });

    const totalUsers = sessionData.length;
    const retentionRate =
      totalUsers > 0 ? (returningUsers.length / totalUsers) * 100 : 0;
    const avgSessionsPerUser =
      totalUsers > 0
        ? sessionData.reduce((sum, s) => sum + s._count.sessionId, 0) /
          totalUsers
        : 0;

    return {
      newUsers,
      returningUsers,
      metrics: {
        totalUsers,
        newUsers: newUsers.length,
        returningUsers: returningUsers.length,
        retentionRate,
        avgSessionsPerUser,
      },
    };
  }

  /**
   * Calculate retention metrics for users who return within 7 days
   */
  async getRetentionMetrics(cohortStartDate: Date): Promise<{
    cohortSize: number;
    day1Retention: number;
    day7Retention: number;
    retainedUsers: string[];
  }> {
    const cohortEndDate = new Date(cohortStartDate);
    cohortEndDate.setDate(cohortEndDate.getDate() + 1);

    const day7Date = new Date(cohortStartDate);
    day7Date.setDate(day7Date.getDate() + 7);

    // Get users who first visited on the cohort date
    const cohortUsers = await db.blogAnalytics.groupBy({
      by: ["sessionId"],
      where: {
        event: "page_view",
        timestamp: {
          gte: cohortStartDate,
          lt: cohortEndDate,
        },
      },
      _min: {
        timestamp: true,
      },
    });

    const cohortSessionIds = cohortUsers.map((u) => u.sessionId);

    if (cohortSessionIds.length === 0) {
      return {
        cohortSize: 0,
        day1Retention: 0,
        day7Retention: 0,
        retainedUsers: [],
      };
    }

    // Check which users returned within 7 days
    const retainedUsers = await db.blogAnalytics.groupBy({
      by: ["sessionId"],
      where: {
        sessionId: { in: cohortSessionIds },
        event: "page_view",
        timestamp: {
          gt: cohortEndDate, // After their first day
          lte: day7Date, // Within 7 days
        },
      },
    });

    const retainedSessionIds = retainedUsers.map((u) => u.sessionId);

    return {
      cohortSize: cohortSessionIds.length,
      day1Retention: 0, // Would need day 1 specific logic
      day7Retention:
        (retainedSessionIds.length / cohortSessionIds.length) * 100,
      retainedUsers: retainedSessionIds,
    };
  }

  /**
   * Segment users by engagement level based on reading time and scroll depth
   */
  async segmentUsersByEngagement(
    startDate?: Date,
    endDate?: Date
  ): Promise<UserCohort[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // Get aggregated user behavior data
    const userStats = await db.blogAnalytics.groupBy({
      by: ["sessionId"],
      where: {
        ...dateFilter,
      },
      _count: {
        sessionId: true,
      },
      _sum: {
        readingTime: true,
      },
      _avg: {
        scrollDepth: true,
      },
      _min: {
        timestamp: true,
      },
    });

    // Get post view counts per user
    const postViews = await db.blogAnalytics.groupBy({
      by: ["sessionId", "postId"],
      where: {
        event: "page_view",
        ...dateFilter,
      },
    });

    const postViewCounts = postViews.reduce((acc, view) => {
      acc[view.sessionId] = (acc[view.sessionId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return userStats.map((user) => {
      const totalReadingTime = user._sum.readingTime || 0;
      const avgScrollDepth = user._avg.scrollDepth || 0;
      const postsViewed = postViewCounts[user.sessionId] || 0;

      // Calculate engagement level based on multiple factors
      const engagementScore = this.calculateEngagementScore(
        totalReadingTime,
        avgScrollDepth,
        postsViewed,
        user._count.sessionId
      );

      return {
        sessionId: user.sessionId,
        firstVisit: user._min.timestamp || new Date(),
        totalSessions: user._count.sessionId,
        totalReadingTime,
        avgScrollDepth,
        postsViewed,
        engagementLevel: this.categorizeEngagement(engagementScore),
        contentPreferences: [], // Will be populated by separate query
      };
    });
  }

  /**
   * Track content type preferences by user cohort
   */
  async getContentPreferencesByCohort(
    cohortType: "new" | "returning" | "high_engagement",
    startDate?: Date,
    endDate?: Date
  ): Promise<ContentPreference[]> {
    const dateFilter = this.buildDateFilter(startDate, endDate);

    // First, get the user cohort
    let targetSessions: string[] = [];

    if (cohortType === "new" || cohortType === "returning") {
      const { newUsers, returningUsers } = await this.getNewVsReturningUsers(
        startDate,
        endDate
      );
      targetSessions = cohortType === "new" ? newUsers : returningUsers;
    } else if (cohortType === "high_engagement") {
      const userCohorts = await this.segmentUsersByEngagement(
        startDate,
        endDate
      );
      targetSessions = userCohorts
        .filter((u) => u.engagementLevel === "high")
        .map((u) => u.sessionId);
    }

    if (targetSessions.length === 0) {
      return [];
    }

    // Get content engagement for this cohort
    const contentStats = await db.blogAnalytics.groupBy({
      by: ["postId"],
      where: {
        sessionId: { in: targetSessions },
        ...dateFilter,
      },
      _count: {
        postId: true,
      },
      _sum: {
        readingTime: true,
      },
      _avg: {
        scrollDepth: true,
      },
    });

    // Get post details to determine categories
    const postIds = contentStats.map((stat) => stat.postId);
    const posts = await db.post.findMany({
      where: {
        id: { in: postIds },
      },
      select: {
        id: true,
        category: true,
        mainTag: true,
      },
    });

    const postMap = posts.reduce((acc, post) => {
      acc[post.id] = post;
      return acc;
    }, {} as Record<string, (typeof posts)[0]>);

    return contentStats
      .map((stat) => {
        const post = postMap[stat.postId];
        const totalReadingTime = stat._sum.readingTime || 0;
        const avgScrollDepth = stat._avg.scrollDepth || 0;
        const viewCount = stat._count.postId;

        // Calculate engagement score for this content
        const engagementScore =
          totalReadingTime * 0.4 + avgScrollDepth * 0.4 + viewCount * 0.2;

        return {
          postId: stat.postId,
          category: post?.category?.[0] || post?.mainTag || "uncategorized",
          engagementScore,
          viewCount,
          avgReadingTime: viewCount > 0 ? totalReadingTime / viewCount : 0,
        };
      })
      .sort((a, b) => b.engagementScore - a.engagementScore);
  }

  /**
   * Get cohort analysis summary for dashboard
   */
  async getCohortSummary(startDate?: Date, endDate?: Date) {
    const [
      userMetrics,
      engagementSegments,
      newUserPreferences,
      returningUserPreferences,
    ] = await Promise.all([
      this.getNewVsReturningUsers(startDate, endDate),
      this.segmentUsersByEngagement(startDate, endDate),
      this.getContentPreferencesByCohort("new", startDate, endDate),
      this.getContentPreferencesByCohort("returning", startDate, endDate),
    ]);

    const engagementDistribution = engagementSegments.reduce((acc, user) => {
      acc[user.engagementLevel] = (acc[user.engagementLevel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      userMetrics: userMetrics.metrics,
      engagementDistribution,
      topNewUserContent: newUserPreferences.slice(0, 5),
      topReturningUserContent: returningUserPreferences.slice(0, 5),
      totalCohorts: engagementSegments.length,
    };
  }

  // Helper methods
  private buildDateFilter(startDate?: Date, endDate?: Date) {
    const filter: any = {};
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.gte = startDate;
      if (endDate) filter.timestamp.lte = endDate;
    }
    return filter;
  }

  private calculateEngagementScore(
    readingTime: number,
    scrollDepth: number,
    postsViewed: number,
    sessions: number
  ): number {
    // Weighted engagement score
    const timeScore = Math.min(readingTime / 300, 1) * 30; // Max 30 points for 5+ minutes
    const scrollScore = (scrollDepth / 100) * 25; // Max 25 points for 100% scroll
    const contentScore = Math.min(postsViewed / 5, 1) * 25; // Max 25 points for 5+ posts
    const sessionScore = Math.min(sessions / 3, 1) * 20; // Max 20 points for 3+ sessions

    return timeScore + scrollScore + contentScore + sessionScore;
  }

  private categorizeEngagement(score: number): "low" | "medium" | "high" {
    if (score >= 70) return "high";
    if (score >= 35) return "medium";
    return "low";
  }
}

export const cohortAnalysis = new CohortAnalysisService();
