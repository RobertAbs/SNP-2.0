"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Home, MapPin, Building2, Radio, FileText, HardHat, ShieldCheck, CheckCircle2, Zap, Satellite } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import { usePirPsd } from "@/hooks/usePirPsd";
import { useSmr } from "@/hooks/useSmr";
import { useGU } from "@/hooks/useGU";
import { useVols } from "@/hooks/useVols";
import { useSvod } from "@/hooks/useSvod";
import { fmtNum, uniq, computeGuKpi } from "@/lib/dataHelpers";
import { PirRow, SmrRow, SvodRow } from "@/lib/types";

const PIE_COLORS = [
  "#10b981", "#06b6d4", "#f59e0b", "#8b5cf6", "#ec4899", "#6366f1",
  "#14b8a6", "#f97316", "#84cc16", "#a855f7", "#0ea5e9", "#ef4444",
  "#eab308", "#22c55e", "#3b82f6", "#d946ef", "#f43f5e",
];

function shortRegion(s: string): string {
  return s
    .replace(/Северо-Казахстанская область/i, "СКО")
    .replace(/Западно-Казахстанская область/i, "ЗКО")
    .replace(/Восточно-Казахстанская область/i, "ВКО")
    .replace(/ская область/i, "ская")
    .replace(/^Область\s+/i, "");
}

export default function HomePage() {
  const router = useRouter();
  const gotoRegion = (fullName: string) => {
    router.push(`/pir-psd?region=${encodeURIComponent(fullName)}`);
  };
  const pir = usePirPsd();
  const smr = useSmr();
  const gu  = useGU();
  const vols = useVols();
  const svod = useSvod();

  const pirRows: PirRow[] = pir.data ?? [];
  const smrRows: SmrRow[] = smr.data ?? [];
  const guRows = gu.data ?? [];
  const volsData = vols.data ?? { rows: [], totals: { total: 0, year2026: 0, year2027: 0 } };
  const svodRows: SvodRow[] = svod.data ?? [];

  // ─── Агрегаты по общему своду ─────────────────────────
  const svodStats = useMemo(() => {
    const s = {
      total: svodRows.length,
      vols: 0,
      volsWifi: 0,
      sputnik: 0,
      connectedSnp: 0,
      connectedObjects: 0,
      byYear: { 2025: 0, 2026: 0, 2027: 0 } as Record<number, number>,
      connectedByYear: { 2025: 0, 2026: 0, 2027: 0 } as Record<number, number>,
    };
    for (const r of svodRows) {
      if (r.tech === "vols") s.vols++;
      else if (r.tech === "vols_wifi_public") s.volsWifi++;
      else if (r.tech === "sputnik") s.sputnik++;
      if (r.status === "connected") s.connectedSnp++;
      s.connectedObjects += r.objectsConnectedFact;
      if (r.year && s.byYear[r.year] !== undefined) s.byYear[r.year]++;
      if (r.year && r.status === "connected" && s.connectedByYear[r.year] !== undefined) {
        s.connectedByYear[r.year]++;
      }
    }
    return s;
  }, [svodRows]);

  // Количество СНП = ВОЛС + Спутник (все технологии — "ВОЛС (Wi-Fi public)" тоже считается ВОЛС)
  const totalSnp = svodStats.total > 0 ? svodStats.total : pirRows.length;
  const regionsCount = useMemo(
    () => uniq((svodRows.length ? svodRows : pirRows).map(r => r.region)).filter(Boolean).length,
    [svodRows, pirRows]
  );
  const districtsCount = useMemo(
    () => uniq((svodRows.length ? svodRows : pirRows).map(r => r.district)).filter(Boolean).length,
    [svodRows, pirRows]
  );

  const totalVolsKm = volsData.totals.total;

  // ─── Процентные показатели ────────────────────────────
  const pirDonePct = useMemo(() => {
    if (pirRows.length === 0) return 0;
    const s = pirRows.reduce((a, b) => a + b.totalReadiness, 0);
    return Math.round((s / pirRows.length) * 10) / 10;
  }, [pirRows]);

  const smrDonePct = useMemo(() => {
    if (smrRows.length === 0) return 0;
    const s = smrRows.reduce((a, b) => a + b.smrPercent, 0);
    return Math.round((s / smrRows.length) * 10) / 10;
  }, [smrRows]);

  const guKpi = useMemo(() => computeGuKpi(guRows), [guRows]);
  const guDonePct = guKpi.total
    ? Math.round((guKpi.completed / guKpi.total) * 100 * 10) / 10
    : 0;

  // ─── Данные для круговых диаграмм ──────────────────────
  const volsByRegion = useMemo(() => {
    return volsData.rows
      .filter(r => r.level === 1)
      .map(r => ({ name: shortRegion(r.projectName), fullName: r.projectName, value: Math.round(r.lengthKm) }))
      .sort((a, b) => b.value - a.value);
  }, [volsData.rows]);

  const [drillRegion, setDrillRegion] = useState<string | null>(null);

  const readinessByDistrict = useMemo(() => {
    if (!drillRegion) return [];
    const m = new Map<string, { sum: number; n: number }>();
    for (const r of pirRows) {
      if (r.region !== drillRegion || !r.district) continue;
      const cur = m.get(r.district) ?? { sum: 0, n: 0 };
      cur.sum += r.totalReadiness;
      cur.n += 1;
      m.set(r.district, cur);
    }
    return Array.from(m.entries())
      .map(([name, { sum, n }]) => ({
        name,
        fullName: name,
        value: n ? Math.round((sum / n) * 100) / 100 : 0,
        count: n,
      }))
      .sort((a, b) => b.value - a.value);
  }, [pirRows, drillRegion]);

  const readinessByRegion = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const r of pirRows) {
      if (!r.region) continue;
      const cur = m.get(r.region) ?? { sum: 0, n: 0 };
      cur.sum += r.totalReadiness;
      cur.n += 1;
      m.set(r.region, cur);
    }
    return Array.from(m.entries())
      .map(([name, { sum, n }]) => ({
        name: shortRegion(name),
        fullName: name,
        value: n ? Math.round((sum / n) * 100) / 100 : 0,
      }))
      .sort((a, b) => b.value - a.value);
  }, [pirRows]);

  const snpByRegion = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of pirRows) {
      if (!r.region) continue;
      m.set(r.region, (m.get(r.region) ?? 0) + 1);
    }
    return Array.from(m.entries())
      .map(([name, value]) => ({ name: shortRegion(name), fullName: name, value }))
      .sort((a, b) => b.value - a.value);
  }, [pirRows]);

  // ─── Refresh ───────────────────────────────────────────
  const lastUpdated = svod.lastUpdated || pir.lastUpdated || smr.lastUpdated || gu.lastUpdated || vols.lastUpdated;
  const refreshing = svod.refreshing || pir.refreshing || smr.refreshing || gu.refreshing || vols.refreshing;
  const onRefresh = async () => {
    await Promise.all([pir.refresh(), smr.refresh(), gu.refresh(), vols.refresh(), svod.refresh()]);
  };

  return (
    <div>
      <PageHeader
        title="Мониторинг проекта СНП 2.0"
        subtitle="Сводная панель показателей"
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Первый ряд — объёмные показатели (свод ВОЛС + Спутник) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard
          label="Количество СНП"
          value={fmtNum(totalSnp)}
          hint={
            svodStats.total > 0
              ? `ВОЛС ${fmtNum(svodStats.vols)} · Wi-Fi public ${fmtNum(svodStats.volsWifi)} · Спутник ${fmtNum(svodStats.sputnik)}`
              : "всего населённых пунктов"
          }
          icon={Home}
          color="#10b981"
          href="/pir-psd"
        />
        <KpiCard
          label="Общая протяжённость ВОЛС"
          value={`${fmtNum(Math.round(totalVolsKm))} км`}
          hint={`2026: ${fmtNum(Math.round(volsData.totals.year2026))} · 2027: ${fmtNum(Math.round(volsData.totals.year2027))} км`}
          icon={Radio}
          color="#06b6d4"
          href="/smr"
        />
        <KpiCard
          label="Количество областей"
          value={fmtNum(regionsCount)}
          hint="регионов в проекте"
          icon={MapPin}
          color="#f59e0b"
          href="/pir-psd"
        />
        <KpiCard
          label="Количество районов"
          value={fmtNum(districtsCount)}
          hint="административных"
          icon={Building2}
          color="#8b5cf6"
          href="/pir-psd"
        />
      </div>

      {/* Подключено — сёла и объекты, в разрезе по годам */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-3">
        <KpiCard
          label="Подключено сёл"
          value={fmtNum(svodStats.connectedSnp)}
          hint={`${svodStats.total ? ((svodStats.connectedSnp / svodStats.total) * 100).toFixed(1) : "0"}% от плана`}
          icon={CheckCircle2}
          color="#22c55e"
        />
        <KpiCard
          label="Подключено объектов"
          value={fmtNum(svodStats.connectedObjects)}
          hint="факт по госучреждениям / бюджетным"
          icon={ShieldCheck}
          color="#10b981"
        />
        <KpiCard
          label="СНП 2025"
          value={fmtNum(svodStats.byYear[2025] ?? 0)}
          hint={`подключено: ${fmtNum(svodStats.connectedByYear[2025] ?? 0)}`}
          icon={Zap}
          color="#f59e0b"
        />
        <KpiCard
          label="СНП 2026"
          value={fmtNum(svodStats.byYear[2026] ?? 0)}
          hint={`подключено: ${fmtNum(svodStats.connectedByYear[2026] ?? 0)}`}
          icon={Zap}
          color="#06b6d4"
        />
        <KpiCard
          label="СНП 2027"
          value={fmtNum(svodStats.byYear[2027] ?? 0)}
          hint={`подключено: ${fmtNum(svodStats.connectedByYear[2027] ?? 0)}`}
          icon={Satellite}
          color="#8b5cf6"
        />
      </div>

      {/* Второй ряд — процентное выполнение */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        <KpiCard
          label="Выполнено ПИР-ПСД"
          value={`${pirDonePct}%`}
          hint="средняя суммарная готовность"
          icon={FileText}
          color="#6366f1"
          href="/pir-psd"
        />
        <KpiCard
          label="Выполнено СМР (ВОЛС)"
          value={`${smrDonePct}%`}
          hint={smrRows.length === 0 ? "лист СМР пока не заполнен" : `${fmtNum(smrRows.length)} СНП в производстве`}
          icon={HardHat}
          color="#ec4899"
          href="/smr"
        />
        <KpiCard
          label="Выполнено ТП/ПП"
          value={`${guDonePct}%`}
          hint={`${guKpi.completed} из ${guKpi.total} завершены`}
          icon={ShieldCheck}
          color="#10b981"
          href="/gu"
        />
      </div>

      {/* Третий ряд — две круговые диаграммы */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RegionPie
          title="Протяжённость ВОЛС по областям"
          subtitle={`${fmtNum(Math.round(totalVolsKm))} км всего`}
          data={volsByRegion}
          unit="км"
          onSliceClick={gotoRegion}
        />
        <RegionPie
          title="Количество СНП по областям"
          subtitle={`${fmtNum(totalSnp)} СНП всего`}
          data={snpByRegion}
          unit=""
          onSliceClick={gotoRegion}
        />
      </div>

      {/* Гистограмма: средняя готовность ПИР-ПСД по областям */}
      <div
        className="rounded-lg p-4 mt-3"
        style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}
      >
        <div className="flex items-baseline justify-between mb-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {drillRegion && (
              <button
                onClick={() => setDrillRegion(null)}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded hover:brightness-110"
                style={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}
              >
                <ArrowLeft size={11} /> к областям
              </button>
            )}
            <div className="text-[11px] uppercase tracking-wider font-semibold truncate" style={{ color: "var(--c-text-3)" }}>
              {drillRegion
                ? `Средняя готовность по районам · ${drillRegion}`
                : "Средняя готовность ПИР-ПСД по областям"}
            </div>
          </div>
          <div className="text-[10px] flex-shrink-0" style={{ color: "var(--c-text-4)" }}>
            {drillRegion
              ? `${readinessByDistrict.length} р-нов · клик → фильтр`
              : `всего по проекту: ${pirDonePct}% · клик → район`}
          </div>
        </div>
        <div style={{
          width: "100%",
          height: drillRegion
            ? Math.max(readinessByDistrict.length * 26 + 40, 320)
            : Math.max(readinessByRegion.length * 28 + 40, 420),
        }}>
          <ResponsiveContainer>
            <BarChart
              data={drillRegion ? readinessByDistrict : readinessByRegion}
              layout="vertical"
              margin={{ top: 5, right: 40, bottom: 5, left: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={{ fill: "var(--c-text-3)", fontSize: 10 }}
                stroke="var(--c-border)"
                tickFormatter={(v) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={110}
                interval={0}
                tick={{ fill: "var(--c-text-2)", fontSize: 11 }}
                stroke="var(--c-border)"
              />
              <Tooltip
                formatter={(v: number) => [`${v.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`, "готовность"]}
                contentStyle={{
                  background: "var(--c-bg-2)",
                  border: "1px solid var(--c-border)",
                  borderRadius: 6,
                  fontSize: 11,
                  color: "var(--c-text-1)",
                }}
                labelStyle={{ color: "var(--c-text-1)" }}
                itemStyle={{ color: "var(--c-text-1)" }}
                cursor={{ fill: "color-mix(in srgb, #6366f1 10%, transparent)" }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                style={{ cursor: "pointer" }}
                onClick={(d: any) => {
                  if (!d?.fullName) return;
                  if (drillRegion) {
                    router.push(`/pir-psd?region=${encodeURIComponent(drillRegion)}&district=${encodeURIComponent(d.fullName)}`);
                  } else {
                    setDrillRegion(d.fullName);
                  }
                }}
                label={{
                  position: "right",
                  fill: "var(--c-text-2)",
                  fontSize: 10,
                  formatter: (v: number) => `${v.toFixed(2)}%`,
                }}
              >
                {(drillRegion ? readinessByDistrict : readinessByRegion).map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function RegionPie({
  title, subtitle, data, unit, onSliceClick,
}: {
  title: string;
  subtitle: string;
  data: { name: string; fullName: string; value: number }[];
  unit: string;
  onSliceClick?: (fullName: string) => void;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div
      className="rounded-lg p-4"
      style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
          {title}
        </div>
        <div className="text-[10px]" style={{ color: "var(--c-text-4)" }}>{subtitle}</div>
      </div>
      <div style={{ width: "100%", height: 300 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="40%"
              cy="50%"
              outerRadius={100}
              innerRadius={55}
              paddingAngle={1}
              stroke="var(--c-bg-0)"
              strokeWidth={1}
              style={onSliceClick ? { cursor: "pointer" } : undefined}
              onClick={(d: any) => {
                const fn = d?.payload?.fullName ?? d?.fullName;
                if (fn && onSliceClick) onSliceClick(fn);
              }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v: number) => {
                const pct = total ? ((v / total) * 100).toFixed(1) : "0";
                return [`${fmtNum(v)}${unit ? " " + unit : ""} · ${pct}%`, ""];
              }}
              contentStyle={{
                background: "var(--c-bg-2)",
                border: "1px solid var(--c-border)",
                borderRadius: 6,
                fontSize: 11,
                color: "var(--c-text-1)",
              }}
              labelStyle={{ color: "var(--c-text-1)" }}
              itemStyle={{ color: "var(--c-text-1)" }}
            />
            <Legend
              layout="vertical"
              align="right"
              verticalAlign="middle"
              iconSize={8}
              wrapperStyle={{ fontSize: 10, lineHeight: "14px", color: "var(--c-text-2)" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
