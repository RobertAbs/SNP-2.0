"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseSheetResult<T> {
  data: T | null;
  loading: boolean;
  refreshing: boolean;
  lastUpdated: Date | null;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Универсальный хук для получения данных одного API-эндпоинта с 60s polling. */
export function useSheet<T>(endpoint: string, initial: T | null = null): UseSheetResult<T> {
  const [data, setData] = useState<T | null>(initial);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (force = false) => {
    try {
      const url = force
        ? `${endpoint}?force=true&_t=${Date.now()}`
        : `${endpoint}?_t=${Date.now()}`;
      const res = await fetch(url, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });
      const json = await res.json();
      if (json.data !== undefined) {
        setData(json.data);
        setLastUpdated(new Date());
        setError(null);
      } else if (json.error) {
        setError(json.error);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    const id = setInterval(() => fetchData(), 60_000);
    return () => clearInterval(id);
  }, [fetchData]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData(true);
    setRefreshing(false);
  };

  return { data, loading, refreshing, lastUpdated, error, refresh };
}
