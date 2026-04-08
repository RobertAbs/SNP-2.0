import { parseCSV } from "./csv";
import type { ItdChecklistItem } from "../types";

/**
 * Лист "ИТД". Сейчас содержит только шапку из 19 видов документов.
 * Возвращаем список видов как чеклист (без данных).
 */
export function parseItdCSV(csv: string): ItdChecklistItem[] {
  const rows = parseCSV(csv);
  if (rows.length === 0) return [];

  const header = rows[0];
  const out: ItdChecklistItem[] = [];
  let idx = 0;
  for (const cell of header) {
    const name = (cell ?? "").trim().replace(/^-\s*/, "");
    if (!name) continue;
    out.push({ name, index: idx++ });
  }
  return out;
}
