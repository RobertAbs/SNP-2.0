"use client";
import { useSheet } from "./useSheet";
import type { SvodRow } from "@/lib/types";

export function useSvod() {
  return useSheet<SvodRow[]>("/api/svod", []);
}
