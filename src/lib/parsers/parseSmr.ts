import { parseCSV, parsePct, parseDate } from "./csv";
import type { SmrRow } from "../types";

/**
 * Лист "СМР (Строительно-монтажные работы ВОЛС)".
 * Толерантен к пустому листу. Захватывает полный набор колонок из живой таблицы.
 */
export function parseSmrCSV(csv: string): SmrRow[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const header = rows[0].map(h => (h ?? "").toLowerCase().replace(/\s+/g, " ").trim());
  const find = (...kw: string[]) =>
    header.findIndex(h => kw.every(k => h.includes(k)));

  const cOrder    = find("номер заказа");
  const cKato     = find("като");
  const cRegion   = find("область");
  const cDistrict = find("район");
  const cRural    = find("сельский");
  const cSnp      = find("снп");

  const cGpr      = find("гпр");
  const cNotif    = find("уведомление", "начале");
  const cMobil    = find("мобилизац");
  const cStart    = find("дата начала смр");
  const cEnd      = find("дата завершения смр");
  const cSmrPct   = find("%", "выполнения смр");
  const cTech     = find("замечаний", "технадзор");
  const cAuthor   = find("авторский надзор");
  const cIrd      = find("исполнительная документация");

  const cPlanDate = find("плановая дата завершения");
  const cFactPct  = find("фактическая готовность");

  const cGask     = find("гаск");
  const cDecl     = find("декларация");
  const cComAct   = find("акт ввода");

  const cInvoice  = find("счет-фактура", "выполненные работы");
  const cKs3      = find("кс-3");
  const c2V       = find("2в");
  const cVolume   = find("объемная");
  const cMatInv   = find("счет-фактура", "материалы");
  const cCtKz     = find("ct-kz");
  const cChange   = find("протокол", "изменениях");
  const cZup      = find("зуп");
  const cPsd      = find("корретировка псд");
  const cTechAct  = find("технический акт");
  const cCommConcl= find("заключения комиссии");

  const g = (cols: string[], idx: number) => (idx >= 0 ? (cols[idx] ?? "").trim() : "");

  const out: SmrRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];
    const snp = g(cols, cSnp);
    if (!snp) continue;

    out.push({
      orderNo:       g(cols, cOrder) || null,
      kato:          g(cols, cKato),
      region:        g(cols, cRegion),
      district:      g(cols, cDistrict),
      ruralDistrict: g(cols, cRural),
      snp,

      gprAvailable:    g(cols, cGpr),
      smrNotification: g(cols, cNotif),
      mobilizationDate: parseDate(g(cols, cMobil)),

      startDate: parseDate(g(cols, cStart)),
      endDate:   parseDate(g(cols, cEnd)),
      smrPercent:  cSmrPct >= 0 ? parsePct(cols[cSmrPct]) : 0,
      technadzorFix:    g(cols, cTech),
      authorSupervision: g(cols, cAuthor),
      execDocsPercent:  cIrd >= 0 ? parsePct(cols[cIrd]) : 0,

      plannedCompletion: parseDate(g(cols, cPlanDate)),
      factPercent: cFactPct >= 0 ? parsePct(cols[cFactPct]) : 0,

      gaskConfirmation: g(cols, cGask),
      declaration:      g(cols, cDecl),
      commissioningAct: g(cols, cComAct),

      invoice:         g(cols, cInvoice),
      ks3:             g(cols, cKs3),
      acts2V:          g(cols, c2V),
      volumeReport:    g(cols, cVolume),
      materialsInvoice: g(cols, cMatInv),
      ctKzCerts:       g(cols, cCtKz),
      changeProtocol:  g(cols, cChange),
      zupCorrection:   g(cols, cZup),
      psdCorrection:   g(cols, cPsd),
      technicalAct:    g(cols, cTechAct),
      commissionConclusion: g(cols, cCommConcl),
    });
  }
  return out;
}
