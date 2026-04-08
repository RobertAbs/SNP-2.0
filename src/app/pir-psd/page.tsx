"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend,
} from "recharts";
import { ChevronUp, ChevronDown, Search, ChevronRight, ArrowLeft, Check, X } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import EmptyState from "@/components/common/EmptyState";
import { usePirPsd } from "@/hooks/usePirPsd";
import { usePirWeights } from "@/hooks/usePirWeights";
import { activeStageCount, avgReadiness, avgStagePct, fmtDate, fmtNum, groupBy, uniq } from "@/lib/dataHelpers";
import { PIR_STAGE_LABELS, PirRow, PirStage } from "@/lib/types";

const STAGES: PirStage[] = ["ird", "izyskaniya", "proektirovanie", "soglasovaniya", "zemleustroistvo", "ekspertiza"];
const STAGE_OPTIONS = [{ key: "all" as const, label: "Все этапы" }, ...STAGES.map(s => ({ key: s, label: PIR_STAGE_LABELS[s] }))];

// Drill-down уровни: project → region → district → snp
type DrillLevel = "project" | "region" | "district";

export default function PirPsdPage() {
  const pir = usePirPsd();
  const weights = usePirWeights();
  const sp = useSearchParams();

  // Drill-down state
  const [drillRegion, setDrillRegion] = useState<string | null>(null);

  // Init drill from ?region= param
  useEffect(() => {
    const r = sp.get("region");
    if (r) setDrillRegion(r);
  }, [sp]);

  const [drillDistrict, setDrillDistrict] = useState<string | null>(null);

  // Filters
  const [stageFilter, setStageFilter] = useState<"all" | PirStage>("all");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  const rows = pir.data ?? [];
  const w = weights.data ?? [];

  const years = useMemo(() => uniq(rows.map(r => r.pirYear)).filter(Boolean).sort() as number[], [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (drillRegion && r.region !== drillRegion) return false;
      if (drillDistrict && r.district !== drillDistrict) return false;
      if (yearFilter && String(r.pirYear) !== yearFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.snp.toLowerCase().includes(s) && !r.district.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [rows, drillRegion, drillDistrict, yearFilter, search]);

  // — Drill уровень
  const level: DrillLevel = drillDistrict ? "district" : drillRegion ? "region" : "project";

  // — Bar chart: План vs Факт по группе
  // План = 100%, Факт = текущий % (для выбранного этапа или сум.готовность)
  const getPctForRow = (r: PirRow): number =>
    stageFilter === "all" ? r.totalReadiness : (r.stages[stageFilter] ?? 0);

  const barData = useMemo(() => {
    let groups: Record<string, PirRow[]>;
    if (level === "project") {
      groups = groupBy(filtered, r => r.region || "—");
    } else if (level === "region") {
      groups = groupBy(filtered, r => r.district || "—");
    } else {
      groups = groupBy(filtered, r => r.snp || "—");
    }
    return Object.entries(groups)
      .map(([name, items]) => ({
        name: name.replace(/\s*область$/i, "").slice(0, 18),
        fullName: name,
        план: 100,
        факт: Math.round(items.reduce((a, b) => a + getPctForRow(b), 0) / items.length),
        count: items.length,
      }))
      .sort((a, b) => b.факт - a.факт)
      .slice(0, level === "district" ? 20 : 50);
  }, [filtered, level, stageFilter]);

  // — Line chart: средний % по этапам (тренд по 6 этапам)
  const lineData = useMemo(() => {
    return STAGES.map(s => ({
      этап: PIR_STAGE_LABELS[s],
      факт: avgStagePct(filtered, s),
      план: 100,
    }));
  }, [filtered]);

  // — Drill click handler
  const onBarClick = (data: any) => {
    if (!data || !data.fullName) return;
    if (level === "project") setDrillRegion(data.fullName);
    else if (level === "region") setDrillDistrict(data.fullName);
  };
  const goBack = () => {
    if (drillDistrict) setDrillDistrict(null);
    else if (drillRegion) setDrillRegion(null);
  };

  // — Expandable rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

  // — Table
  const columns = useMemo<ColumnDef<PirRow>[]>(() => [
    {
      id: "expander",
      header: "",
      cell: ({ row }) => {
        const id = `${row.original.kato}_${row.original.snp}_${row.index}`;
        const isOpen = expanded.has(id);
        return (
          <button onClick={(e) => { e.stopPropagation(); toggleRow(id); }}
            className="p-0.5 rounded hover:bg-white/5 transition"
            style={{ color: "var(--c-text-3)" }}>
            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        );
      },
      size: 28,
    },
    { accessorKey: "kato", header: "КАТО", size: 100 },
    { accessorKey: "region", header: "Область", size: 130 },
    { accessorKey: "district", header: "Район", size: 130 },
    { accessorKey: "ruralDistrict", header: "С/округ", size: 130 },
    { accessorKey: "snp", header: "СНП", size: 160 },
    { accessorKey: "pirYear", header: "Год", size: 60 },
    {
      id: "totalReadiness",
      header: "Готовность",
      accessorFn: r => r.totalReadiness,
      cell: info => {
        const v = info.getValue<number>();
        return (
          <div className="flex items-center gap-2 w-32">
            <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
              <div className="h-full" style={{ width: `${v}%`, background: "#6366f1" }} />
            </div>
            <div className="text-[10px] font-mono tabular-nums w-8" style={{ color: "var(--c-text-2)" }}>{v}%</div>
          </div>
        );
      },
      size: 160,
    },
    {
      accessorKey: "plannedCompletion",
      header: "План завершения",
      cell: info => fmtDate(info.getValue<string | null>()),
      size: 120,
    },
  ], [expanded]);

  const table = useReactTable({
    data: filtered, columns, state: { sorting }, onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(), getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 50 } },
  });

  const breadcrumb = (
    <div className="flex items-center gap-1.5 text-[11px] font-mono mb-3" style={{ color: "var(--c-text-3)" }}>
      <button onClick={() => { setDrillRegion(null); setDrillDistrict(null); }}
        className="hover:text-indigo-400 transition" style={{ color: drillRegion ? "var(--c-text-3)" : "#6366f1" }}>
        проект
      </button>
      {drillRegion && (
        <>
          <ChevronRight size={10} />
          <button onClick={() => setDrillDistrict(null)}
            className="hover:text-indigo-400 transition"
            style={{ color: drillDistrict ? "var(--c-text-3)" : "#6366f1" }}>
            {drillRegion}
          </button>
        </>
      )}
      {drillDistrict && (<><ChevronRight size={10} /><span style={{ color: "#6366f1" }}>{drillDistrict}</span></>)}
    </div>
  );

  return (
    <div>
      <PageHeader
        title="ПИР-ПСД"
        subtitle="Проектно-изыскательские работы"
        lastUpdated={pir.lastUpdated}
        refreshing={pir.refreshing}
        onRefresh={pir.refresh}
      />

      {breadcrumb}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Кол-во СНП" value={fmtNum(filtered.length)}
          hint={drillRegion ? `в ${drillDistrict || drillRegion}` : `всего по проекту`} color="#10b981" />
        <KpiCard label="Областей" value={uniq(filtered.map(r => r.region)).length}
          hint={drillRegion ? "сбросить drill" : "регионов"} color="#06b6d4"
          onClick={() => { setDrillRegion(null); setDrillDistrict(null); }} />
        <KpiCard label="Районов" value={uniq(filtered.map(r => r.district)).length}
          hint={drillDistrict ? "сбросить район" : "административных"} color="#f59e0b"
          onClick={() => setDrillDistrict(null)} />
        <KpiCard label="AVG готовность" value={`${avgReadiness(filtered)}%`}
          hint={stageFilter === "all" ? "суммарная" : PIR_STAGE_LABELS[stageFilter as PirStage]}
          color="#10b981" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(drillRegion || drillDistrict) && (
          <button onClick={goBack}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition hover:brightness-110"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>
            <ArrowLeft size={12} /> Назад
          </button>
        )}
        <div className="relative">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--c-text-4)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Поиск СНП / район"
            className="rounded-md text-xs outline-none"
            style={{
              background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
              color: "var(--c-text-1)", padding: "6px 10px 6px 26px", minWidth: 220,
            }} />
        </div>
        <select value={stageFilter} onChange={e => setStageFilter(e.target.value as any)}
          className="rounded-md text-xs px-2.5 py-1.5 outline-none"
          style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)", color: "var(--c-text-1)" }}>
          {STAGE_OPTIONS.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
        </select>
        <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
          className="rounded-md text-xs px-2.5 py-1.5 outline-none"
          style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)", color: "var(--c-text-1)" }}>
          <option value="">Все годы</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Нет данных" hint="Настройте Google Sheet или используйте локальные данные" />
      ) : (
        <>
          {/* Bar chart: План vs Факт */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="col-span-3 lg:col-span-2 rounded-lg p-4"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
                  План vs Факт · {level === "project" ? "по областям" : level === "region" ? "по районам" : "по СНП"}
                </div>
                <div className="text-[10px] font-mono" style={{ color: "var(--c-text-4)" }}>
                  {level !== "district" && "click → drill-down"}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={barData} margin={{ top: 5, right: 0, left: -25, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" vertical={false} />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" interval={0}
                    tick={{ fill: "var(--c-text-4)", fontSize: 9 }}
                    axisLine={{ stroke: "var(--c-border)" }} tickLine={false} />
                  <YAxis tick={{ fill: "var(--c-text-4)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10, color: "var(--c-text-3)" }} />
                  <Bar dataKey="план" fill="var(--c-border)" radius={[2, 2, 0, 0]} maxBarSize={18} onClick={onBarClick} cursor="pointer" />
                  <Bar dataKey="факт" fill="#6366f1" radius={[2, 2, 0, 0]} maxBarSize={18} onClick={onBarClick} cursor="pointer" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Line chart: тренд по этапам */}
            <div className="col-span-3 lg:col-span-1 rounded-lg p-4"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--c-text-3)" }}>
                Готовность по этапам
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 5, right: 5, left: -25, bottom: 50 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" />
                  <XAxis dataKey="этап" angle={-35} textAnchor="end" interval={0}
                    tick={{ fill: "var(--c-text-4)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--c-text-4)", fontSize: 9 }} axisLine={false} tickLine={false} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 11 }} />
                  <Line type="monotone" dataKey="план" stroke="var(--c-text-4)" strokeDasharray="3 3" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="факт" stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stage progress detail */}
          <div className="rounded-lg p-4 mb-6"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--c-text-3)" }}>
              Прогресс по видам работ
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {STAGES.map(stage => {
                const weight = w.find(x => x.stage === stage);
                const v = avgStagePct(filtered, stage);
                const active = activeStageCount(filtered, stage);
                const pctActive = filtered.length ? Math.round((active / filtered.length) * 100) : 0;
                return (
                  <div key={stage} className="flex items-center gap-2 text-xs">
                    <div className="w-56 truncate" style={{ color: "var(--c-text-2)" }}>
                      {PIR_STAGE_LABELS[stage]}
                      {weight && <span className="text-[9px] ml-1" style={{ color: "var(--c-text-4)" }}>вес {(weight.weight * 100).toFixed(0)}%</span>}
                    </div>
                    <div className="flex-1 h-1 rounded-full overflow-hidden relative" style={{ background: "var(--c-bg-2)" }}>
                      <div className="h-full absolute inset-y-0 left-0" style={{ width: `${pctActive}%`, background: "color-mix(in srgb, #10b981 25%, transparent)" }} />
                      <div className="h-full absolute inset-y-0 left-0" style={{ width: `${v}%`, background: "#10b981" }} />
                    </div>
                    <div className="font-mono tabular-nums w-10 text-right text-[10px]" style={{ color: "var(--c-text-1)" }}>
                      {v < 1 ? v.toFixed(1) : Math.round(v)}%
                    </div>
                    <div className="font-mono tabular-nums w-14 text-right text-[9px]" style={{ color: "var(--c-text-4)" }}>
                      {fmtNum(active)} акт.
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg overflow-hidden"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id} style={{ background: "var(--c-bg-2)" }}>
                      {hg.headers.map(h => (
                        <th key={h.id} onClick={h.column.getToggleSortingHandler()}
                          className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider cursor-pointer select-none"
                          style={{ color: "var(--c-text-3)", borderBottom: "1px solid var(--c-border)" }}>
                          <div className="flex items-center gap-1">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                            {h.column.getIsSorted() === "asc" && <ChevronUp size={12} />}
                            {h.column.getIsSorted() === "desc" && <ChevronDown size={12} />}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => {
                    const id = `${row.original.kato}_${row.original.snp}_${row.index}`;
                    const isOpen = expanded.has(id);
                    return (
                      <>
                        <tr key={row.id}
                          onClick={() => toggleRow(id)}
                          style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer" }}
                          className="hover:bg-white/[0.02] transition">
                          {row.getVisibleCells().map(cell => (
                            <td key={cell.id} className="px-3 py-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          ))}
                        </tr>
                        {isOpen && (
                          <tr key={row.id + "_d"} style={{ borderBottom: "1px solid var(--c-border)", background: "var(--c-bg-2)" }}>
                            <td colSpan={row.getVisibleCells().length} className="p-4">
                              <StageDetails row={row.original} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between px-4 py-2.5 text-[11px] font-mono"
              style={{ borderTop: "1px solid var(--c-border)", color: "var(--c-text-3)" }}>
              <span>стр. {table.getState().pagination.pageIndex + 1} / {table.getPageCount()} · {filtered.length} СНП</span>
              <div className="flex gap-2">
                <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                  className="px-2 py-0.5 rounded disabled:opacity-30"
                  style={{ border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>←</button>
                <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                  className="px-2 py-0.5 rounded disabled:opacity-30"
                  style={{ border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>→</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StageDetails({ row }: { row: PirRow }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-[11px]" style={{ color: "var(--c-text-3)" }}>
        <span>КАТО: <span style={{ color: "var(--c-text-1)" }} className="font-mono">{row.kato || "—"}</span></span>
        {row.orderNo && <span>№ заказа: <span style={{ color: "var(--c-text-1)" }}>{row.orderNo}</span></span>}
        {row.pirYear && <span>Год ПИР: <span style={{ color: "var(--c-text-1)" }}>{row.pirYear}</span></span>}
        {row.volsLengthM && <span>Протяжённость ВОЛС: <span style={{ color: "var(--c-text-1)" }}>{row.volsLengthM} м</span></span>}
        <span>План: <span style={{ color: "var(--c-text-1)" }}>{fmtDate(row.plannedCompletion)}</span></span>
        <span>Сумм. готовность: <span className="font-mono" style={{ color: "#10b981" }}>{row.totalReadiness}%</span></span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {STAGES.map(stage => {
          const d = row.details[stage];
          if (!d) return null;
          return (
            <div key={stage} className="rounded-md p-3"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between mb-2">
                <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--c-text-2)" }}>
                  {PIR_STAGE_LABELS[stage]}
                </div>
                <div className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded"
                  style={{ background: "color-mix(in srgb, #10b981 12%, transparent)", color: "#10b981" }}>
                  {d.pct}%
                </div>
              </div>
              <div className="h-0.5 rounded-full overflow-hidden mb-2" style={{ background: "var(--c-bg-2)" }}>
                <div className="h-full" style={{ width: `${d.pct}%`, background: "#10b981" }} />
              </div>
              <ul className="space-y-1">
                {d.items.length === 0 && (
                  <li className="text-[10px]" style={{ color: "var(--c-text-4)" }}>нет подпунктов</li>
                )}
                {d.items.map((it, i) => {
                  const s = it.status.toLowerCase();
                  const info = it.info
                    .replace(/\s*00:00:00(?:\.\d+)?/g, "")
                    .replace(/(\d{4})-(\d{2})-(\d{2})/g, "$3.$2.$1")
                    .trim();
                  const done = s === "да" || s === "+" || /^\s*100/.test(s);
                  const no = s === "нет" || s === "-" || s === "";
                  return (
                    <li key={i} className="flex items-start gap-2 text-[10.5px] leading-tight">
                      <span className="flex-shrink-0 mt-0.5">
                        {it.type === "bool" ? (
                          done ? <Check size={11} style={{ color: "#10b981" }} /> :
                          no ? <X size={11} style={{ color: "var(--c-text-4)" }} /> :
                          <span className="font-mono text-[9px]" style={{ color: "var(--c-text-3)" }}>{it.status}</span>
                        ) : (
                          <span className="font-mono text-[9px] tabular-nums" style={{ color: "#06b6d4" }}>{it.status || "—"}</span>
                        )}
                      </span>
                      <span className="flex-1" style={{ color: "var(--c-text-2)" }}>
                        {it.name}
                        {info && (
                          <span className="block text-[9.5px] font-mono truncate" style={{ color: "var(--c-text-4)" }} title={info}>
                            {info}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
