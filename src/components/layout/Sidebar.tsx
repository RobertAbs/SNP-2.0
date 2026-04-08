"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Building2, HardHat,
  Sun, Moon, LogOut, UserCircle,
} from "lucide-react";
import { useTheme } from "./ThemeProvider";

const navItems = [
  { href: "/",         label: "Главная",             icon: LayoutDashboard },
  { href: "/pir-psd",  label: "ПИР-ПСД",             icon: FileText },
  { href: "/smr",      label: "СМР (ВОЛС)",          icon: HardHat },
  { href: "/gu",       label: "ГУ Пункты пропуска",  icon: Building2 },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle } = useTheme();
  const [userName, setUserName] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUserName(d.user.name); })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside
      className="fixed left-0 top-0 h-full w-60 flex flex-col z-50 transition-colors duration-200"
      style={{ background: "var(--c-bg-1)", borderRight: "1px solid var(--c-border)" }}
    >
      <div className="px-4 py-4 border-b flex items-center gap-3" style={{ borderColor: "var(--c-border)" }}>
        <Image
          src={theme === "dark" ? "/logo-dark.svg" : "/logo-light.svg"}
          alt="Транстелеком"
          width={44}
          height={15}
          priority
          style={{ height: "auto", width: "44px" }}
        />
        <div className="border-l pl-3" style={{ borderColor: "var(--c-border)" }}>
          <div className="text-sm font-bold leading-tight" style={{ color: "var(--c-text-1)" }}>
            Мониторинг<br />проекта
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-2 text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-text-4)" }}>
        Навигация
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className="relative flex items-center gap-2.5 px-3 py-2 rounded-md transition-all duration-150 group"
              style={{
                background: active ? "color-mix(in srgb, var(--c-accent) 10%, transparent)" : "transparent",
                color: active ? "var(--c-accent)" : "var(--c-text-2)",
              }}
            >
              {active && (
                <span
                  className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r"
                  style={{ background: "var(--c-accent)" }}
                />
              )}
              <Icon size={14} strokeWidth={active ? 2.2 : 1.7} />
              <span className="text-[13px] font-medium flex-1 tracking-tight">{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3">
        <button
          onClick={toggle}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 hover:opacity-80"
          style={{
            color: "var(--c-text-2)",
            border: "1px solid var(--c-border)",
            background: "transparent",
          }}
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          <span className="text-sm font-medium">
            {theme === "dark" ? "Светлая тема" : "Тёмная тема"}
          </span>
        </button>
      </div>

      {userName && (
        <div className="px-3 pb-2">
          <div
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
            style={{ background: "var(--c-bg-2)", border: "1px solid var(--c-border)" }}
          >
            <UserCircle size={16} style={{ color: "var(--c-accent)", flexShrink: 0 }} />
            <span className="text-xs font-medium flex-1 truncate" style={{ color: "var(--c-text-2)" }}>
              {userName}
            </span>
            <button
              onClick={handleLogout}
              className="p-0.5 rounded hover:opacity-70 flex-shrink-0"
              style={{ color: "var(--c-text-3)" }}
              title="Выйти"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      )}

      <div
        className="px-6 py-3 border-t"
        style={{ borderColor: "var(--c-border)" }}
      >
        <div className="text-xs font-medium" style={{ color: "var(--c-text-3)" }}>АО «Транстелеком»</div>
        <div className="text-[10px] mt-0.5 tracking-wide" style={{ color: "var(--c-text-4)" }}>
          TTC Intelligent Solutions
        </div>
      </div>
    </aside>
  );
}
