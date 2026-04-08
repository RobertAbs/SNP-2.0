"use client";

import { RefreshCw, Activity } from "lucide-react";

interface Props {
  title: string;
  subtitle?: string;
  lastUpdated?: Date | null;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export default function PageHeader({ title, subtitle, lastUpdated, refreshing, onRefresh }: Props) {
  return (
    <div
      className="flex items-center justify-between mb-6 pb-4"
      style={{ borderBottom: "1px solid var(--c-border)" }}
    >
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded inline-flex items-center gap-1"
            style={{ background: "color-mix(in srgb, var(--c-ok) 15%, transparent)", color: "var(--c-ok)" }}
          >
            <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: "var(--c-ok)" }} />
            LIVE
          </span>
          {subtitle && (
            <span className="text-[10px] uppercase tracking-wider" style={{ color: "var(--c-text-4)" }}>
              {subtitle}
            </span>
          )}
        </div>
        <h1 className="text-xl font-bold tracking-tight" style={{ color: "var(--c-text-1)" }}>
          Мониторинг проекта СНП {title && <span style={{ color: "var(--c-text-3)", fontWeight: 500 }}>· {title}</span>}
        </h1>
      </div>
      {onRefresh && (
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <div
              className="flex items-center gap-1.5 text-[11px] font-mono"
              style={{ color: "var(--c-text-3)" }}
            >
              <Activity size={11} />
              sync · {lastUpdated.toLocaleTimeString("ru-RU")}
            </div>
          )}
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition hover:brightness-110 disabled:opacity-50"
            style={{
              background: "var(--c-bg-1)",
              border: "1px solid var(--c-border)",
              color: "var(--c-text-2)",
            }}
          >
            <RefreshCw size={12} className={refreshing ? "animate-spin" : ""} />
            Обновить
          </button>
        </div>
      )}
    </div>
  );
}
