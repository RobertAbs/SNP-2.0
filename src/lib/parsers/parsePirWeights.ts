import { parseCSV, parseNum } from "./csv";
import type { PirWeight, PirStage } from "../types";

/** Соответствие русских заголовков этапов из листа "Вес ПИР" → ключи PirStage */
const STAGE_KEYWORDS: { stage: PirStage; keywords: string[] }[] = [
  { stage: "ird",             keywords: ["исходно", "разрешитель"] },
  { stage: "izyskaniya",      keywords: ["изыскан"] },
  { stage: "proektirovanie",  keywords: ["проектирован"] },
  { stage: "soglasovaniya",   keywords: ["согласован"] },
  { stage: "zemleustroistvo", keywords: ["землеустро"] },
  { stage: "ekspertiza",      keywords: ["экспертиз"] },
];

/**
 * Лист «Вес ПИР»: колонки [Вид работ, Вес %, Примечание]. Шапка может быть на 2-й строке.
 * Возвращаем нормализованные веса (0..1) для каждого этапа.
 */
export function parsePirWeightsCSV(csv: string): PirWeight[] {
  const rows = parseCSV(csv);
  const out: PirWeight[] = [];

  for (const row of rows) {
    const name = (row[0] ?? "").toLowerCase();
    if (!name || name.includes("вес внутри") || name.includes("вид работ")) continue;

    const matched = STAGE_KEYWORDS.find(s => s.keywords.every(k => name.includes(k))
      || s.keywords.some(k => name.includes(k)));
    if (!matched) continue;

    const rawWeight = parseNum(row[1]);
    if (rawWeight <= 0) continue;
    const weight = rawWeight > 1 ? rawWeight / 100 : rawWeight;

    if (out.find(w => w.stage === matched.stage)) continue;
    out.push({ stage: matched.stage, weight, description: row[2] ?? "" });
  }

  // Default weights if лист пустой/не распарсился
  if (out.length === 0) {
    return [
      { stage: "ird",             weight: 0.075, description: "" },
      { stage: "izyskaniya",      weight: 0.15,  description: "" },
      { stage: "proektirovanie",  weight: 0.375, description: "" },
      { stage: "soglasovaniya",   weight: 0.20,  description: "" },
      { stage: "zemleustroistvo", weight: 0.10,  description: "" },
      { stage: "ekspertiza",      weight: 0.10,  description: "" },
    ];
  }
  return out;
}
