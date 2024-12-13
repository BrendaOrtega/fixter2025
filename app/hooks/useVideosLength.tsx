import { useEffect, useMemo, useState } from "react";
import { useFetcher } from "react-router";

export const useVideosLength = (courseId: string) => {
  const fetcher = useFetcher();

  const videosLength = useMemo(() => fetcher.data?.videosLength, [fetcher]) as
    | number
    | null;

  useEffect(() => {
    // getting number of lessons
    fetcher.submit(
      {
        intent: "videos_length",
        courseId,
      },
      { method: "POST", action: "/api/course" }
    );
  }, []);
  return videosLength;
};
