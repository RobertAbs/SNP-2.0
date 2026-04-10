"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock, Search, Cable, Plug, FileCheck } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import EmptyState from "@/components/common/EmptyState";
import { useGU } from "@/hooks/useGU";
import { computeGuKpi, fmtDate, fmtNum, groupBy } from "@/lib/dataHelpers";
import { GU_SECTION_LABELS, GuSectionStatus, GUCheckpoint } from "@/lib/types";

const SECTION_COLORS: Record<GuSectionStatus, string> = {
  completed: "#10b981",
  in_progress: "#f59e0b",
};

export default function GUPage() {
  const gu = useGU();
  const [statusFilter, setStatusFilter] = useState<"" | GuSectionStatus>("");
  const [search, setSearch] = useState("");

  const rows = gu.data ?? [];
  const kpi = computeGuKpi(rows);

  const filtered = useMemo(() => rows.filter(r => {
    if (statusFilter && r.sectionStatus !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!r.name.toLowerCase().includes(s) &&
          !r.address.toLowerCase().includes(s) &&
          !r.department.toLowerCase().includes(s)) return false;
    }
    return true;
  }), [rows, statusFilter, search]);

  const byDept = groupBy(filtered, r => r.department || "—");

  return (
    <div>
      <PageHeader
        title="ГУ ПП"
        subtitle="Пункты пропуска через границу"
        lastUpdated={gu.lastUpdated}
        refreshing={gu.refreshing}
        onRefresh={gu.refresh}
      />

      {/* Hero KPI: 3 карточки — всего / завершены / в работе */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
        <KpiCard
          label="Всего ГУ ПП"
          value={fmtNum(kpi.total)}
          hint={kpi.fromSOI > 0 ? `${kpi.fromSOI} из исходного СОИ · ${kpi.total - kpi.fromSOI} новых` : "пунктов пропуска"}
          color="#06b6d4"
          onClick={() => { setStatusFilter(""); setSearch(""); }}
          sub={[
            { label: "Из СОИ", value: fmtNum(kpi.fromSOI) },
            { label: "Новые", value: fmtNum(kpi.total - kpi.fromSOI) },
          ]}
        />
        <KpiCard
          label="Завершены работы"
          value={fmtNum(kpi.completed)}
          hint={`${kpi.total ? Math.round((kpi.completed / kpi.total) * 100) : 0}% объектов готовы`}
          icon={CheckCircle2}
          color="#10b981"
          onClick={() => setStatusFilter("completed")}
          sub={[
            { label: "ВОЛС готов", value: fmtNum(kpi.volsCompleted) },
            { label: "Подключены", value: fmtNum(kpi.connected) },
          ]}
        />
        <KpiCard
          label="В производстве"
          value={fmtNum(kpi.inProgress)}
          hint={`${kpi.total ? Math.round((kpi.inProgress / kpi.total) * 100) : 0}% в работе`}
          icon={Clock}
          color="#f59e0b"
          onClick={() => setStatusFilter("in_progress")}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Нет данных" hint="Данные загружаются, обновите страницу" />
      ) : (
        <>
          {/* Status segment bar + операционные метрики */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-5">
            {/* segment bar */}
            <div className="lg:col-span-3 rounded-lg p-5"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
                    Распределение по статусам
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--c-text-4)" }}>
                    клик по сегменту → фильтр
                  </div>
                </div>
                {statusFilter && (
                  <button onClick={() => setStatusFilter("")}
                    className="text-[10px] font-mono px-2 py-1 rounded transition hover:brightness-110"
                    style={{ border: "1px solid var(--c-border)", color: "var(--c-text-3)" }}>
                    × сброс
                  </button>
                )}
              </div>

              {/* Segmented bar */}
              <div className="flex h-10 rounded-md overflow-hidden mb-3" style={{ border: "1px solid var(--c-border)" }}>
                {(["completed", "in_progress"] as GuSectionStatus[]).map(st => {
                  const count = st === "completed" ? kpi.completed : kpi.inProgress;
                  if (count === 0) return null;
                  const width = (count / kpi.total) * 100;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(statusFilter === st ? "" : st)}
                      className="flex items-center justify-center text-xs font-semibold transition hover:brightness-110"
                      style={{
                        width: `${width}%`,
                        background: SECTION_COLORS[st],
                        color: "#0a0e1a",
                        opacity: !statusFilter || statusFilter === st ? 1 : 0.35,
                      }}
                      title={GU_SECTION_LABELS[st]}>
                      {count} · {Math.round(width)}%
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px]" style={{ color: "var(--c-text-3)" }}>
                {(["completed", "in_progress"] as GuSectionStatus[]).map(st => (
                  <div key={st} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: SECTION_COLORS[st] }} />
                    <span>{GU_SECTION_LABELS[st]}</span>
                  </div>
                ))}
              </div>

              {/* Operational metrics row */}
              <div className="grid grid-cols-3 gap-3 mt-5 pt-4" style={{ borderTop: "1px solid var(--c-border)" }}>
                <OpMetric icon={Cable} label="ВОЛС завершён" value={kpi.volsCompleted} total={kpi.total} color="#10b981" />
                <OpMetric icon={Plug} label="Подключение" value={kpi.connected} total={kpi.total} color="#06b6d4" />
                <OpMetric icon={FileCheck} label="ПСД готов" value={kpi.psdReady} total={kpi.total} color="#8b5cf6" />
              </div>
            </div>

            {/* Группировка по ДГД (топ) */}
            <div className="lg:col-span-2 rounded-lg p-5"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: "var(--c-text-3)" }}>
                Топ ДГД по числу ПП
              </div>
              <div className="space-y-1">
                {Object.entries(byDept)
                  .sort((a, b) => b[1].length - a[1].length)
                  .slice(0, 8)
                  .map(([dept, items]) => {
                    const completedC = items.filter(i => i.sectionStatus === "completed").length;
                    const pct = (completedC / items.length) * 100;
                    return (
                      <div key={dept} className="px-2 py-1.5 -mx-2 rounded">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] truncate flex-1" style={{ color: "var(--c-text-1)" }}>
                            {dept.replace(/^ДГД по\s*/i, "")}
                          </div>
                          <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                              style={{ background: "color-mix(in srgb, #10b981 15%, transparent)", color: "#10b981" }}>
                              {completedC}/{items.length}
                            </span>
                          </div>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
                          <div className="h-full" style={{ width: `${pct}%`, background: "#10b981" }} />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--c-text-4)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск ПП / адрес / ДГД"
                className="rounded-md text-xs outline-none"
                style={{
                  background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
                  color: "var(--c-text-1)", padding: "6px 10px 6px 26px", minWidth: 240,
                }} />
            </div>
            {statusFilter && (
              <button onClick={() => setStatusFilter("")}
                className="text-[10px] font-mono px-2 py-1.5 rounded transition hover:brightness-110"
                style={{ background: SECTION_COLORS[statusFilter], color: "#0a0e1a" }}>
                {GU_SECTION_LABELS[statusFilter]} ×
              </button>
            )}
            <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--c-text-4)" }}>
              {fmtNum(filtered.length)} из {fmtNum(rows.length)}
            </span>
          </div>

          {/* Таблица */}
          <div className="rounded-lg overflow-hidden"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "var(--c-bg-2)" }}>
                    {["№", "ДГД", "Наименование", "Адрес", "Из СОИ", "ВОЛС", "Подключение", "ПСД", "КВЭП", "Статус"].map(h => (
                      <th key={h} className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider"
                        style={{ color: "var(--c-text-3)", borderBottom: "1px solid var(--c-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid var(--c-border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-3 py-2 text-[11px] font-mono tabular-nums" style={{ color: "var(--c-text-3)" }}>{r.id}</td>
                      <td className="px-3 py-2 text-[11px]" style={{ color: "var(--c-text-2)" }}>
                        {r.department.replace(/^ДГД по\s*/i, "")}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium" style={{ color: "var(--c-text-1)" }}>{r.name}</td>
                      <td className="px-3 py-2 text-[10px]" style={{ color: "var(--c-text-4)", maxWidth: 240 }}>{r.address}</td>
                      <td className="px-3 py-2">
                        <SoiBadge value={r.fromOriginalSOI} />
                      </td>
                      <td className="px-3 py-2"><StatusBadge value={r.volsStatus} /></td>
                      <td className="px-3 py-2"><StatusBadge value={r.connectionStatus} /></td>
                      <td className="px-3 py-2"><StatusBadge value={r.psdReady} /></td>
                      <td className="px-3 py-2 text-[10px] font-mono tabular-nums" style={{ color: "var(--c-text-2)" }}>{fmtDate(r.kvepDate)}</td>
                      <td className="px-3 py-2">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: SECTION_COLORS[r.sectionStatus] }}
                          title={GU_SECTION_LABELS[r.sectionStatus]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function OpMetric({ icon: Icon, label, value, total, color }: {
  icon: any; label: string; value: number; total: number; color: string;
}) {
  const pct = total ? (value / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} style={{ color }} />
        <div className="text-[10px] uppercase tracking-wider" style={{ color: "var(--c-text-3)" }}>{label}</div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <div className="text-xl font-bold tabular-nums" style={{ color: "var(--c-text-1)" }}>{value}</div>
        <div className="text-[10px]" style={{ color: "var(--c-text-4)" }}>из {total}</div>
      </div>
      <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function SoiBadge({ value }: { value: boolean }) {
  return (
    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-medium"
      style={{
        background: value ? "color-mix(in srgb, #06b6d4 15%, transparent)" : "color-mix(in srgb, #8b5cf6 12%, transparent)",
        color: value ? "#06b6d4" : "#8b5cf6",
      }}>
      {value ? "СОИ" : "новый"}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  const v = value.toLowerCase();
  let bg = "var(--c-bg-2)", color = "var(--c-text-3)";
  if (v.includes("заверш") || v.includes("подключ") || (v.includes("готов") && !v.includes("не"))) {
    bg = "color-mix(in srgb, #10b981 15%, transparent)"; color = "#10b981";
  } else if (v.includes("наряд") || v.includes("работ") || v.includes("производств")) {
    bg = "color-mix(in srgb, #f59e0b 15%, transparent)"; color = "#f59e0b";
  } else if (v.includes("не готов") || v === "—" || !v) {
    bg = "var(--c-bg-2)"; color = "var(--c-text-4)";
  }
  return (
    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-medium whitespace-nowrap"
      style={{ background: bg, color }}>
      {value || "—"}
    </span>
  );
}
