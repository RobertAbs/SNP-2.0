import { parseCSV } from "./csv";
import type { SvodRow, SvodTech, SvodStatus, SvodObjectKey } from "../types";
import { SVOD_OBJECT_KEYS } from "../types";

/**
 * Парсер листа "Общий свод".
 * Колонки (0-based):
 *   0  №
 *   1  КАТО
 *   2  Новая протяженность КТ
 *   3  Технология
 *   4  Область
 *   5  Район
 *   6  Сельский округ
 *   7  Нас пункт
 *   8  Координаты СНП
 *   9  Население
 *   10 ГОД
 *   11 Домохозяйства
 *   12 Акимат
 *   13 Школа
 *   14 Больница (ФАП, СВА, ВА)
 *   15 Полиция (ОП)
 *   16 Аварийная служба (МЧС)
 *   17 Отдел обороны (Военкомат)
 *   18 Погран служба
 *   19 Отдел ветеринарии
 *   20 Библиотека
 *   21 Сельский клуб/ДК
 *   22 Общественная точка доступа
 *   23 Цон
 *   24 Количество подключенных объектов факт
 *   25 Статус в разрезе населенного пункта
 *   26 Доп. статус
 *   27 Что подключено
 *   28 Кол-во точек
 *   29 ВСЕГО ГУ/БО
 *   30 Начало СМР
 *   31 Завершение СМР
 *   32 Ориентировочная протяженность ВОЛС (км)
 *   33 Откопка/Закопка траншей(км)
 *   34 Прокладка микротрубки(км)
 */

/** Соответствие поле ↔ индекс CSV-колонки для объектов */
const OBJECT_COL: Record<SvodObjectKey, number> = {
  akimat: 12,
  school: 13,
  hospital: 14,
  police: 15,
  mchs: 16,
  military: 17,
  border: 18,
  vet: 19,
  library: 20,
  club: 21,
  publicPoint: 22,
  cson: 23,
};

function mapTech(raw: string): SvodTech {
  const s = raw.toLowerCase().trim();
  if (s.includes("wi-fi") || s.includes("wifi")) return "vols_wifi_public";
  if (s.includes("спутник")) return "sputnik";
  return "vols";
}

function mapStatus(raw: string): SvodStatus {
  return raw.toLowerCase().trim().includes("подключ") ? "connected" : "in_progress";
}

function num(s: string | undefined): number {
  if (!s) return 0;
  const cleaned = s.replace(/\s/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

function int(s: string | undefined): number {
  if (!s) return 0;
  const n = parseInt(s.replace(/\s/g, ""));
  return isNaN(n) ? 0 : n;
}

export function parseSvodCSV(csv: string): SvodRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const out: SvodRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const c = rows[i];
    const id = parseInt((c[0] ?? "").trim());
    if (!id || isNaN(id)) continue;

    const techRaw = (c[3] ?? "").trim();
    const snp = (c[7] ?? "").trim();
    if (!snp) continue;

    const year = parseInt((c[10] ?? "").trim());

    const objects = {} as Record<SvodObjectKey, number>;
    for (const key of SVOD_OBJECT_KEYS) {
      objects[key] = int(c[OBJECT_COL[key]]);
    }

    out.push({
      id,
      kato: (c[1] ?? "").trim(),
      newKtLength: num(c[2]),
      tech: mapTech(techRaw),
      techRaw,
      region: (c[4] ?? "").trim(),
      district: (c[5] ?? "").trim(),
      ruralDistrict: (c[6] ?? "").trim(),
      snp,
      coords: (c[8] ?? "").trim(),
      population: int(c[9]),
      year: isNaN(year) ? null : year,
      households: int(c[11]),
      objects,
      objectsConnectedFact: int(c[24]),
      status: mapStatus((c[25] ?? "").trim()),
      statusRaw: (c[25] ?? "").trim(),
      extraStatus: (c[26] ?? "").trim(),
      whatConnected: (c[27] ?? "").trim(),
      pointsCount: int(c[28]),
      totalGuBo: int(c[29]),
      smrStart: (c[30] ?? "").trim(),
      smrEnd: (c[31] ?? "").trim(),
      volsLengthKm: num(c[32]),
      trenchKm: num(c[33]),
      microTubeKm: num(c[34]),
    });
  }
  return out;
}
