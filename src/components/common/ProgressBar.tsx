"use client";

interface Props {
  value: number; // 0..100
  label?: string;
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, label, color = "var(--c-accent)", height = 6 }: Props) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div>
      {label && (
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: "var(--c-text-2)" }}>{label}</span>
          <span className="tabular-nums font-medium" style={{ color: "var(--c-text-1)" }}>{v}%</span>
        </div>
      )}
      <div
        className="rounded-full overflow-hidden"
        style={{ background: "var(--c-bg-2)", height }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${v}%`, background: color }}
        />
      </div>
    </div>
  );
}
