"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import { usePirPsd } from "@/hooks/usePirPsd";
import { useSmr } from "@/hooks/useSmr";
import { useGU } from "@/hooks/useGU";
import { usePirWeights } from "@/hooks/usePirWeights";
import { fmtNum, groupBy, activeStageCount, avgStagePct } from "@/lib/dataHelpers";
import { PIR_STAGE_LABELS, PirRow, PirStage, SmrRow } from "@/lib/types";

const STAGES: PirStage[] = ["ird", "izyskaniya", "proektirovanie", "soglasovaniya", "zemleustroistvo", "ekspertiza"];
const STAGE_COLORS = ["#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];

type RegionStat = {
  region: string; count: number;
  pir: number; smr: number; overall: number;
  active: number;
};

export default function HomePage() {
  const pir = usePirPsd();
  const smr = useSmr();
  const gu  = useGU();
  const weights = usePirWeights();

  const pirRows: PirRow[] = pir.data ?? [];
  const smrRows: SmrRow[] = smr.data ?? [];
  const guRows = gu.data ?? [];
  const w = weights.data ?? [];

  const [open, setOpen] = useState<number | null>(1);
  const toggle = (n: number) => setOpen(o => (o === n ? null : n));

  // Мапа СМР по ключу КАТО||СНП для джойна с ПИР
  const smrBySnp = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of smrRows) m.set(r.kato || r.snp, r.smrPercent);
    return m;
  }, [smrRows]);

  // ОБЩИЙ % ПРОЕКТА: среднее (ПИР% + СМР%)/2 по всем СНП из листа ПИР-ПСД
  const overall = useMemo(() => {
    if (pirRows.length === 0) return { project: 0, pir: 0, smr: 0 };
    let sumPir = 0, sumSmr = 0;
    for (const r of pirRows) {
      sumPir += r.totalReadiness;
      sumSmr += smrBySnp.get(r.kato || r.snp) ?? 0;
    }
    const pirAvg = sumPir / pirRows.length;
    const smrAvg = sumSmr / pirRows.length;
    return {
      project: round1((pirAvg + smrAvg) / 2),
      pir: round1(pirAvg),
      smr: round1(smrAvg),
    };
  }, [pirRows, smrBySnp]);

  // По областям — средние арифметические на уровне области
  const regionStats: RegionStat[] = useMemo(() => {
    const grouped = groupBy(pirRows, r => r.region || "—");
    return Object.entries(grouped)
      .map(([region, rows]) => {
        const pirAvg = rows.reduce((a, b) => a + b.totalReadiness, 0) / rows.length;
        const smrAvg = rows.reduce((a, b) => a + (smrBySnp.get(b.kato || b.snp) ?? 0), 0) / rows.length;
        const active = rows.filter(r => STAGES.some(s => (r.stages[s] ?? 0) > 0)).length;
        return {
          region,
          count: rows.length,
          pir: round1(pirAvg),
          smr: round1(smrAvg),
          overall: round1((pirAvg + smrAvg) / 2),
          active,
        };
      })
      .sort((a, b) => b.overall - a.overall || b.count - a.count);
  }, [pirRows, smrBySnp]);

  // Этапы ПИР — средний % по всем строкам (включая 0)
  const stageStats = useMemo(() => {
    return STAGES.map((s, i) => {
      const active = activeStageCount(pirRows, s);
      const weight = w.find(x => x.stage === s);
      return {
        stage: s,
        label: PIR_STAGE_LABELS[s],
        avg: avgStagePct(pirRows, s),
        active,
        pctActive: pirRows.length ? (active / pirRows.length) * 100 : 0,
        weight: weight ? Math.round(weight.weight * 100) : null,
        color: STAGE_COLORS[i],
      };
    });
  }, [pirRows, w]);

  const totalSnp = pirRows.length;
  const totalSmr = smrRows.length;
  const activePir = pirRows.filter(r => STAGES.some(s => (r.stages[s] ?? 0) > 0)).length;

  // Топ-область по регион-суммам (для q2/q5/q7)
  const regionsSortedByPir = useMemo(
    () => [...regionStats].sort((a, b) => b.pir - a.pir || b.count - a.count),
    [regionStats]
  );
  const regionsSortedBySmr = useMemo(
    () => [...regionStats].sort((a, b) => b.smr - a.smr || b.count - a.count),
    [regionStats]
  );

  const lastUpdated = pir.lastUpdated || smr.lastUpdated || gu.lastUpdated;
  const refreshing = pir.refreshing || smr.refreshing || gu.refreshing;
  const onRefresh = async () => {
    await Promise.all([pir.refresh(), smr.refresh(), gu.refresh()]);
  };

  // Лидеры для плиток-разрезов
  const topOverall = regionStats[0];
  const topPir = regionsSortedByPir[0];
  const topSmr = regionsSortedBySmr[0];
  const topStage = [...stageStats].sort((a, b) => b.avg - a.avg)[0];
  const shortName = (r?: string) => r?.replace(/\s*область$/i, "") ?? "—";

  const tiles: TileDef[] = [
    { n: 1, group: "Общий",   label: "Общий % по проекту",
      value: overall.project, color: "#10b981",
      hint: `ПИР ${overall.pir}% · СМР ${overall.smr}%` },
    { n: 2, group: "Общий",   label: `Топ-область: ${shortName(topOverall?.region)}`,
      value: topOverall?.overall ?? 0, color: "#10b981",
      hint: `${regionStats.length} областей · ${fmtNum(topOverall?.count ?? 0)} СНП` },
    { n: 3, group: "ПИР-ПСД", label: "ПИР-ПСД в целом по РК",
      value: overall.pir, color: "#06b6d4",
      hint: `${fmtNum(activePir)} активных из ${fmtNum(totalSnp)}` },
    { n: 4, group: "ПИР-ПСД", label: `Лидер этапов: ${topStage?.label ?? "—"}`,
      value: topStage?.avg ?? 0, color: "#06b6d4",
      hint: `из 6 этапов · вес ${topStage?.weight ?? 0}%` },
    { n: 5, group: "ПИР-ПСД", label: `Топ ПИР: ${shortName(topPir?.region)}`,
      value: topPir?.pir ?? 0, color: "#06b6d4",
      hint: `${fmtNum(topPir?.count ?? 0)} СНП в области` },
    { n: 6, group: "СМР",     label: "СМР (ВОЛС) в целом",
      value: overall.smr, color: "#f59e0b",
      hint: totalSmr === 0 ? "лист пока пуст" : `${fmtNum(totalSmr)} СНП в СМР` },
    { n: 7, group: "СМР",     label: totalSmr === 0 ? "СМР — по областям" : `Топ СМР: ${shortName(topSmr?.region)}`,
      value: topSmr?.smr ?? 0, color: "#f59e0b",
      hint: totalSmr === 0 ? "нет данных" : `${fmtNum(topSmr?.count ?? 0)} СНП в области` },
  ];

  return (
    <div>
      <PageHeader
        title=""
        subtitle={`Сводка по проекту · ${fmtNum(totalSnp)} СНП · ${fmtNum(guRows.length)} ГУ ПП`}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* 7 компактных виджетов */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 mb-3">
        {tiles.map(t => (
          <Tile key={t.n} def={t} active={open === t.n} onClick={() => toggle(t.n)} />
        ))}
      </div>

      {/* Раскрываемый блок с деталями */}
      {open !== null && (
        <div className="rounded-md p-4 mb-4"
          style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
          {open === 1 && <Detail1 overall={overall} totalSnp={totalSnp} totalGu={guRows.length} totalSmr={totalSmr} />}
          {open === 2 && <DetailRegions rows={regionStats} valueKey="overall" color="#10b981" title="Общий % по областям" />}
          {open === 3 && <Detail3 overall={overall} totalSnp={totalSnp} activePir={activePir} />}
          {open === 4 && <DetailStages stageStats={stageStats} />}
          {open === 5 && <DetailRegions rows={regionsSortedByPir} valueKey="pir" color="#06b6d4" title="ПИР-ПСД по областям" />}
          {open === 6 && <Detail6 overall={overall} totalSmr={totalSmr} smrRows={smrRows} />}
          {open === 7 && <DetailRegions rows={regionsSortedBySmr} valueKey="smr" color="#f59e0b" title="СМР по областям" empty={totalSmr === 0} />}
        </div>
      )}
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────── */
function round1(v: number) { return Math.round(v * 10) / 10; }
function fmtPct(v: number) { return v < 1 && v > 0 ? v.toFixed(1) : Math.round(v).toString(); }

type TileDef = { n: number; group: string; label: string; value: number; color: string; hint: string };

/* ─── Tile (компактный виджет) ────────────────────────────── */
function Tile({ def, active, onClick }: { def: TileDef; active: boolean; onClick: () => void }) {
  const { n, group, label, value, color, hint } = def;
  return (
    <button onClick={onClick}
      className="text-left rounded-md p-2.5 transition-all hover:brightness-110"
      style={{
        background: "var(--c-bg-1)",
        border: `1px solid ${active ? color : "var(--c-border)"}`,
        boxShadow: active ? `0 0 0 1px ${color} inset` : "none",
      }}>
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold flex-shrink-0"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{n}</div>
        <div className="text-[8px] uppercase tracking-wider font-semibold truncate" style={{ color: "var(--c-text-4)" }}>{group}</div>
        {active ? <ChevronDown size={10} className="ml-auto" style={{ color }} /> : <ChevronRight size={10} className="ml-auto" style={{ color: "var(--c-text-4)" }} />}
      </div>
      <div className="text-[10px] font-medium mb-1.5 leading-tight" style={{ color: "var(--c-text-2)" }}>{label}</div>
      <div className="flex items-baseline gap-1 mb-1">
        <div className="text-xl font-bold tabular-nums leading-none" style={{ color: "var(--c-text-1)" }}>{fmtPct(value)}</div>
        <div className="text-[11px] font-bold" style={{ color }}>%</div>
      </div>
      <AbsBar value={value} color={color} />
      <div className="text-[9px] mt-1 truncate" style={{ color: "var(--c-text-4)" }}>{hint}</div>
    </button>
  );
}

/* ─── Progress bar: ширина = value/100 (абсолютный %) ────── */
function AbsBar({ value, color, h = 3 }: { value: number; color: string; h?: number }) {
  const w = Math.min(Math.max(value, 0), 100);
  return (
    <div className="relative w-full rounded-full overflow-hidden"
      style={{ height: h, background: "var(--c-bg-2)" }}>
      <div className="absolute inset-y-0 left-0 transition-all"
        style={{ width: `${w}%`, background: color }} />
    </div>
  );
}

/* ─── Details ────────────────────────────────────────────── */
function Detail1({ overall, totalSnp, totalGu, totalSmr }: {
  overall: { project: number; pir: number; smr: number };
  totalSnp: number; totalGu: number; totalSmr: number;
}) {
  return (
    <div>
      <DetailTitle>1 · Общий % выполнения проекта</DetailTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Row label="ПИР-ПСД (проектирование)" value={overall.pir} color="#06b6d4" />
        <Row label="СМР (строительство ВОЛС)" value={overall.smr} color="#f59e0b" />
        <Row label="Итого по проекту" value={overall.project} color="#10b981" bold />
      </div>
      <div className="mt-3 pt-3 text-[10px] flex gap-4 flex-wrap" style={{ borderTop: "1px solid var(--c-border)", color: "var(--c-text-3)" }}>
        <span>СНП всего: <b style={{ color: "var(--c-text-1)" }}>{fmtNum(totalSnp)}</b></span>
        <span>СНП в СМР: <b style={{ color: "var(--c-text-1)" }}>{fmtNum(totalSmr)}</b></span>
        <span>ГУ ПП: <b style={{ color: "var(--c-text-1)" }}>{fmtNum(totalGu)}</b></span>
        <span className="italic">Формула: (ПИР% + СМР%) / 2 по каждому СНП, затем среднее</span>
      </div>
    </div>
  );
}

function Detail3({ overall, totalSnp, activePir }: {
  overall: { pir: number }; totalSnp: number; activePir: number;
}) {
  const pctActive = totalSnp ? Math.round((activePir / totalSnp) * 100) : 0;
  return (
    <div>
      <DetailTitle>3 · ПИР-ПСД в целом по РК</DetailTitle>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Row label="Средняя суммарная готовность" value={overall.pir} color="#06b6d4" bold />
        <Kv label="СНП всего в плане ПИР" value={fmtNum(totalSnp)} />
        <Kv label="Из них с начатыми работами" value={`${fmtNum(activePir)} (${pctActive}%)`} />
      </div>
    </div>
  );
}

function Detail6({ overall, totalSmr, smrRows }: {
  overall: { smr: number }; totalSmr: number; smrRows: SmrRow[];
}) {
  const completed = smrRows.filter(r => r.smrPercent >= 100).length;
  const avgFact = totalSmr ? round1(smrRows.reduce((a, b) => a + b.factPercent, 0) / totalSmr) : 0;
  return (
    <div>
      <DetailTitle>6 · СМР (ВОЛС) в целом</DetailTitle>
      {totalSmr === 0 ? (
        <div className="text-[11px] italic" style={{ color: "var(--c-text-4)" }}>
          Лист СМР пока не заполнен. Данные появятся автоматически после наполнения таблицы.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Row label="Средний % СМР" value={overall.smr} color="#f59e0b" bold />
          <Row label="Фактическая готовность" value={avgFact} color="#10b981" />
          <Kv label="Завершено полностью" value={`${fmtNum(completed)} из ${fmtNum(totalSmr)}`} />
        </div>
      )}
    </div>
  );
}

function DetailStages({ stageStats }: { stageStats: Array<{ stage: PirStage; label: string; avg: number; active: number; pctActive: number; weight: number | null; color: string }> }) {
  return (
    <div>
      <DetailTitle>4 · ПИР-ПСД — разбивка по 6 этапам</DetailTitle>
      <div className="space-y-2">
        {stageStats.map(s => (
          <div key={s.stage} className="flex items-center gap-3">
            <div className="w-56 flex-shrink-0">
              <div className="text-[11px] font-medium" style={{ color: "var(--c-text-1)" }}>{s.label}</div>
              {s.weight && <div className="text-[9px]" style={{ color: "var(--c-text-4)" }}>вес {s.weight}%</div>}
            </div>
            <div className="flex-1">
              <AbsBar value={s.avg} color={s.color} h={6} />
            </div>
            <div className="w-12 text-right text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
              {fmtPct(s.avg)}%
            </div>
            <div className="w-20 text-right text-[9px]" style={{ color: "var(--c-text-4)" }}>
              {fmtNum(s.active)} активных
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 text-[10px] italic" style={{ borderTop: "1px solid var(--c-border)", color: "var(--c-text-4)" }}>
        Столбец «активных» — сколько СНП имеют ненулевой % по данному этапу
      </div>
    </div>
  );
}

function DetailRegions({ rows, valueKey, color, title, empty }: {
  rows: RegionStat[]; valueKey: "overall" | "pir" | "smr"; color: string; title: string; empty?: boolean;
}) {
  return (
    <div>
      <DetailTitle>{title}</DetailTitle>
      {empty || rows.length === 0 ? (
        <div className="text-[11px] italic" style={{ color: "var(--c-text-4)" }}>нет данных</div>
      ) : (
        <div className="space-y-1">
          {rows.map((r, i) => {
            const v = r[valueKey];
            return (
              <Link key={r.region} href={`/pir-psd?region=${encodeURIComponent(r.region)}`}
                className="flex items-center gap-2 px-2 py-1 -mx-2 rounded hover:bg-white/[0.03] transition group">
                <div className="w-5 text-[9px] font-mono tabular-nums text-right" style={{ color: "var(--c-text-4)" }}>{i + 1}</div>
                <div className="w-40 text-[11px] truncate" style={{ color: "var(--c-text-2)" }}>
                  {r.region.replace(/\s*область$/i, "")}
                </div>
                <div className="flex-1">
                  <AbsBar value={v} color={color} h={5} />
                </div>
                <div className="w-12 text-right text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
                  {fmtPct(v)}%
                </div>
                <div className="w-14 text-right text-[9px]" style={{ color: "var(--c-text-4)" }}>
                  {fmtNum(r.count)} СНП
                </div>
              </Link>
            );
          })}
        </div>
      )}
      <div className="mt-3 pt-3 text-[10px] italic" style={{ borderTop: "1px solid var(--c-border)", color: "var(--c-text-4)" }}>
        Клик по строке → открыть область в разделе ПИР-ПСД. Шкала прогресса — абсолютная (0–100%), не нормирована.
      </div>
    </div>
  );
}

function DetailTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--c-text-3)" }}>
      {children}
    </div>
  );
}

function Row({ label, value, color, bold }: { label: string; value: number; color: string; bold?: boolean }) {
  return (
    <div className="rounded p-2" style={{ background: "var(--c-bg-2)" }}>
      <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--c-text-4)" }}>{label}</div>
      <div className="flex items-baseline gap-1 mb-1">
        <div className={`tabular-nums leading-none ${bold ? "text-2xl font-bold" : "text-xl font-semibold"}`} style={{ color: "var(--c-text-1)" }}>
          {fmtPct(value)}
        </div>
        <div className="text-xs font-bold" style={{ color }}>%</div>
      </div>
      <AbsBar value={value} color={color} h={4} />
    </div>
  );
}

function Kv({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded p-2" style={{ background: "var(--c-bg-2)" }}>
      <div className="text-[9px] uppercase tracking-wider mb-1" style={{ color: "var(--c-text-4)" }}>{label}</div>
      <div className="text-lg font-semibold tabular-nums" style={{ color: "var(--c-text-1)" }}>{value}</div>
    </div>
  );
}
