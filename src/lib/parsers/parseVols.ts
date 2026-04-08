import { parseCSV, parseNum } from "./csv";
import type { VolsData, VolsRow, VolsTotals } from "../types";

/**
 * Лист "ВОЛС".
 * Сначала идут строки итогов:
 *   "ОБЩАЯ протяженность ВОЛС | 35437.781"
 *   "ВОЛС 2026 | 20519.873"
 *   "ВОЛС 2027 | 14917.908"
 * Затем шапка: №п/п | Наименование проекта/Населенный пункт | Ориентировочная протяженность ВОЛС (км) | Год
 * Затем данные.
 */
export function parseVolsCSV(csv: string): VolsData {
  const rows = parseCSV(csv);
  const totals: VolsTotals = { total: 0, year2026: 0, year2027: 0 };
  const out: VolsRow[] = [];

  let dataStart = -1;
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const joined = r.join(" ").toLowerCase();

    if (joined.includes("общая протяжен")) {
      // длина обычно в одной из колонок
      for (const c of r) { const n = parseNum(c); if (n > totals.total) totals.total = n; }
    } else if (joined.includes("волс 2026")) {
      for (const c of r) { const n = parseNum(c); if (n > totals.year2026) totals.year2026 = n; }
    } else if (joined.includes("волс 2027")) {
      for (const c of r) { const n = parseNum(c); if (n > totals.year2027) totals.year2027 = n; }
    } else if (joined.includes("№п/п") || joined.includes("№ п/п")) {
      dataStart = i + 1;
      break;
    }
  }

  if (dataStart > 0) {
    let id = 0;
    for (let i = dataStart; i < rows.length; i++) {
      const cols = rows[i];
      const idRaw = (cols[0] ?? "").trim();
      const name = (cols[1] ?? "").trim();
      const lengthKm = parseNum(cols[2]);
      const yearRaw = (cols[3] ?? "").trim();
      const year = parseInt(yearRaw);
      if (!name || lengthKm <= 0) continue;
      const level = idRaw ? idRaw.split(".").length : 0;
      out.push({
        id: ++id,
        idRaw,
        level,
        projectName: name,
        lengthKm,
        year: isNaN(year) ? null : year,
      });
    }
  }

  // Если итоги пустые — рассчитываем из данных
  if (totals.total === 0 && out.length > 0) {
    totals.total = out.reduce((s, r) => s + r.lengthKm, 0);
    totals.year2026 = out.filter(r => r.year === 2026).reduce((s, r) => s + r.lengthKm, 0);
    totals.year2027 = out.filter(r => r.year === 2027).reduce((s, r) => s + r.lengthKm, 0);
  }

  return { rows: out, totals };
}
