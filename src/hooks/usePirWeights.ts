"use client";
import { useSheet } from "./useSheet";
import type { PirWeight } from "@/lib/types";

export function usePirWeights() {
  return useSheet<PirWeight[]>("/api/pir-weights", []);
}
