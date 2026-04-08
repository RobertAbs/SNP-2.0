"use client";
import { useSheet } from "./useSheet";
import type { SmrRow } from "@/lib/types";

export function useSmr() {
  return useSheet<SmrRow[]>("/api/smr", []);
}
