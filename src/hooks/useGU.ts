"use client";
import { useSheet } from "./useSheet";
import type { GUCheckpoint } from "@/lib/types";

export function useGU() {
  return useSheet<GUCheckpoint[]>("/api/gu", []);
}
