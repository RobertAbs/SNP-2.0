"use client";

import type { LucideIcon } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface Props {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  color?: string;
  trend?: string;         // опционально — только если есть реальные данные
  sparkline?: number[];   // опционально — только если есть ряд
  sub?: { label: string; value: string | number }[]; // до 2 подпоказателей
  href?: string;
  onClick?: () => void;
}

export default function KpiCard({
  label, value, hint, icon: Icon, color = "var(--c-accent)", trend, sparkline, sub, href, onClick,
}: Props) {
  const sparkData = sparkline ? sparkline.map((v, i) => ({ i, v })) : null;
  const interactive = !!(href || onClick);

  const inner = (
    <div
      className={`relative rounded-lg p-4 transition group ${interactive ? "hover:brightness-110 hover:-translate-y-0.5 cursor-pointer" : "hover:brightness-105"}`}
      style={{ background: "var(--c-bg-1)", border: "1px solid var(--c-border)" }}
      onClick={onClick}
    >
      <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r" style={{ background: color }} />
      {interactive && (
        <ArrowUpRight
          size={12}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition"
          style={{ color }}
        />
      )}
      <div className="pl-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            {Icon && <Icon size={13} strokeWidth={2} style={{ color, flexShrink: 0 }} />}
            <div className="text-[10px] uppercase tracking-wider font-semibold truncate" style={{ color: "var(--c-text-3)" }}>
              {label}
            </div>
          </div>
          {trend && (
            <div
              className="text-[10px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ background: `color-mix(in srgb, ${color} 12%, transparent)`, color }}
            >
              {trend.startsWith("-") ? trend : `+${trend.replace(/^\+/, "")}%`}
            </div>
          )}
        </div>
        <div className="flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="text-[26px] leading-none font-bold tabular-nums" style={{ color: "var(--c-text-1)" }}>
              {value}
            </div>
            {hint && (
              <div className="text-[10px] mt-1 truncate" style={{ color: "var(--c-text-4)" }}>
                {hint}
              </div>
            )}
          </div>
          {sparkData && (
            <div className="w-14 h-8 flex-shrink-0">
              <ResponsiveContainer>
                <LineChart data={sparkData}>
                  <Line type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        {sub && sub.length > 0 && (
          <div className="mt-3 pt-2.5 flex gap-4" style={{ borderTop: "1px solid var(--c-border)" }}>
            {sub.map((s, i) => (
              <div key={i} className="min-w-0">
                <div className="text-[9px] uppercase tracking-wider truncate" style={{ color: "var(--c-text-4)" }}>{s.label}</div>
                <div className="text-sm font-semibold tabular-nums mt-0.5" style={{ color: "var(--c-text-2)" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}
