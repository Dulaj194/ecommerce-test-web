"use client";

import { useEffect, useRef } from "react";

export function usePolling(
  task: () => void | Promise<void>,
  intervalMs: number,
  enabled = true,
  runImmediately = false
) {
  const taskRef = useRef(task);

  useEffect(() => {
    taskRef.current = task;
  }, [task]);

  useEffect(() => {
    if (!enabled || intervalMs <= 0) {
      return;
    }

    const runTask = () => {
      if (document.visibilityState !== "visible") {
        return;
      }
      void taskRef.current();
    };

    if (runImmediately) {
      runTask();
    }

    const timer = window.setInterval(runTask, intervalMs);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void taskRef.current();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled, intervalMs, runImmediately]);
}
