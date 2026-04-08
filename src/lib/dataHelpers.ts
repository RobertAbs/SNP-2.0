import type { PirRow, PirWeight, PirStage, GUCheckpoint } from "./types";

/** Считает суммарную готовность одного СНП по формуле Σ (этап% × вес). 0..100 */
export function computeTotalReadiness(row: PirRow, weights: PirWeight[]): number {
  let sum = 0;
  let totalWeight = 0;
  for (const w of weights) {
    const stagePct = row.stages[w.stage] ?? 0;
    sum += stagePct * w.weight;
    totalWeight += w.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round(sum / totalWeight);
}

/** Средняя готовность по списку строк */
export function avgReadiness(rows: PirRow[]): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + r.totalReadiness, 0);
  return Math.round(sum / rows.length);
}

/** Группировка PirRow по полю */
export function groupBy<T, K extends string>(arr: T[], keyFn: (x: T) => K): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of arr) {
    const k = keyFn(item);
    if (!out[k]) out[k] = [];
    out[k].push(item);
  }
  return out;
}

/** Уникальные значения */
export function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

/** Средняя готовность по этапу (1 знак после запятой) */
export function avgStagePct(rows: PirRow[], stage: PirStage): number {
  if (rows.length === 0) return 0;
  const sum = rows.reduce((s, r) => s + (r.stages[stage] ?? 0), 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

/** Количество СНП с ненулевым прогрессом по этапу */
export function activeStageCount(rows: PirRow[], stage: PirStage): number {
  return rows.reduce((n, r) => n + ((r.stages[stage] ?? 0) > 0 ? 1 : 0), 0);
}

/** ГУ KPI */
export interface GuKpi {
  total: number;
  completed: number;
  inProgress: number;
  inProgressDeadline: number;
  volsCompleted: number;
  connected: number;
  psdReady: number;
  fromSOI: number;
  kvepThisQuarter: number;
}

export function computeGuKpi(rows: GUCheckpoint[]): GuKpi {
  const now = new Date();
  const qStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const qEnd = new Date(qStart.getFullYear(), qStart.getMonth() + 3, 0);

  let completed = 0, inProgress = 0, inProgressDeadline = 0;
  let volsCompleted = 0, connected = 0, psdReady = 0, fromSOI = 0, kvepThisQuarter = 0;
  for (const r of rows) {
    if (r.sectionStatus === "completed") completed++;
    // в новой схеме только 2 статуса; deadline больше не отдельный
    else inProgress++;
    if (r.volsStatus.toLowerCase().includes("заверш")) volsCompleted++;
    if (r.connectionStatus.toLowerCase().includes("подключ")) connected++;
    const pl = r.psdReady.toLowerCase();
    if (pl.includes("готов") && !pl.includes("не готов")) psdReady++;
    if (r.fromOriginalSOI) fromSOI++;
    if (r.kvepDate) {
      const d = new Date(r.kvepDate);
      if (d >= qStart && d <= qEnd) kvepThisQuarter++;
    }
  }
  return { total: rows.length, completed, inProgress, inProgressDeadline, volsCompleted, connected, psdReady, fromSOI, kvepThisQuarter };
}

/** Форматирование числа с разделителями */
export function fmtNum(n: number, digits = 0): string {
  return n.toLocaleString("ru-RU", { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

/** ISO YYYY-MM-DD → "DD.MM.YYYY" */
export function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  return `${m[3]}.${m[2]}.${m[1]}`;
}
