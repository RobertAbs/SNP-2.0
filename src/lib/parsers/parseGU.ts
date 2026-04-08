import { parseCSV, parseDate } from "./csv";
import type { GUCheckpoint, GuSectionStatus } from "../types";

/** "15.04.2026" → "2026-04-15" */
function extractDeadline(s: string): string | null {
  const m = s.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{4})/);
  if (!m) return null;
  return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
}

/** Извлечь регион из имени подразделения "ДГД по Актюбинской области" → "Актюбинская область" */
function extractRegion(department: string): string {
  const m = department.match(/ДГД\s+по\s+(.+)/i);
  return m ? m[1].trim() : department.trim();
}

/**
 * Парсер листа "ГУ Пункты пропуска".
 * Шапка: №п/п, Подразделение, Наименование ГУ, Физический адрес, Из списка СОИ,
 *        Статус строительства ВОЛС, Статус подключения, Готовность ПСД, КВЭП.
 *
 * Между строками данных встречаются строки-разделители ("Завершены работы" / "В работе"),
 * которые задают sectionStatus для следующих за ними строк.
 */
export function parseGuCSV(csv: string): GUCheckpoint[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.toLowerCase());
  const findCol = (keywords: string[]): number =>
    header.findIndex(h => keywords.some(k => h.includes(k)));

  const colId       = findCol(["№", "п/п"]);
  const colDept     = findCol(["подразделение"]);
  const colName     = findCol(["наименование"]);
  const colAddr     = findCol(["адрес"]);
  const colFromSoi  = findCol(["из списка", "сои"]);
  const colVols     = findCol(["строительств"]);
  const colConn     = findCol(["подключен"]);
  const colPsd      = findCol(["псд", "готовность"]);
  const colKvep     = findCol(["квэп"]);

  let currentSection: GuSectionStatus = "in_progress";
  let currentDeadline: string | null = null;
  const out: GUCheckpoint[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const first = (cols[0] ?? "").trim();
    const firstLc = first.toLowerCase();
    const otherEmpty = cols.slice(1).every(c => !c || !c.trim());

    // Section header rows: other columns empty, first column — текст секции
    if (first && otherEmpty) {
      if (firstLc.includes("заверш")) {
        currentSection = "completed";
        currentDeadline = null;
        continue;
      }
      if (firstLc.includes("производств") || firstLc.includes("работе")) {
        const deadline = extractDeadline(first);
        if (deadline) {
          currentSection = "in_progress_deadline";
          currentDeadline = deadline;
        } else {
          currentSection = "in_progress";
          currentDeadline = null;
        }
        continue;
      }
      continue; // неизвестный разделитель — пропуск
    }

    const idVal = colId >= 0 ? cols[colId] : cols[0];
    const id = parseInt(idVal);
    const name = (colName >= 0 ? cols[colName] : cols[2] ?? "").trim();
    if (!id || isNaN(id) || !name) continue;

    const get = (idx: number, fallback: number) =>
      (cols[idx >= 0 ? idx : fallback] ?? "").trim();

    const department = get(colDept, 1);
    out.push({
      id,
      department,
      region: extractRegion(department),
      name,
      address: get(colAddr, 3),
      fromOriginalSOI: !get(colFromSoi, 4).toLowerCase().includes("нет"),
      volsStatus: get(colVols, 5) || "—",
      connectionStatus: get(colConn, 6) || "—",
      psdReady: get(colPsd, 7) || "—",
      kvepDate: parseDate(get(colKvep, 8)),
      sectionStatus: currentSection,
      sectionDeadline: currentDeadline,
    });
  }

  return out;
}
