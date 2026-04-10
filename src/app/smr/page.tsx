"use client";

import { useMemo, useState } from "react";
import { HardHat, Search, Cable, Waypoints, CheckCircle2, Building2, BarChart3 } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import KpiCard from "@/components/common/KpiCard";
import { useSvod } from "@/hooks/useSvod";
import { fmtNum } from "@/lib/dataHelpers";
import { SvodRow } from "@/lib/types";

export default function SmrPage() {
  const svod = useSvod();
  const svodRows: SvodRow[] = svod.data ?? [];
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("");

  // ─── Только ВОЛС (не спутник) ───────────────────────────
  const volsRows = useMemo(() => svodRows.filter(r => r.tech !== "sputnik"), [svodRows]);

  // ─── Агрегаты ───────────────────────────────────────────
  const volsStats = useMemo(() => {
    const s = { count: 0, totalLengthKm: 0, connectedSnp: 0, builtKm: 0, connectedObjects: 0 };
    for (const r of volsRows) {
      s.count++;
      s.totalLengthKm += r.newKtLength;
      const isConn = r.status === "connected";
      const isTemp = r.extraStatus.toLowerCase().includes("временно спутник");
      if (isConn && !isTemp) {
        s.connectedSnp++;
        s.builtKm += r.newKtLength;
        s.connectedObjects += r.objectsConnectedFact;
      }
    }
    return s;
  }, [volsRows]);

  const pctByKm = volsStats.totalLengthKm ? (volsStats.builtKm / volsStats.totalLengthKm) * 100 : 0;
  const pctBySnp = volsStats.count ? (volsStats.connectedSnp / volsStats.count) * 100 : 0;

  // ─── Регионы для фильтра ────────────────────────────────
  const regions = useMemo(() => {
    const set = new Set<string>();
    for (const r of volsRows) if (r.region) set.add(r.region);
    return Array.from(set).sort();
  }, [volsRows]);

  // ─── Фильтрация таблицы ─────────────────────────────────
  const filtered = useMemo(() => volsRows.filter(r => {
    if (regionFilter && r.region !== regionFilter) return false;
    if (!search) return true;
    const s = search.toLowerCase();
    return r.snp.toLowerCase().includes(s) || r.region.toLowerCase().includes(s) || r.district.toLowerCase().includes(s);
  }), [volsRows, search, regionFilter]);

  // ─── Разрез по областям ─────────────────────────────────
  const byRegion = useMemo(() => {
    const m = new Map<string, { count: number; connectedKm: number; totalKm: number; connected: number }>();
    for (const r of volsRows) {
      const cur = m.get(r.region) ?? { count: 0, connectedKm: 0, totalKm: 0, connected: 0 };
      cur.count++;
      cur.totalKm += r.newKtLength;
      const isConn = r.status === "connected";
      const isTemp = r.extraStatus.toLowerCase().includes("временно спутник");
      if (isConn && !isTemp) {
        cur.connected++;
        cur.connectedKm += r.newKtLength;
      }
      m.set(r.region, cur);
    }
    return Array.from(m.entries())
      .map(([region, d]) => ({ region, ...d }))
      .sort((a, b) => b.count - a.count);
  }, [volsRows]);

  return (
    <div>
      <PageHeader
        title="Мониторинг проекта СНП · СМР · ВОЛС"
        subtitle="Строительно-монтажные работы по ВОЛС"
        lastUpdated={svod.lastUpdated}
        refreshing={svod.refreshing}
        onRefresh={svod.refresh}
      />

      {/* ═══ Ряд 1: Количество СНП / Протяжённость / Выполнено ═══ */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <KpiCard
          label="Количество СНП"
          value={fmtNum(volsStats.count)}
          hint="ВОЛС + ВОЛС (Wi-Fi public)"
          icon={Waypoints}
          color="#06b6d4"
        />
        <KpiCard
          label="Общая протяжённость ВОЛС"
          value={`${fmtNum(Math.round(volsStats.totalLengthKm))} км`}
          hint="ориентировочная по проекту"
          icon={Cable}
          color="#f59e0b"
        />
        <div
          className="rounded-lg p-4 flex flex-col items-center justify-center text-center"
          style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}
        >
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={13} style={{ color: "#10b981" }} />
            <span className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-3)" }}>
              Выполнено
            </span>
          </div>
          <div className="flex items-center justify-center gap-6">
            <div className="flex flex-col items-center">
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: "#10b981" }}>
                {pctByKm.toFixed(2).replace(".", ",")}%
              </span>
              <span className="text-[10px] font-medium" style={{ color: "var(--c-text-3)" }}>по км</span>
            </div>
            <div className="w-px h-8" style={{ background: "var(--c-border)" }} />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-extrabold tabular-nums" style={{ color: "#10b981" }}>
                {pctBySnp.toFixed(2).replace(".", ",")}%
              </span>
              <span className="text-[10px] font-medium" style={{ color: "var(--c-text-3)" }}>по СНП</span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Ряд 2: Подключено СНП / Построено ВОЛС / Объекты ═══ */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <KpiCard
          label="Подключено СНП"
          value={fmtNum(volsStats.connectedSnp)}
          hint={`${pctBySnp.toFixed(2).replace(".", ",")}% от плана`}
          icon={CheckCircle2}
          color="#22c55e"
        />
        <KpiCard
          label="Всего построено ВОЛС"
          value={`${volsStats.builtKm.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} км`}
          hint={`${pctByKm.toFixed(2).replace(".", ",")}% от ${fmtNum(Math.round(volsStats.totalLengthKm))} км`}
          icon={HardHat}
          color="#f59e0b"
        />
        <KpiCard
          label="Подключено объектов (ГУ/БО)"
          value={fmtNum(volsStats.connectedObjects)}
          hint="факт по госучреждениям / бюджетным"
          icon={Building2}
          color="#8b5cf6"
        />
      </div>

      {/* ═══ Разрез по областям ═══ */}
      <div className="rounded-lg p-5 mb-5"
        style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
        <div className="text-[11px] uppercase tracking-wider font-semibold mb-4" style={{ color: "var(--c-text-3)" }}>
          ВОЛС в разрезе областей
        </div>
        <div className="space-y-1.5">
          {byRegion.map(r => {
            const maxCount = byRegion[0]?.count ?? 1;
            const w = Math.max((r.count / maxCount) * 100, 2);
            return (
              <div key={r.region} className="flex items-center gap-2">
                <div className="w-44 text-[11px] truncate" style={{ color: "var(--c-text-2)" }}>
                  {r.region.replace(/\s*область$/i, "")}
                </div>
                <div className="flex-1 h-4 rounded overflow-hidden" style={{ background: "var(--c-bg-2)" }}>
                  <div className="h-full rounded" style={{ width: `${w}%`, background: "#06b6d4" }} />
                </div>
                <div className="w-12 text-right text-[11px] font-mono tabular-nums font-semibold" style={{ color: "var(--c-text-1)" }}>
                  {fmtNum(r.count)}
                </div>
                <div className="w-24 text-right text-[10px] font-mono tabular-nums" style={{ color: "var(--c-text-3)" }}>
                  {fmtNum(Math.round(r.totalKm))} км
                </div>
                <div className="w-20 text-right text-[10px] font-mono tabular-nums" style={{ color: "#22c55e" }}>
                  {r.connected > 0 ? `✓ ${r.connected} СНП` : "—"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ Фильтр и таблица всех ВОЛС ═══ */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
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
        <select
          value={regionFilter}
          onChange={e => setRegionFilter(e.target.value)}
          className="rounded-md text-xs outline-none"
          style={{
            background: "var(--c-bg-1)", border: "1px solid var(--c-border)",
            color: "var(--c-text-1)", padding: "6px 10px",
          }}
        >
          <option value="">Все области</option>
          {regions.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || regionFilter) && (
          <button
            onClick={() => { setSearch(""); setRegionFilter(""); }}
            className="text-[10px] px-2 py-1 rounded"
            style={{ color: "var(--c-accent)", background: "color-mix(in srgb, var(--c-accent) 10%, transparent)" }}
          >
            Сбросить
          </button>
        )}
        <span className="text-[10px] font-mono ml-auto" style={{ color: "var(--c-text-4)" }}>
          {fmtNum(filtered.length)} из {fmtNum(volsRows.length)}
        </span>
      </div>

      <div className="rounded-lg overflow-hidden"
        style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ background: "var(--c-bg-2)" }}>
                {["№", "Область", "Район", "СНП", "Технология", "Год", "Протяж. км", "Статус", "Нач. СМР", "Заверш. СМР", "Объекты факт"].map(h => (
                  <th key={h} className="text-left px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider whitespace-nowrap"
                    style={{ color: "var(--c-text-3)", borderBottom: "1px solid var(--c-border)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid var(--c-border)" }} className="hover:bg-white/[0.02]">
                  <td className="px-2.5 py-1.5 text-[10px] font-mono tabular-nums" style={{ color: "var(--c-text-4)" }}>{r.id}</td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--c-text-2)" }}>{r.region.replace(/\s*область$/i, "")}</td>
                  <td className="px-2.5 py-1.5" style={{ color: "var(--c-text-2)" }}>{r.district}</td>
                  <td className="px-2.5 py-1.5 font-medium" style={{ color: "var(--c-text-1)" }}>{r.snp}</td>
                  <td className="px-2.5 py-1.5">
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{
                        background: r.tech === "vols_wifi_public" ? "color-mix(in srgb, #f59e0b 15%, transparent)" : "color-mix(in srgb, #06b6d4 15%, transparent)",
                        color: r.tech === "vols_wifi_public" ? "#f59e0b" : "#06b6d4",
                      }}>
                      {r.techRaw || "ВОЛС"}
                    </span>
                  </td>
                  <td className="px-2.5 py-1.5 text-[10px] font-mono tabular-nums" style={{ color: "var(--c-text-2)" }}>{r.year ?? "—"}</td>
                  <td className="px-2.5 py-1.5 text-[10px] font-mono tabular-nums" style={{ color: "var(--c-text-1)" }}>
                    {r.newKtLength > 0 ? r.newKtLength.toLocaleString("ru-RU", { maximumFractionDigits: 1 }) : "—"}
                  </td>
                  <td className="px-2.5 py-1.5">
                    <StatusBadge status={r.statusRaw} extra={r.extraStatus} />
                  </td>
                  <td className="px-2.5 py-1.5 text-[10px] font-mono" style={{ color: "var(--c-text-2)" }}>{r.smrStart || "—"}</td>
                  <td className="px-2.5 py-1.5 text-[10px] font-mono" style={{ color: "var(--c-text-2)" }}>{r.smrEnd || "—"}</td>
                  <td className="px-2.5 py-1.5 text-[10px] font-mono tabular-nums text-center" style={{ color: r.objectsConnectedFact > 0 ? "#22c55e" : "var(--c-text-4)" }}>
                    {r.objectsConnectedFact || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status, extra }: { status: string; extra: string }) {
  const s = status.toLowerCase();
  const isConn = s.includes("подключ");
  const isTemp = extra.toLowerCase().includes("временно спутник");
  let bg: string, fg: string, label: string;

  if (isConn && !isTemp) {
    bg = "color-mix(in srgb, #22c55e 15%, transparent)"; fg = "#22c55e"; label = "Подключено";
  } else if (isConn && isTemp) {
    bg = "color-mix(in srgb, #f59e0b 15%, transparent)"; fg = "#f59e0b"; label = "Врем. спутник";
  } else {
    bg = "color-mix(in srgb, #6366f1 15%, transparent)"; fg = "#6366f1"; label = "В работе";
  }

  return (
    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ background: bg, color: fg }}>
      {label}
    </span>
  );
}
