/**
 * Утилита загрузки данных листов.
 * Поддерживает 2 источника:
 *  1. Google Sheets (если задан SHEET_ID в .env)
 *  2. Локальные CSV в public/data/*.csv (fallback при отсутствии SHEET_ID)
 */

import { promises as fs } from "fs";
import path from "path";

const SHEET_ID = process.env.SHEET_ID || "";

export type SheetSlug = "GU" | "PIR_PSD" | "PIR_WEIGHTS" | "VOLS" | "SMR" | "ITD" | "SVOD";

export const GIDS: Record<SheetSlug, string> = {
  GU:          process.env.GID_GU          || "0",
  PIR_PSD:     process.env.GID_PIR_PSD     || "0",
  PIR_WEIGHTS: process.env.GID_PIR_WEIGHTS || "0",
  VOLS:        process.env.GID_VOLS        || "0",
  SMR:         process.env.GID_SMR         || "0",
  ITD:         process.env.GID_ITD         || "0",
  SVOD:        process.env.GID_SVOD        || "556254593",
};

const LOCAL_FILE: Record<SheetSlug, string> = {
  GU: "gu.csv",
  PIR_PSD: "pir-psd.csv",
  PIR_WEIGHTS: "pir-weights.csv",
  VOLS: "vols.csv",
  SMR: "smr.csv",
  ITD: "itd.csv",
  SVOD: "svod.csv",
};

export function buildCsvUrl(gid: string): string {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${gid}`;
}

export async function fetchSheetCsv(slug: SheetSlug): Promise<string> {
  // Google Sheets источник
  if (SHEET_ID) {
    const url = buildCsvUrl(GIDS[slug]);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Sheet fetch failed: ${res.status} ${res.statusText}`);
    return await res.text();
  }
  // Локальный fallback
  const file = path.join(process.cwd(), "public", "data", LOCAL_FILE[slug]);
  return await fs.readFile(file, "utf-8");
}
