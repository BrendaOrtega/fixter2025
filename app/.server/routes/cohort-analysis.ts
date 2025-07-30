import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { cohortAnalysis } from "../services/cohort-analysis";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const action = url.searchParams.get("action");
  const startDateParam = url.searchParams.get("startDate");
  const endDateParam = url.searchParams.get("endDate");
  const cohortType = url.searchParams.get("cohortType") as
    | "new"
    | "returning"
    | "high_engagement";

  // Parse dates if provided
  const startDate = startDateParam ? new Date(startDateParam) : undefined;
  const endDate = endDateParam ? new Date(endDateParam) : undefined;

  try {
    switch (action) {
      case "new-vs-returning":
        const userMetrics = await cohortAnalysis.getNewVsReturningUsers(
          startDate,
          endDate
        );
        return json(userMetrics);

      case "retention":
        if (!startDate) {
          return json(
            { error: "startDate is required for retention analysis" },
            { status: 400 }
          );
        }
        const retentionMetrics = await cohortAnalysis.getRetentionMetrics(
          startDate
        );
        return json(retentionMetrics);

      case "engagement":
        const engagementData = await cohortAnalysis.segmentUsersByEngagement(
          startDate,
          endDate
        );
        return json(engagementData);

      case "content-preferences":
        if (!cohortType) {
          return json(
            { error: "cohortType is required for content preferences" },
            { status: 400 }
          );
        }
        const preferences = await cohortAnalysis.getContentPreferencesByCohort(
          cohortType,
          startDate,
          endDate
        );
        return json(preferences);

      case "summary":
        const summary = await cohortAnalysis.getCohortSummary(
          startDate,
          endDate
        );
        return json(summary);

      default:
        return json({ error: "Invalid action parameter" }, { status: 400 });
    }
  } catch (error) {
    console.error("Cohort analysis error:", error);
    return json({ error: "Internal server error" }, { status: 500 });
  }
}
