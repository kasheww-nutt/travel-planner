import { useEffect, useState } from "react";
import {
  forecastSchema,
  getTravelData,
  type Forecast,
} from "../lib/travelData";

export default function useForecast(
  city: string,
  date: string,
  enabled: boolean,
) {
  const [result, setResult] = useState<{
    key: string;
    data?: Forecast;
    error?: string;
  }>();
  const [attempt, setAttempt] = useState(0);
  const key = `${city}:${date}:${attempt}`;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort("timeout"), 15000);
    void getTravelData(
      `/api/weather?${new URLSearchParams({ city, date })}`,
      controller.signal,
    )
      .then((body) => {
        if (!controller.signal.aborted)
          setResult({ key, data: forecastSchema.parse(body) });
      })
      .catch((error) => {
        if (
          !controller.signal.aborted ||
          controller.signal.reason === "timeout"
        )
          setResult({
            key,
            error: controller.signal.aborted
              ? "Forecast request timed out. Try again."
              : error instanceof Error
                ? error.message
                : "Forecast unavailable.",
          });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [city, date, enabled, attempt]);
  const current = result?.key === key ? result : undefined;
  return {
    data: enabled ? current?.data : undefined,
    error: current?.error,
    loading: enabled && !current,
    retry: () => setAttempt((a) => a + 1),
  };
}
