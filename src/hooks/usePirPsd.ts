"use client";
import { useSheet } from "./useSheet";
import type { PirRow } from "@/lib/types";

export function usePirPsd() {
  return useSheet<PirRow[]>("/api/pir-psd", []);
}
