"use client";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import { ChevronUp, ChevronDown, Search, ChevronRight, Check, X, SlidersHorizontal } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import EmptyState from "@/components/common/EmptyState";
import { usePirPsd } from "@/hooks/usePirPsd";
import { usePirWeights } from "@/hooks/usePirWeights";
import { activeStageCount, avgStagePct, fmtDate, fmtNum, uniq } from "@/lib/dataHelpers";
import type { PirRow as _PR } from "@/lib/types";
function avgReadiness2(rows: _PR[]): string {
  if (rows.length === 0) return "0,00";
  const s = rows.reduce((a, r) => a + r.totalReadiness, 0) / rows.length;
  return s.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
import { PIR_STAGE_LABELS, PirRow, PirStage } from "@/lib/types";

const STAGES: PirStage[] = ["ird", "izyskaniya", "proektirovanie", "soglasovaniya", "zemleustroistvo", "ekspertiza"];

export default function PirPsdPageWrapper() {
  return <Suspense fallback={null}><PirPsdPage /></Suspense>;
}

function PirPsdPage() {
  const pir = usePirPsd();
  const weights = usePirWeights();
  const sp = useSearchParams();

  // Фильтры
  const [regionFilter, setRegionFilter] = useState<string>("");
  const [districtFilter, setDistrictFilter] = useState<string>("");
  const [yearFilter, setYearFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);

  // Доп. фильтры: диапазон общей готовности + фильтры по этапам
  const [moreOpen, setMoreOpen] = useState(false);
  const [readinessBucket, setReadinessBucket] = useState<string>(""); // "", "0", "1-25", "26-50", "51-75", "76-99", "100"
  const [stageBuckets, setStageBuckets] = useState<Record<PirStage, string>>({
    ird: "", izyskaniya: "", proektirovanie: "", soglasovaniya: "", zemleustroistvo: "", ekspertiza: "",
  });
  const bucketMatch = (v: number, bucket: string): boolean => {
    if (!bucket) return true;
    if (bucket === "0") return v === 0;
    if (bucket === "100") return v >= 100;
    const [lo, hi] = bucket.split("-").map(Number);
    return v >= lo && v <= hi;
  };
  const BUCKETS = [
    { k: "", l: "любой" },
    { k: "0", l: "= 0%" },
    { k: "1-25", l: "1–25%" },
    { k: "26-50", l: "26–50%" },
    { k: "51-75", l: "51–75%" },
    { k: "76-99", l: "76–99%" },
    { k: "100", l: "= 100%" },
  ];

  // Инициализация из ?region= (переход с главной)
  useEffect(() => {
    const r = sp.get("region");
    if (r) setRegionFilter(r);
  }, [sp]);

  const rows = pir.data ?? [];
  const w = weights.data ?? [];

  // Опции фильтров
  const regionOptions = useMemo(
    () => uniq(rows.map(r => r.region)).filter(Boolean).sort(),
    [rows]
  );
  const districtOptions = useMemo(
    () => uniq(
      rows.filter(r => !regionFilter || r.region === regionFilter).map(r => r.district)
    ).filter(Boolean).sort(),
    [rows, regionFilter]
  );
  const years = useMemo(
    () => uniq(rows.map(r => r.pirYear)).filter(Boolean).sort() as number[],
    [rows]
  );

  // Сброс района при смене области
  useEffect(() => { setDistrictFilter(""); }, [regionFilter]);

  // Отфильтрованные строки для таблицы и деталей
  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (regionFilter && r.region !== regionFilter) return false;
      if (districtFilter && r.district !== districtFilter) return false;
      if (yearFilter && String(r.pirYear) !== yearFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.snp.toLowerCase().includes(s)
          && !r.district.toLowerCase().includes(s)
          && !r.region.toLowerCase().includes(s)) return false;
      }
      if (!bucketMatch(r.totalReadiness, readinessBucket)) return false;
      for (const st of STAGES) {
        if (!bucketMatch(r.stages[st] ?? 0, stageBuckets[st])) return false;
      }
      return true;
    });
  }, [rows, regionFilter, districtFilter, yearFilter, search, readinessBucket, stageBuckets]);

  const activeMoreCount =
    (readinessBucket ? 1 : 0) + Object.values(stageBuckets).filter(Boolean).length;

  // Expandable rows
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const toggleRow = (id: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  };

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
              <div className="h-full" style={{ width: `${Math.min(v, 100)}%`, background: "#6366f1" }} />
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

  const selectStyle = {
    background: "var(--c-bg-1)",
    border: "1px solid var(--c-border)",
    color: "var(--c-text-1)",
  } as React.CSSProperties;

  const hasFilters = regionFilter || districtFilter || yearFilter || search || activeMoreCount > 0;

  return (
    <div>
      <PageHeader
        title="ПИР-ПСД"
        subtitle="Проектно-изыскательские работы"
        lastUpdated={pir.lastUpdated}
        refreshing={pir.refreshing}
        onRefresh={pir.refresh}
      />

      {/* KPI — реагируют на фильтры */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <KpiCard
          label="Кол-во СНП"
          value={fmtNum(filtered.length)}
          hint={hasFilters ? `из ${fmtNum(rows.length)} по выборке` : "всего по проекту"}
          color="#10b981"
        />
        <KpiCard
          label="Областей"
          value={uniq(filtered.map(r => r.region)).filter(Boolean).length}
          hint={hasFilters ? "в выборке" : "регионов"}
          color="#06b6d4"
        />
        <KpiCard
          label="Районов"
          value={uniq(filtered.map(r => r.district)).filter(Boolean).length}
          hint={hasFilters ? "в выборке" : "административных"}
          color="#f59e0b"
        />
        <KpiCard
          label="AVG готовность"
          value={`${avgReadiness2(filtered)}%`}
          hint={hasFilters ? "по выборке" : "суммарная"}
          color="#8b5cf6"
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Нет данных" hint="Настройте Google Sheet или используйте локальные данные" />
      ) : (
        <>
          {/* Фильтры */}
          <div className="rounded-lg p-3 mb-4"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[10px] uppercase tracking-wider font-semibold mr-1" style={{ color: "var(--c-text-4)" }}>
                Фильтры
              </div>

              <select value={regionFilter} onChange={e => setRegionFilter(e.target.value)}
                className="rounded-md text-xs px-2.5 py-1.5 outline-none min-w-[180px]" style={selectStyle}>
                <option value="">Все области</option>
                {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
              </select>

              <select value={districtFilter} onChange={e => setDistrictFilter(e.target.value)}
                disabled={districtOptions.length === 0}
                className="rounded-md text-xs px-2.5 py-1.5 outline-none min-w-[180px] disabled:opacity-40"
                style={selectStyle}>
                <option value="">Все районы{regionFilter ? ` (${districtOptions.length})` : ""}</option>
                {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
                className="rounded-md text-xs px-2.5 py-1.5 outline-none" style={selectStyle}>
                <option value="">Все годы</option>
                {years.map(y => <option key={y} value={y}>{y}</option>)}
              </select>

              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--c-text-4)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск СНП / район / область"
                  className="rounded-md text-xs outline-none"
                  style={{
                    background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
                    color: "var(--c-text-1)", padding: "6px 10px 6px 26px", minWidth: 240,
                  }} />
              </div>

              <button onClick={() => setMoreOpen(o => !o)}
                className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-md hover:brightness-110"
                style={{
                  background: moreOpen || activeMoreCount > 0 ? "color-mix(in srgb, #8b5cf6 15%, transparent)" : "var(--c-bg-2)",
                  border: `1px solid ${moreOpen || activeMoreCount > 0 ? "#8b5cf6" : "var(--c-border)"}`,
                  color: moreOpen || activeMoreCount > 0 ? "#8b5cf6" : "var(--c-text-2)",
                }}>
                <SlidersHorizontal size={11} />
                Дополнительно
                {activeMoreCount > 0 && (
                  <span className="text-[9px] font-mono px-1 rounded" style={{ background: "#8b5cf6", color: "white" }}>
                    {activeMoreCount}
                  </span>
                )}
              </button>

              {hasFilters && (
                <button onClick={() => {
                  setRegionFilter(""); setDistrictFilter(""); setYearFilter(""); setSearch("");
                  setReadinessBucket("");
                  setStageBuckets({ ird: "", izyskaniya: "", proektirovanie: "", soglasovaniya: "", zemleustroistvo: "", ekspertiza: "" });
                }}
                  className="text-[11px] px-2.5 py-1.5 rounded-md hover:brightness-110"
                  style={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>
                  Сбросить
                </button>
              )}

              <div className="ml-auto text-[10px] font-mono" style={{ color: "var(--c-text-3)" }}>
                найдено: <span style={{ color: "var(--c-text-1)" }}>{fmtNum(filtered.length)}</span> из {fmtNum(rows.length)}
                {filtered.length > 0 && (
                  <> · средняя <span style={{ color: "#8b5cf6" }}>{avgReadiness2(filtered)}%</span></>
                )}
              </div>
            </div>

            {moreOpen && (
              <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--c-border)" }}>
                <div className="text-[9px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--c-text-4)" }}>
                  Фильтр по диапазону готовности
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                  <BucketSelect label="Суммарная готовность" value={readinessBucket} onChange={setReadinessBucket} options={BUCKETS} accent="#8b5cf6" />
                  {STAGES.map((st, i) => (
                    <BucketSelect key={st}
                      label={PIR_STAGE_LABELS[st]}
                      value={stageBuckets[st]}
                      onChange={v => setStageBuckets(prev => ({ ...prev, [st]: v }))}
                      options={BUCKETS}
                      accent={["#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"][i]} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Прогресс по этапам — отражает отфильтрованную выборку */}
          <div className="rounded-lg p-6 mb-5"
            style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
            <div className="flex items-baseline justify-between mb-5">
              <div className="text-sm uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-2)" }}>
                Прогресс по видам работ
              </div>
              <div className="text-xs" style={{ color: "var(--c-text-4)" }}>
                {hasFilters ? "по выбранной выборке" : "по всем СНП"}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-5">
              {STAGES.map(stage => {
                const weight = w.find(x => x.stage === stage);
                const v = avgStagePct(filtered, stage);
                const active = activeStageCount(filtered, stage);
                const pctActive = filtered.length ? Math.round((active / filtered.length) * 100) : 0;
                return (
                  <div key={stage}>
                    <div className="flex items-baseline justify-between mb-2 gap-3">
                      <div className="flex items-baseline gap-2 min-w-0">
                        <span className="text-sm font-medium truncate" style={{ color: "var(--c-text-1)" }}>
                          {PIR_STAGE_LABELS[stage]}
                        </span>
                        {weight && (
                          <span className="text-[11px] flex-shrink-0" style={{ color: "var(--c-text-4)" }}>
                            вес {(weight.weight * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-3 flex-shrink-0">
                        <span className="text-lg font-bold font-mono tabular-nums" style={{ color: "#10b981" }}>
                          {v < 1 ? v.toFixed(1) : Math.round(v)}%
                        </span>
                        <span className="text-[11px] font-mono tabular-nums" style={{ color: "var(--c-text-4)" }}>
                          {fmtNum(active)} акт.
                        </span>
                      </div>
                    </div>
                    <div className="h-2.5 rounded-full overflow-hidden relative" style={{ background: "var(--c-bg-2)" }}>
                      <div className="h-full absolute inset-y-0 left-0" style={{ width: `${pctActive}%`, background: "color-mix(in srgb, #10b981 25%, transparent)" }} />
                      <div className="h-full absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(v, 100)}%`, background: "#10b981" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Таблица */}
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
              <span>стр. {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1} · {fmtNum(filtered.length)} СНП</span>
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

function BucketSelect({ label, value, onChange, options, accent }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { k: string; l: string }[]; accent: string;
}) {
  const active = value !== "";
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[9px] uppercase tracking-wider truncate" style={{ color: "var(--c-text-4)" }}>{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="rounded-md text-[11px] px-2 py-1.5 outline-none"
        style={{
          background: "var(--c-bg-1)",
          border: `1px solid ${active ? accent : "var(--c-border)"}`,
          color: active ? accent : "var(--c-text-1)",
        }}>
        {options.map(o => <option key={o.k} value={o.k}>{o.l}</option>)}
      </select>
    </label>
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
                <div className="h-full" style={{ width: `${Math.min(d.pct, 100)}%`, background: "#10b981" }} />
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
