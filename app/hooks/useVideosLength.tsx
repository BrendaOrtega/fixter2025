import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";

export const useVideosLength = (courseId?: string, skip?: boolean) => {
  const fetcher = useFetcher();

  const videosLength = useMemo(() => fetcher.data?.videosLength, [fetcher]) as
    | number
    | null;

  useEffect(() => {
    // Skip if no courseId or explicitly skipped
    if (!courseId || skip) return;

    // getting number of lessons
    fetcher.submit(
      {
        intent: "videos_length",
        courseId,
      },
      { method: "POST", action: "/api/course" }
    );
  }, [courseId, skip]);
  return videosLength;
};
