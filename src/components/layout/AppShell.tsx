"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <>
      <Sidebar />
      <main
        className="ml-60 min-h-screen p-8 relative overflow-hidden"
        style={{ background: "var(--c-bg-0)" }}
      >
        {/* фоновая сетка */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--c-text-1) 1px, transparent 1px), linear-gradient(90deg, var(--c-text-1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* зелёный glow */}
        <div
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-[0.12] blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)" }}
        />
        <div className="relative">{children}</div>
      </main>
    </>
  );
}
