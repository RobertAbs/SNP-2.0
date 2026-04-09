"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  useReactTable, getCoreRowModel, getFilteredRowModel, getSortedRowModel,
  getPaginationRowModel, flexRender, ColumnDef, SortingState,
} from "@tanstack/react-table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { ChevronUp, ChevronDown, Search, CheckCircle2, Zap, Radio, Home as HomeIcon, ShieldCheck, X, MapPin } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import EmptyState from "@/components/common/EmptyState";
import { useSvod } from "@/hooks/useSvod";
import { fmtNum, uniq } from "@/lib/dataHelpers";
import {
  SvodRow, SvodTech, SvodStatus,
  SVOD_TECH_LABELS, SVOD_STATUS_LABELS,
  SVOD_OBJECT_KEYS, SVOD_OBJECT_LABELS,
} from "@/lib/types";

const TECH_COLORS: Record<SvodTech, string> = {
  vols: "#10b981",
  vols_wifi_public: "#06b6d4",
  sputnik: "#8b5cf6",
};

const STATUS_COLORS: Record<SvodStatus, string> = {
  connected: "#22c55e",
  in_progress: "#f59e0b",
};

function shortRegion(s: string): string {
  return s
    .replace(/Северо-Казахстанская область/i, "СКО")
    .replace(/Западно-Казахстанская область/i, "ЗКО")
    .replace(/Восточно-Казахстанская область/i, "ВКО")
    .replace(/ская область/i, "ская")
    .replace(/^Область\s+/i, "");
}

export default function SvodPageWrapper() {
  return <Suspense fallback={null}><SvodPage /></Suspense>;
}

function SvodPage() {
  const svod = useSvod();
  const sp = useSearchParams();
  const rows = svod.data ?? [];

  const [regionFilter, setRegionFilter] = useState("");
  const [districtFilter, setDistrictFilter] = useState("");
  const [yearFilter, setYearFilter] = useState("");
  const [techFilter, setTechFilter] = useState<"" | SvodTech>("");
  const [statusFilter, setStatusFilter] = useState<"" | SvodStatus>("");
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([]);
  const [detailRow, setDetailRow] = useState<SvodRow | null>(null);

  // Применяем query-параметры при загрузке
  useEffect(() => {
    const r = sp.get("region"); if (r) setRegionFilter(r);
    const d = sp.get("district"); if (d) setTimeout(() => setDistrictFilter(d), 0);
    const y = sp.get("year"); if (y) setYearFilter(y);
    const t = sp.get("tech") as SvodTech | null; if (t) setTechFilter(t);
    const s = sp.get("status") as SvodStatus | null; if (s) setStatusFilter(s);
  }, [sp]);

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
    () => uniq(rows.map(r => r.year).filter((x): x is number => !!x)).sort(),
    [rows]
  );

  useEffect(() => { setDistrictFilter(""); }, [regionFilter]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (regionFilter && r.region !== regionFilter) return false;
      if (districtFilter && r.district !== districtFilter) return false;
      if (yearFilter && String(r.year) !== yearFilter) return false;
      if (techFilter && r.tech !== techFilter) return false;
      if (statusFilter && r.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!r.snp.toLowerCase().includes(s)
          && !r.district.toLowerCase().includes(s)
          && !r.region.toLowerCase().includes(s)
          && !r.kato.includes(s)) return false;
      }
      return true;
    });
  }, [rows, regionFilter, districtFilter, yearFilter, techFilter, statusFilter, search]);

  // Агрегаты (реактивные)
  const stats = useMemo(() => {
    const s = {
      total: filtered.length,
      vols: 0, volsWifi: 0, sputnik: 0,
      connectedSnp: 0, connectedObjects: 0,
      totalVolsKm: 0,
      byYear: { 2025: 0, 2026: 0, 2027: 0 } as Record<number, number>,
    };
    for (const r of filtered) {
      if (r.tech === "vols") s.vols++;
      else if (r.tech === "vols_wifi_public") s.volsWifi++;
      else if (r.tech === "sputnik") s.sputnik++;
      if (r.status === "connected") s.connectedSnp++;
      s.connectedObjects += r.objectsConnectedFact;
      s.totalVolsKm += r.volsLengthKm;
      if (r.year && s.byYear[r.year] !== undefined) s.byYear[r.year]++;
    }
    return s;
  }, [filtered]);

  const techBreakdown = useMemo(() => {
    return [
      { name: SVOD_TECH_LABELS.vols, value: stats.vols, color: TECH_COLORS.vols },
      { name: SVOD_TECH_LABELS.vols_wifi_public, value: stats.volsWifi, color: TECH_COLORS.vols_wifi_public },
      { name: SVOD_TECH_LABELS.sputnik, value: stats.sputnik, color: TECH_COLORS.sputnik },
    ].filter(x => x.value > 0);
  }, [stats]);

  const connectedByRegion = useMemo(() => {
    const m = new Map<string, { total: number; connected: number }>();
    for (const r of filtered) {
      const cur = m.get(r.region) ?? { total: 0, connected: 0 };
      cur.total++;
      if (r.status === "connected") cur.connected++;
      m.set(r.region, cur);
    }
    return Array.from(m.entries())
      .map(([name, { total, connected }]) => ({
        name: shortRegion(name),
        fullName: name,
        connected,
        total,
        pct: total ? Math.round((connected / total) * 100 * 10) / 10 : 0,
      }))
      .sort((a, b) => b.connected - a.connected);
  }, [filtered]);

  const columns = useMemo<ColumnDef<SvodRow>[]>(() => [
    { accessorKey: "id", header: "№", size: 50 },
    {
      accessorKey: "region",
      header: "Область",
      cell: info => shortRegion(info.getValue<string>()),
      size: 110,
    },
    { accessorKey: "district", header: "Район", size: 140 },
    { accessorKey: "snp", header: "СНП", size: 160 },
    {
      id: "tech",
      header: "Технология",
      accessorFn: r => r.tech,
      cell: ({ row }) => {
        const t = row.original.tech;
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: `color-mix(in srgb, ${TECH_COLORS[t]} 15%, transparent)`,
              color: TECH_COLORS[t],
            }}>
            {SVOD_TECH_LABELS[t]}
          </span>
        );
      },
      size: 140,
    },
    { accessorKey: "year", header: "Год", size: 60 },
    {
      id: "status",
      header: "Статус",
      accessorFn: r => r.status,
      cell: ({ row }) => {
        const s = row.original.status;
        return (
          <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
            style={{
              background: `color-mix(in srgb, ${STATUS_COLORS[s]} 15%, transparent)`,
              color: STATUS_COLORS[s],
            }}>
            {SVOD_STATUS_LABELS[s]}
          </span>
        );
      },
      size: 110,
    },
    {
      accessorKey: "objectsConnectedFact",
      header: "Объекты",
      cell: info => {
        const v = info.getValue<number>();
        return v > 0
          ? <span className="font-mono tabular-nums" style={{ color: "#22c55e" }}>{v}</span>
          : <span className="text-[10px]" style={{ color: "var(--c-text-4)" }}>—</span>;
      },
      size: 80,
    },
    {
      accessorKey: "volsLengthKm",
      header: "ВОЛС, км",
      cell: info => {
        const v = info.getValue<number>();
        return v > 0 ? v.toFixed(2) : "—";
      },
      size: 90,
    },
    {
      accessorKey: "smrEnd",
      header: "Завершение СМР",
      cell: info => info.getValue<string>() || "—",
      size: 120,
    },
  ], []);

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

  const hasFilters = regionFilter || districtFilter || yearFilter || techFilter || statusFilter || search;

  const resetAll = () => {
    setRegionFilter(""); setDistrictFilter(""); setYearFilter("");
    setTechFilter(""); setStatusFilter(""); setSearch("");
  };

  return (
    <div>
      <PageHeader
        title="Общий свод"
        subtitle="Все СНП проекта — технологии, статусы, объекты"
        lastUpdated={svod.lastUpdated}
        refreshing={svod.refreshing}
        onRefresh={svod.refresh}
      />

      {rows.length === 0 ? (
        <EmptyState title="Нет данных" hint="Проверьте доступ к листу «Общий свод»" />
      ) : (
        <>
          {/* KPI — реактивные */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <KpiCard label="Кол-во СНП"
              value={fmtNum(stats.total)}
              hint={hasFilters ? `из ${fmtNum(rows.length)}` : "всего"}
              icon={HomeIcon} color="#10b981" />
            <KpiCard label="Подключено сёл"
              value={fmtNum(stats.connectedSnp)}
              hint={`${stats.total ? ((stats.connectedSnp / stats.total) * 100).toFixed(1) : "0"}%`}
              icon={CheckCircle2} color="#22c55e" />
            <KpiCard label="Подключено объектов"
              value={fmtNum(stats.connectedObjects)}
              hint="факт ГУ / БО"
              icon={ShieldCheck} color="#10b981" />
            <KpiCard label="ВОЛС, км"
              value={stats.totalVolsKm.toFixed(1)}
              hint="ориентир. протяжённость"
              icon={Radio} color="#06b6d4" />
            <KpiCard label="Технологии"
              value={`${stats.vols}/${stats.volsWifi}/${stats.sputnik}`}
              hint="ВОЛС · Wi-Fi · Спутник"
              icon={Zap} color="#8b5cf6" />
          </div>

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

              <select value={techFilter} onChange={e => setTechFilter(e.target.value as SvodTech | "")}
                className="rounded-md text-xs px-2.5 py-1.5 outline-none" style={selectStyle}>
                <option value="">Все технологии</option>
                <option value="vols">{SVOD_TECH_LABELS.vols}</option>
                <option value="vols_wifi_public">{SVOD_TECH_LABELS.vols_wifi_public}</option>
                <option value="sputnik">{SVOD_TECH_LABELS.sputnik}</option>
              </select>

              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SvodStatus | "")}
                className="rounded-md text-xs px-2.5 py-1.5 outline-none" style={selectStyle}>
                <option value="">Все статусы</option>
                <option value="connected">{SVOD_STATUS_LABELS.connected}</option>
                <option value="in_progress">{SVOD_STATUS_LABELS.in_progress}</option>
              </select>

              <div className="relative">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "var(--c-text-4)" }} />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Поиск СНП / район / КАТО"
                  className="rounded-md text-xs outline-none"
                  style={{
                    background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
                    color: "var(--c-text-1)", padding: "6px 10px 6px 26px", minWidth: 220,
                  }} />
              </div>

              {hasFilters && (
                <button onClick={resetAll}
                  className="text-[11px] px-2.5 py-1.5 rounded-md hover:brightness-110"
                  style={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}>
                  Сбросить
                </button>
              )}

              <div className="ml-auto text-[10px] font-mono" style={{ color: "var(--c-text-3)" }}>
                найдено: <span style={{ color: "var(--c-text-1)" }}>{fmtNum(filtered.length)}</span> из {fmtNum(rows.length)}
              </div>
            </div>
          </div>

          {/* Графики */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
            <div className="rounded-lg p-4"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--c-text-3)" }}>
                Технологии
              </div>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={techBreakdown} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={2}
                      stroke="var(--c-bg-0)">
                      {techBreakdown.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => [`${fmtNum(v)} СНП`, ""]}
                      contentStyle={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 11, color: "var(--c-text-1)" }}
                      itemStyle={{ color: "var(--c-text-1)" }} />
                    <Legend iconSize={8} wrapperStyle={{ fontSize: 10, color: "var(--c-text-2)" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-lg p-4 lg:col-span-2"
              style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-baseline justify-between mb-2">
                <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
                  Подключено сёл по областям
                </div>
                <div className="text-[10px]" style={{ color: "var(--c-text-4)" }}>
                  {fmtNum(stats.connectedSnp)} из {fmtNum(stats.total)}
                </div>
              </div>
              <div style={{ width: "100%", height: Math.max(connectedByRegion.length * 22 + 30, 220) }}>
                <ResponsiveContainer>
                  <BarChart data={connectedByRegion} layout="vertical" margin={{ top: 5, right: 40, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--c-border)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: "var(--c-text-3)", fontSize: 10 }} stroke="var(--c-border)" />
                    <YAxis type="category" dataKey="name" width={100} interval={0}
                      tick={{ fill: "var(--c-text-2)", fontSize: 10 }} stroke="var(--c-border)" />
                    <Tooltip
                      formatter={(v: number, _: any, p: any) => [`${v} из ${p?.payload?.total ?? 0} (${p?.payload?.pct ?? 0}%)`, "подключено"]}
                      contentStyle={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", borderRadius: 6, fontSize: 11, color: "var(--c-text-1)" }}
                      itemStyle={{ color: "var(--c-text-1)" }}
                      cursor={{ fill: "color-mix(in srgb, #22c55e 10%, transparent)" }} />
                    <Bar dataKey="connected" fill="#22c55e" radius={[0, 4, 4, 0]}
                      style={{ cursor: "pointer" }}
                      onClick={(d: any) => d?.fullName && setRegionFilter(d.fullName)}
                      label={{ position: "right", fill: "var(--c-text-2)", fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
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
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}
                      onClick={() => setDetailRow(row.original)}
                      style={{ borderBottom: "1px solid var(--c-border)", cursor: "pointer" }}
                      className="hover:bg-white/[0.02] transition">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-3 py-2 text-xs" style={{ color: "var(--c-text-2)" }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
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

      {/* Модалка деталей СНП */}
      {detailRow && <SnpDetailsModal row={detailRow} onClose={() => setDetailRow(null)} />}
    </div>
  );
}

function SnpDetailsModal({ row, onClose }: { row: SvodRow; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const techColor = TECH_COLORS[row.tech];
  const statusColor = STATUS_COLORS[row.status];

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="relative rounded-xl w-full max-w-3xl my-8"
        style={{
          background: "var(--c-bg-1)",
          border: "1px solid var(--c-border)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded hover:brightness-125 z-10"
          style={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)", color: "var(--c-text-2)" }}
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="p-6 pb-4" style={{ borderBottom: "1px solid var(--c-border)" }}>
          <div className="flex items-start gap-2 mb-2 pr-10">
            <MapPin size={16} className="mt-0.5 flex-shrink-0" style={{ color: "var(--c-accent)" }} />
            <div className="min-w-0 flex-1">
              <div className="text-xs" style={{ color: "var(--c-text-3)" }}>
                {row.region} · {row.district} · {row.ruralDistrict}
              </div>
              <div className="text-xl font-bold mt-0.5" style={{ color: "var(--c-text-1)" }}>
                {row.snp}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge color={techColor}>{SVOD_TECH_LABELS[row.tech]}</Badge>
            <Badge color={statusColor}>{SVOD_STATUS_LABELS[row.status]}</Badge>
            {row.year && <Badge color="#f59e0b">{row.year}</Badge>}
            {row.extraStatus && <Badge color="#64748b">{row.extraStatus}</Badge>}
          </div>
        </div>

        {/* Meta grid */}
        <div className="p-6 pt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <MetaItem label="КАТО" value={row.kato || "—"} mono />
          <MetaItem label="Население" value={row.population ? fmtNum(row.population) : "—"} />
          <MetaItem label="Домохозяйств" value={row.households ? fmtNum(row.households) : "—"} />
          <MetaItem label="Координаты" value={row.coords || "—"} mono small />
          <MetaItem label="Начало СМР" value={row.smrStart || "—"} />
          <MetaItem label="Завершение СМР" value={row.smrEnd || "—"} />
          <MetaItem label="ВОЛС, км" value={row.volsLengthKm > 0 ? row.volsLengthKm.toFixed(2) : "—"} />
          <MetaItem label="ВСЕГО ГУ/БО" value={row.totalGuBo ? String(row.totalGuBo) : "—"} />
        </div>

        {/* Подключённые объекты */}
        <div className="px-6 pb-4">
          <div className="flex items-baseline justify-between mb-3">
            <div className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
              Объекты в СНП
            </div>
            <div className="text-[10px]" style={{ color: "var(--c-text-4)" }}>
              подключено: <span className="font-mono font-bold" style={{ color: "#22c55e" }}>{row.objectsConnectedFact}</span>
              {row.whatConnected && <span> · {row.whatConnected}</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
            {SVOD_OBJECT_KEYS.map(k => {
              const has = row.objects[k] > 0;
              return (
                <div key={k}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded text-[11px]"
                  style={{
                    background: has ? "color-mix(in srgb, #22c55e 10%, transparent)" : "var(--c-bg-2)",
                    border: `1px solid ${has ? "color-mix(in srgb, #22c55e 30%, transparent)" : "var(--c-border)"}`,
                    color: has ? "#22c55e" : "var(--c-text-4)",
                  }}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: has ? "#22c55e" : "var(--c-text-4)" }} />
                  <span className="truncate">{SVOD_OBJECT_LABELS[k]}</span>
                  {has && <span className="ml-auto font-mono font-bold">{row.objects[k]}</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Инженерные данные */}
        {(row.trenchKm > 0 || row.microTubeKm > 0 || row.newKtLength > 0) && (
          <div className="p-6 pt-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--c-text-3)" }}>
              Инженерия
            </div>
            <div className="grid grid-cols-3 gap-3">
              <MetaItem label="Новая КТ" value={row.newKtLength > 0 ? `${row.newKtLength} км` : "—"} />
              <MetaItem label="Траншеи" value={row.trenchKm > 0 ? `${row.trenchKm.toFixed(2)} км` : "—"} />
              <MetaItem label="Микротрубка" value={row.microTubeKm > 0 ? `${row.microTubeKm.toFixed(2)} км` : "—"} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded"
      style={{
        background: `color-mix(in srgb, ${color} 15%, transparent)`,
        color,
        border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}

function MetaItem({ label, value, mono, small }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div>
      <div className="text-[9px] uppercase tracking-wider" style={{ color: "var(--c-text-4)" }}>
        {label}
      </div>
      <div
        className={`mt-0.5 ${mono ? "font-mono" : ""} ${small ? "text-[11px]" : "text-sm"} truncate`}
        style={{ color: "var(--c-text-1)" }}
        title={value}
      >
        {value}
      </div>
    </div>
  );
}
