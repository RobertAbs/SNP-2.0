"use client";
import { useSheet } from "./useSheet";
import type { VolsData } from "@/lib/types";

export function useVols() {
  return useSheet<VolsData>("/api/vols", { rows: [], totals: { total: 0, year2026: 0, year2027: 0 } });
}
