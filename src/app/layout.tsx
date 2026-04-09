import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";
import { ThemeProvider, ThemeScript } from "@/components/layout/ThemeProvider";

export const metadata: Metadata = {
  title: "СНП 2.0 — Мониторинг проекта",
  description: "Дашборд мониторинга проекта подключения СНП к интернету",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" data-theme="dark" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ThemeProvider>
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
