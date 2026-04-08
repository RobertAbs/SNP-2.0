import { parseCSV, parsePct, parseDate } from "./csv";
import type { PirRow, PirStage, PirStageDetail, PirStageItem } from "../types";

/**
 * Парсер листа "ПИР-ПСД".
 * row[0] — секции, row[1] — подзаголовки (название подпункта или
 *   "Общий статус выполнения, %"), row[2] — типы ("Информация"/"да/нет"/"%").
 * row[3..] — данные. Каждый подпункт — пара колонок (Информация + статус).
 */

const SECTION_TO_STAGE: { keywords: string[]; stage: PirStage }[] = [
  { keywords: ["исходно"],       stage: "ird" },
  { keywords: ["изыскан"],       stage: "izyskaniya" },
  { keywords: ["проектирован"],  stage: "proektirovanie" },
  { keywords: ["согласован"],    stage: "soglasovaniya" },
  { keywords: ["землеустро"],    stage: "zemleustroistvo" },
  { keywords: ["экспертиз"],     stage: "ekspertiza" },
];

interface SectionRange { stage: PirStage | "totals"; start: number; end: number; }

interface ParsedHeader {
  orderNo: number; pirYear: number; kato: number;
  region: number; district: number; ruralDistrict: number; snp: number;
  sections: SectionRange[];
  // для каждой секции подпункты: [{name, infoCol, statusCol, type}]
  stageItems: Record<PirStage, { name: string; infoCol: number; statusCol: number; type: "bool" | "pct" }[]>;
  stagePctCols: Record<PirStage, number>;
  plannedDate: number;
  totalReadiness: number;
  volsLengthCol: number;
}

function buildHeader(sec: string[], sub: string[], typ: string[]): ParsedHeader {
  const findSub = (kw: string) =>
    sub.findIndex(h => h && h.toLowerCase().includes(kw));

  const orderNo       = findSub("номер заказа");
  const pirYear       = findSub("пир год");
  const kato          = findSub("като");
  const region        = findSub("область");
  const district      = findSub("район");
  const ruralDistrict = findSub("сельский");
  const snp           = findSub("снп");

  // границы секций
  const starts: { idx: number; name: string }[] = [];
  for (let i = 0; i < sec.length; i++) {
    const v = (sec[i] ?? "").trim();
    if (v) starts.push({ idx: i, name: v.toLowerCase() });
  }
  const sections: SectionRange[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i].idx;
    const end = i + 1 < starts.length ? starts[i + 1].idx : sec.length;
    const name = starts[i].name;
    if (name.includes("итог")) {
      sections.push({ stage: "totals", start, end });
    } else {
      const match = SECTION_TO_STAGE.find(s => s.keywords.some(k => name.includes(k)));
      if (match) sections.push({ stage: match.stage, start, end });
    }
  }

  const stageItems = {} as ParsedHeader["stageItems"];
  const stagePctCols = {} as Record<PirStage, number>;
  for (const st of SECTION_TO_STAGE.map(s => s.stage)) {
    stageItems[st] = [];
    stagePctCols[st] = -1;
  }

  for (const r of sections) {
    if (r.stage === "totals") continue;
    const list = stageItems[r.stage];
    let i = r.start;
    while (i < r.end) {
      const name = (sub[i] ?? "").trim();
      const t = (typ[i] ?? "").toLowerCase();
      if (name.toLowerCase().includes("общий статус")) {
        stagePctCols[r.stage] = i;
        i++;
        continue;
      }
      if (t === "информация" && name) {
        // следующая колонка — статус
        const next = i + 1;
        const nt = (typ[next] ?? "").toLowerCase();
        const type: "bool" | "pct" = nt === "%" ? "pct" : "bool";
        list.push({ name: name.replace(/\s+/g, " ").trim(), infoCol: i, statusCol: next, type });
        i += 2;
        continue;
      }
      // экспертиза: один подпункт с типом % вместо да/нет, без отдельной "Общий статус"
      if (name && (t === "%" || t === "да/нет")) {
        list.push({ name: name.replace(/\s+/g, " ").trim(), infoCol: i - 1, statusCol: i, type: t === "%" ? "pct" : "bool" });
        i++;
        continue;
      }
      i++;
    }
    // если "Общий статус" отсутствует (экспертиза) — берём единственный % подпункт
    if (stagePctCols[r.stage] === -1 && list.length === 1 && list[0].type === "pct") {
      stagePctCols[r.stage] = list[0].statusCol;
    }
  }

  // Итоги
  const totalsRange = sections.find(s => s.stage === "totals");
  let volsLengthCol = -1, plannedDate = -1, totalReadiness = -1;
  if (totalsRange) {
    for (let i = totalsRange.start; i < totalsRange.end; i++) {
      const n = (sub[i] ?? "").toLowerCase();
      if (n.includes("протяжен")) volsLengthCol = i;
      else if (n.includes("плановая дата")) plannedDate = i;
      else if (n.includes("суммарная готов")) totalReadiness = i;
    }
  }
  if (plannedDate === -1)    plannedDate    = findSub("плановая дата завершения");
  if (totalReadiness === -1) totalReadiness = findSub("суммарная готов");

  return {
    orderNo, pirYear, kato, region, district, ruralDistrict, snp,
    sections, stageItems, stagePctCols,
    plannedDate, totalReadiness, volsLengthCol,
  };
}

export function parsePirPsdCSV(csv: string): PirRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 4) return [];
  const h = buildHeader(rows[0], rows[1], rows[2]);
  const out: PirRow[] = [];

  for (let ri = 3; ri < rows.length; ri++) {
    const cols = rows[ri];
    const snp = (h.snp >= 0 ? cols[h.snp] : "") ?? "";
    if (!snp.trim()) continue;

    const stages = { ird: 0, izyskaniya: 0, proektirovanie: 0, soglasovaniya: 0, zemleustroistvo: 0, ekspertiza: 0 } as Record<PirStage, number>;
    const details = {} as Record<PirStage, PirStageDetail>;

    for (const st of Object.keys(stages) as PirStage[]) {
      const pctCol = h.stagePctCols[st];
      stages[st] = pctCol >= 0 ? parsePct(cols[pctCol]) : 0;
      const items: PirStageItem[] = h.stageItems[st].map(it => ({
        name: it.name,
        info: (cols[it.infoCol] ?? "").trim(),
        status: (cols[it.statusCol] ?? "").trim(),
        type: it.type,
      }));
      details[st] = { items, pct: stages[st] };
    }

    const yearNum = parseInt((h.pirYear >= 0 ? cols[h.pirYear] : "") ?? "");

    out.push({
      orderNo:       h.orderNo >= 0 ? (cols[h.orderNo] ?? null) : null,
      pirYear:       isNaN(yearNum) ? null : yearNum,
      kato:          (h.kato >= 0 ? cols[h.kato] : "") ?? "",
      region:        (h.region >= 0 ? cols[h.region] : "") ?? "",
      district:      (h.district >= 0 ? cols[h.district] : "") ?? "",
      ruralDistrict: (h.ruralDistrict >= 0 ? cols[h.ruralDistrict] : "") ?? "",
      snp:           snp.trim(),
      stages,
      details,
      volsLengthM:       h.volsLengthCol >= 0 ? ((cols[h.volsLengthCol] ?? "").trim()) : "",
      plannedCompletion: h.plannedDate >= 0 ? parseDate(cols[h.plannedDate]) : null,
      totalReadiness:    h.totalReadiness >= 0 ? parsePct(cols[h.totalReadiness]) : 0,
    });
  }
  return out;
}
