"use client";

import { Inbox } from "lucide-react";

export default function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div
      className="rounded-xl p-12 text-center"
      style={{
        background: "var(--c-bg-1)",
        border: "1px dashed var(--c-border)",
      }}
    >
      <Inbox size={32} className="mx-auto mb-3" style={{ color: "var(--c-text-4)" }} />
      <div className="text-sm font-medium" style={{ color: "var(--c-text-2)" }}>{title}</div>
      {hint && <div className="text-xs mt-1" style={{ color: "var(--c-text-3)" }}>{hint}</div>}
    </div>
  );
}
