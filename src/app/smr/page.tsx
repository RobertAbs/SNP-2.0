"use client";

import { useMemo, useState } from "react";
import { HardHat, Search, Check, X } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import KpiCard from "@/components/common/KpiCard";
import { useSmr } from "@/hooks/useSmr";
import { fmtNum, fmtDate, groupBy } from "@/lib/dataHelpers";
import { SmrRow } from "@/lib/types";

export default function SmrPage() {
  const smr = useSmr();
  const [search, setSearch] = useState("");
  const rows = smr.data ?? [];

  const filtered = useMemo(() => rows.filter(r => {
    if (!search) return true;
    const s = search.toLowerCase();
    return r.snp.toLowerCase().includes(s) || r.region.toLowerCase().includes(s) || r.district.toLowerCase().includes(s);
  }), [rows, search]);

  const avgSmr = rows.length ? Math.round((rows.reduce((s, r) => s + r.smrPercent, 0) / rows.length) * 10) / 10 : 0;
  const avgFact = rows.length ? Math.round((rows.reduce((s, r) => s + r.factPercent, 0) / rows.length) * 10) / 10 : 0;
  const completed = rows.filter(r => r.smrPercent >= 100).length;
  const avgExec = rows.length ? Math.round((rows.reduce((s, r) => s + r.execDocsPercent, 0) / rows.length) * 10) / 10 : 0;

  const byRegion = useMemo(() => {
    const g = groupBy(rows, r => r.region || "—");
    return Object.entries(g).map(([region, items]) => ({
      region,
      count: items.length,
      avgSmr: items.reduce((a, b) => a + b.smrPercent, 0) / items.length,
      avgFact: items.reduce((a, b) => a + b.factPercent, 0) / items.length,
    })).sort((a, b) => b.avgSmr - a.avgSmr);
  }, [rows]);

  return (
    <div>
      <PageHeader
        title="СМР · ВОЛС"
        subtitle="Строительно-монтажные работы по ВОЛС"
        lastUpdated={smr.lastUpdated}
        refreshing={smr.refreshing}
        onRefresh={smr.refresh}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard label="СНП в СМР" value={fmtNum(rows.length)} hint="в производстве работ" icon={HardHat} color="#f59e0b" />
        <KpiCard label="Средний % СМР" value={`${avgSmr}%`} hint="по всем активным" color="#10b981" />
        <KpiCard label="Фактическая готовность" value={`${avgFact}%`} hint="средняя по проекту" color="#06b6d4" />
        <KpiCard label="Исп.-рабочая документация" value={`${avgExec}%`} hint="среднее предоставления" color="#8b5cf6" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg p-12"
          style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
          <EmptyState
            title="Лист СМР пока пуст"
            hint="Структура парсера готова под 30+ колонок: ГПР, мобилизация, даты начала/завершения СМР, исполнительная документация, ГАСК, декларация, акт ввода, КС-3, 2В, объёмная справка, сертификаты CT-KZ, корректировки ЗУП/ПСД, технический акт приёмки, заключение комиссии. Данные появятся автоматически после наполнения листа."
          />
        </div>
      ) : (
        <>
          {/* Разрез по областям */}
          <div className="rounded-lg p-5 mb-5"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: "var(--c-text-3)" }}>
              СМР в разрезе областей
            </div>
            <div className="space-y-1.5">
              {byRegion.map(r => {
                const w = Math.max(r.avgSmr, 0.5);
                return (
                  <div key={r.region} className="flex items-center gap-2">
                    <div className="w-40 text-[11px] truncate" style={{ color: "var(--c-text-2)" }}>
                      {r.region.replace(/\s*область$/i, "")}
                    </div>
                    <div className="w-10 text-[9px] font-mono tabular-nums text-right" style={{ color: "var(--c-text-4)" }}>
                      {r.count}
                    </div>
                    <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
                      <div className="h-full" style={{ width: `${w}%`, background: "#f59e0b" }} />
                    </div>
                    <div className="w-14 text-right text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
                      {Math.round(r.avgSmr)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Фильтр и таблица с расширенными данными */}
          <div className="flex items-center gap-2 mb-3">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--c-text-4)" }} />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Поиск СНП / область / район"
                className="rounded-md text-xs outline-none"
                style={{
                  background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
                  color: "var(--c-text-1)", padding: "6px 10px 6px 26px", minWidth: 240,
                }} />
            </div>
            <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--c-text-4)" }}>
              {fmtNum(filtered.length)} из {fmtNum(rows.length)}
            </span>
          </div>

          <div className="rounded-lg overflow-hidden"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ background: "var(--c-bg-2)" }}>
                    {["Область", "Район", "СНП", "ГПР", "Мобил.", "Нач. СМР", "% СМР", "ИРД %", "План", "Факт %", "ГАСК", "Акт ввода"].map(h => (
                      <th key={h} className="text-left px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
                        style={{ color: "var(--c-text-3)", borderBottom: "1px solid var(--c-border)" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--c-border)" }} className="hover:bg-white/[0.02]">
                      <td className="px-2.5 py-1.5" style={{ color: "var(--c-text-2)" }}>{r.region.replace(/\s*область$/i, "")}</td>
                      <td className="px-2.5 py-1.5" style={{ color: "var(--c-text-2)" }}>{r.district}</td>
                      <td className="px-2.5 py-1.5 font-medium" style={{ color: "var(--c-text-1)" }}>{r.snp}</td>
                      <td className="px-2.5 py-1.5"><BoolCell value={r.gprAvailable} /></td>
                      <td className="px-2.5 py-1.5 text-[10px] font-mono" style={{ color: "var(--c-text-2)" }}>{fmtDate(r.mobilizationDate)}</td>
                      <td className="px-2.5 py-1.5 text-[10px] font-mono" style={{ color: "var(--c-text-2)" }}>{fmtDate(r.startDate)}</td>
                      <td className="px-2.5 py-1.5"><PctCell value={r.smrPercent} color="#f59e0b" /></td>
                      <td className="px-2.5 py-1.5"><PctCell value={r.execDocsPercent} color="#8b5cf6" /></td>
                      <td className="px-2.5 py-1.5 text-[10px] font-mono" style={{ color: "var(--c-text-2)" }}>{fmtDate(r.plannedCompletion)}</td>
                      <td className="px-2.5 py-1.5"><PctCell value={r.factPercent} color="#10b981" /></td>
                      <td className="px-2.5 py-1.5"><BoolCell value={r.gaskConfirmation} /></td>
                      <td className="px-2.5 py-1.5"><BoolCell value={r.commissioningAct} /></td>
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

function BoolCell({ value }: { value: string }) {
  const v = value.toLowerCase();
  if (!v || v === "—") return <span className="text-[10px]" style={{ color: "var(--c-text-4)" }}>—</span>;
  const yes = v.includes("да") || v.includes("имеет") || v.includes("готов") || v.includes("+");
  const no = v.includes("нет") || v === "-";
  if (yes) return <Check size={12} style={{ color: "#10b981" }} />;
  if (no) return <X size={12} style={{ color: "var(--c-text-4)" }} />;
  return <span className="text-[9px] font-mono" style={{ color: "var(--c-text-3)" }}>{value}</span>;
}

function PctCell({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex items-center gap-1.5 w-20">
      <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
        <div className="h-full" style={{ width: `${Math.max(value, 1)}%`, background: color }} />
      </div>
      <div className="text-[9px] font-mono tabular-nums w-6 text-right" style={{ color: "var(--c-text-2)" }}>{value}</div>
    </div>
  );
}
