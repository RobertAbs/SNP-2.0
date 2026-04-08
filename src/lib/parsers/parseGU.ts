import { parseCSV, parseDate } from "./csv";
import type { GUCheckpoint, GuSectionStatus } from "../types";

function extractDeadline(s: string): string | null {
  const m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

function extractRegion(department: string): string {
  const m = department.match(/ДГД\s+по\s+(.+)/i);
  return m ? m[1].trim() : department.trim();
}

/**
 * Парсер листа "ТП/ПП" (новая структура 2026).
 * Колонки: №п/п | Подразделение | Наименование ГУ | Статус СМР |
 *          Статус подключения | Готовность ПСД | Согласование Заказчика | КВЭП
 *
 * Секции-разделители — в первой непустой ячейке (обычно col[1]):
 *   "Завершены работы"
 *   "В производстве со сроком завершения СМР ..."
 */
export function parseGuCSV(csv: string): GUCheckpoint[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  let currentSection: GuSectionStatus = "in_progress";
  let currentDeadline: string | null = null;
  const out: GUCheckpoint[] = [];

  // пропустить шапку (может занимать несколько строк)
  let start = 0;
  for (let i = 0; i < Math.min(3, rows.length); i++) {
    const joined = rows[i].join(" ").toLowerCase();
    if (joined.includes("наименование") || joined.includes("подразделение")) {
      start = i + 1;
    }
  }

  for (let i = start; i < rows.length; i++) {
    const cols = rows[i];
    if (cols.every(c => !c || !c.trim())) continue;

    // определить "информационную" ячейку: первая непустая
    const firstNonEmptyIdx = cols.findIndex(c => c && c.trim());
    const firstNonEmpty = firstNonEmptyIdx >= 0 ? cols[firstNonEmptyIdx].trim() : "";

    const id = parseInt((cols[0] ?? "").trim());

    // Section header row: нет числового id в col[0], есть какой-то текст
    if (!id || isNaN(id)) {
      const lc = firstNonEmpty.toLowerCase();
      if (lc.includes("производств") || lc.includes("работе")) {
        const d = extractDeadline(firstNonEmpty);
        currentSection = "in_progress";
        currentDeadline = d;
        continue;
      }
      if (lc.includes("заверш")) {
        currentSection = "completed";
        currentDeadline = null;
        continue;
      }
      continue;
    }

    const department = (cols[1] ?? "").trim();
    const name = (cols[2] ?? "").trim();
    if (!name) continue;

    out.push({
      id,
      department,
      region: extractRegion(department),
      name,
      address: "",
      fromOriginalSOI: false,
      volsStatus: (cols[3] ?? "").trim() || "—",
      connectionStatus: (cols[4] ?? "").trim() || "—",
      psdReady: (cols[5] ?? "").trim() || "—",
      customerApproval: parseDate((cols[6] ?? "").trim()),
      kvepDate: parseDate((cols[7] ?? "").trim()),
      sectionStatus: currentSection,
      sectionDeadline: currentDeadline,
    });
  }

  return out;
}
