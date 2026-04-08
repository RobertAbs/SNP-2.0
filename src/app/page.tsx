"use client";

import { useMemo } from "react";
import Link from "next/link";
import PageHeader from "@/components/common/PageHeader";
import { usePirPsd } from "@/hooks/usePirPsd";
import { useSmr } from "@/hooks/useSmr";
import { useGU } from "@/hooks/useGU";
import { usePirWeights } from "@/hooks/usePirWeights";
import { fmtNum, groupBy, activeStageCount, avgStagePct } from "@/lib/dataHelpers";
import { PIR_STAGE_LABELS, PirRow, PirStage, SmrRow } from "@/lib/types";

const STAGES: PirStage[] = ["ird", "izyskaniya", "proektirovanie", "soglasovaniya", "zemleustroistvo", "ekspertiza"];
const STAGE_COLORS = ["#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];

export default function HomePage() {
  const pir = usePirPsd();
  const smr = useSmr();
  const gu  = useGU();
  const weights = usePirWeights();

  const pirRows: PirRow[] = pir.data ?? [];
  const smrRows: SmrRow[] = smr.data ?? [];
  const guRows = gu.data ?? [];
  const w = weights.data ?? [];

  // ── ОБЩИЙ % ПРОЕКТА ───────────────────────────────────────────
  // Каждый СНП = (ПИР% + СМР%) / 2. Общий % = среднее по всем СНП.
  const smrBySnp = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of smrRows) m.set(r.kato || r.snp, r.smrPercent);
    return m;
  }, [smrRows]);

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
      project: Math.round(((pirAvg + smrAvg) / 2) * 10) / 10,
      pir: Math.round(pirAvg * 10) / 10,
      smr: Math.round(smrAvg * 10) / 10,
    };
  }, [pirRows, smrBySnp]);

  // ── ПО ОБЛАСТЯМ ───────────────────────────────────────────────
  const regionStats = useMemo(() => {
    const grouped = groupBy(pirRows, r => r.region || "—");
    return Object.entries(grouped)
      .map(([region, rows]) => {
        const pirAvg = rows.reduce((a, b) => a + b.totalReadiness, 0) / rows.length;
        const smrAvg = rows.reduce((a, b) => a + (smrBySnp.get(b.kato || b.snp) ?? 0), 0) / rows.length;
        const overall = (pirAvg + smrAvg) / 2;
        const active = rows.filter(r => STAGES.some(s => (r.stages[s] ?? 0) > 0)).length;
        return {
          region,
          count: rows.length,
          pir: Math.round(pirAvg * 10) / 10,
          smr: Math.round(smrAvg * 10) / 10,
          overall: Math.round(overall * 10) / 10,
          active,
        };
      })
      .sort((a, b) => b.overall - a.overall || b.count - a.count);
  }, [pirRows, smrBySnp]);

  // ── ЭТАПЫ ПИР ─────────────────────────────────────────────────
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
  const activeSmr = smrRows.length;
  const regionsCount = regionStats.length;

  const lastUpdated = pir.lastUpdated || smr.lastUpdated || gu.lastUpdated;
  const refreshing = pir.refreshing || smr.refreshing || gu.refreshing;
  const onRefresh = async () => {
    await Promise.all([pir.refresh(), smr.refresh(), gu.refresh()]);
  };

  return (
    <div>
      <PageHeader
        title=""
        subtitle="Сводка по проекту"
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Top summary strip — 3 компактных показателя */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <HeroStat n={1} label="Общий % по проекту" value={overall.project} color="#10b981"
          sub={[{ l: "ПИР", v: `${overall.pir}%` }, { l: "СМР", v: `${overall.smr}%` }, { l: "СНП", v: fmtNum(totalSnp) }]} />
        <HeroStat n={3} label="ПИР-ПСД в целом по РК" value={overall.pir} color="#06b6d4"
          sub={[{ l: "активных", v: fmtNum(pirRows.filter(r => STAGES.some(s => (r.stages[s] ?? 0) > 0)).length) }, { l: "областей", v: String(regionsCount) }, { l: "этапов", v: "6" }]} />
        <HeroStat n={6} label="СМР (ВОЛС) в целом" value={overall.smr} color="#f59e0b"
          sub={[{ l: "в СМР", v: fmtNum(activeSmr) }, { l: "завершено", v: fmtNum(smrRows.filter(r => r.smrPercent >= 100).length) }, { l: "ГУ ПП", v: fmtNum(guRows.length) }]}
          empty={activeSmr === 0} />
      </div>

      {/* ─── БЛОК 1 · Общий % по областям ─── */}
      <SectionTitle n={2} color="#10b981" title="Общий % — в разрезе областей" />
      <div className="rounded-md p-3 mb-5" style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
        <RegionBars rows={regionStats} valueKey="overall" color="#10b981"
          max={Math.max(...regionStats.map(r => r.overall), 1)} showCount />
      </div>

      {/* ─── БЛОК 2 · ПИР-ПСД — по этапам и по областям ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-5">
        <div>
          <SectionTitle n={4} color="#06b6d4" title="ПИР-ПСД — по этапам работ" />
          <div className="rounded-md p-3" style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="space-y-1.5">
              {stageStats.map(s => {
                const barW = Math.max(s.avg, 0.5);
                const bgW = s.pctActive;
                return (
                  <div key={s.stage} className="flex items-center gap-2">
                    <div className="w-52 flex-shrink-0">
                      <div className="text-[10px] font-medium truncate" style={{ color: "var(--c-text-1)" }}>
                        {s.label}
                        {s.weight && <span className="ml-1.5 text-[9px]" style={{ color: "var(--c-text-4)" }}>вес {s.weight}%</span>}
                      </div>
                    </div>
                    <div className="flex-1 relative h-4 rounded overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
                      <div className="absolute inset-y-0 left-0" style={{ width: `${bgW}%`, background: `color-mix(in srgb, ${s.color} 18%, transparent)` }} />
                      <div className="absolute inset-y-0 left-0" style={{ width: `${barW}%`, background: s.color }} />
                    </div>
                    <div className="w-10 text-right text-[10px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
                      {s.avg < 1 ? s.avg.toFixed(1) : Math.round(s.avg)}%
                    </div>
                    <div className="w-10 text-right text-[9px] font-mono tabular-nums" style={{ color: "var(--c-text-4)" }}>
                      {fmtNum(s.active)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <SectionTitle n={5} color="#06b6d4" title="ПИР-ПСД — по областям" />
          <div className="rounded-md p-3" style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <RegionBars rows={regionStats} valueKey="pir" color="#06b6d4"
              max={Math.max(...regionStats.map(r => r.pir), 1)} showCount />
          </div>
        </div>
      </div>

      {/* ─── БЛОК 3 · СМР по областям ─── */}
      <SectionTitle n={7} color="#f59e0b" title="СМР (ВОЛС) — в разрезе областей" />
      <div className="rounded-md p-3" style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
        {activeSmr === 0 ? (
          <div className="text-[10px] text-center py-3 italic" style={{ color: "var(--c-text-4)" }}>
            лист СМР пока не заполнен · данные появятся автоматически после наполнения
          </div>
        ) : (
          <RegionBars rows={regionStats} valueKey="smr" color="#f59e0b"
            max={Math.max(...regionStats.map(r => r.smr), 1)} showCount />
        )}
      </div>
    </div>
  );
}

function HeroStat({ n, label, value, color, sub, empty }: {
  n: number; label: string; value: number; color: string;
  sub: { l: string; v: string }[]; empty?: boolean;
}) {
  return (
    <div className="rounded-md p-3 relative" style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded flex items-center justify-center text-[9px] font-bold"
          style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{n}</div>
        <div className="text-[10px] uppercase tracking-wider font-semibold truncate" style={{ color: "var(--c-text-3)" }}>{label}</div>
      </div>
      <div className="flex items-baseline gap-1.5 mb-2">
        <div className="text-3xl font-bold tabular-nums leading-none" style={{ color: "var(--c-text-1)" }}>
          {value < 1 ? value.toFixed(1) : Math.round(value)}
        </div>
        <div className="text-sm font-bold" style={{ color }}>%</div>
        {empty && <div className="ml-auto text-[9px] italic" style={{ color: "var(--c-text-4)" }}>пусто</div>}
      </div>
      <div className="h-1 rounded-full overflow-hidden mb-2" style={{ background: "var(--c-bg-2)" }}>
        <div className="h-full" style={{ width: `${Math.max(value, 1)}%`, background: color }} />
      </div>
      <div className="flex justify-between gap-2 pt-1.5" style={{ borderTop: "1px solid var(--c-border)" }}>
        {sub.map((s, i) => (
          <div key={i} className="min-w-0">
            <div className="text-[8px] uppercase tracking-wider truncate" style={{ color: "var(--c-text-4)" }}>{s.l}</div>
            <div className="text-[11px] font-semibold tabular-nums" style={{ color: "var(--c-text-2)" }}>{s.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionTitle({ n, color, title }: { n: number; color: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-1">
      <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold"
        style={{ background: `color-mix(in srgb, ${color} 18%, transparent)`, color }}>{n}</div>
      <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-2)" }}>{title}</div>
      <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${color}40, transparent)` }} />
    </div>
  );
}

type RegionStat = { region: string; count: number; pir: number; smr: number; overall: number; active: number };

function RegionBars({ rows, valueKey, color, max, showCount }: {
  rows: RegionStat[]; valueKey: "overall" | "pir" | "smr"; color: string; max: number; showCount?: boolean;
}) {
  if (rows.length === 0) return <div className="text-[10px] text-center py-4" style={{ color: "var(--c-text-4)" }}>нет данных</div>;
  return (
    <div className="space-y-1">
      {rows.map((r, i) => {
        const v = r[valueKey];
        const w = (v / max) * 100;
        const displayV = v < 1 ? v.toFixed(1) : Math.round(v).toString();
        return (
          <Link key={r.region}
            href={`/pir-psd?region=${encodeURIComponent(r.region)}`}
            className="flex items-center gap-2 px-2 py-1 -mx-2 rounded hover:bg-white/[0.03] transition group">
            <div className="w-4 text-[9px] font-mono tabular-nums text-right" style={{ color: "var(--c-text-4)" }}>{i + 1}</div>
            <div className="w-36 text-[11px] truncate" style={{ color: "var(--c-text-2)" }}>
              {r.region.replace(/\s*область$/i, "")}
            </div>
            <div className="flex-1 h-4 rounded overflow-hidden relative" style={{ background: "var(--c-bg-2)" }}>
              <div className="absolute inset-y-0 left-0 transition-all group-hover:brightness-125"
                style={{ width: `${Math.max(w, 0.5)}%`, background: color }} />
            </div>
            <div className="w-12 text-right text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
              {displayV}%
            </div>
            {showCount && (
              <div className="w-10 text-right text-[9px] font-mono tabular-nums" style={{ color: "var(--c-text-4)" }}>
                {fmtNum(r.count)}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
