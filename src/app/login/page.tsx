"use client";

import { useState, useRef, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Lock, User, Eye, EyeOff, AlertCircle } from "lucide-react";
import { useTheme } from "@/components/layout/ThemeProvider";

const ACCENT = "#10b981";
const ACCENT_DARK = "#059669";

export default function LoginPage() {
  const router = useRouter();
  const { theme } = useTheme();
  const loginRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const loginVal = (loginRef.current?.value || "").trim();
    const passwordVal = passwordRef.current?.value || "";
    if (!loginVal || !passwordVal) {
      setError("Введите логин и пароль");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: loginVal, password: passwordVal }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка авторизации");
        setLoading(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Ошибка соединения с сервером");
      setLoading(false);
    }
  }


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
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
      {/* акцентный glow */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: `radial-gradient(circle, ${ACCENT} 0%, transparent 70%)` }}
      />

      <div className="relative w-full max-w-[420px]">
        {/* шапка — название проекта */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-2xl font-bold tracking-tight" style={{ color: "var(--c-text-1)" }}>
            СНП 2.0
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--c-text-3)" }}>
            Мониторинг проекта
          </div>
        </div>

        {/* карточка */}
        <div
          className="relative rounded-lg overflow-hidden"
          style={{
            background: "var(--c-bg-1)",
            border: "1px solid var(--c-border)",
            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.4)",
          }}
        >
          {/* акцентная полоска сверху */}
          <div
            className="h-0.5"
            style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_DARK}, ${ACCENT})` }}
          />

          <form onSubmit={handleSubmit} className="p-6">
            <div className="mb-5">
              <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--c-text-1)" }}>
                Мониторинг проекта СНП
              </h1>
            </div>

            {error && (
              <div
                className="flex items-center gap-2 px-3 py-2.5 rounded-md text-xs mb-4"
                style={{
                  background: "color-mix(in srgb, var(--c-danger) 12%, transparent)",
                  color: "var(--c-danger)",
                  border: "1px solid color-mix(in srgb, var(--c-danger) 30%, transparent)",
                }}
              >
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label
                  className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
                  style={{ color: "var(--c-text-3)" }}
                >
                  Логин
                </label>
                <div className="relative">
                  <User
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                    style={{ color: "var(--c-text-4)" }}
                  />
                  <input
                    ref={loginRef}
                    type="text"
                    name="login"
                    defaultValue=""
                    placeholder="admin"
                    autoComplete="username"
                    autoFocus
                    className="w-full rounded-md text-sm outline-none transition-all duration-150"
                    style={{
                      background: "var(--c-bg-0)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text-1)",
                      padding: "9px 12px 9px 32px",
                    }}
                  />
                </div>
              </div>

              <div>
                <label
                  className="text-[10px] uppercase tracking-wider font-semibold mb-1.5 block"
                  style={{ color: "var(--c-text-3)" }}
                >
                  Пароль
                </label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none z-10"
                    style={{ color: "var(--c-text-4)" }}
                  />
                  <input
                    ref={passwordRef}
                    type={showPassword ? "text" : "password"}
                    name="password"
                    defaultValue=""
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full rounded-md text-sm outline-none transition-all duration-150"
                    style={{
                      background: "var(--c-bg-0)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text-1)",
                      padding: "9px 40px 9px 32px",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const next = !showPassword;
                      setShowPassword(next);
                      if (passwordRef.current) {
                        passwordRef.current.type = next ? "text" : "password";
                      }
                    }}
                    className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded transition hover:bg-white/10 z-20 cursor-pointer"
                    style={{ color: "var(--c-text-2)", background: "transparent", border: "none" }}
                    tabIndex={-1}
                    aria-label="Показать пароль"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-5 py-2.5 rounded-md text-sm font-semibold transition-all duration-150 hover:brightness-110 disabled:opacity-60 cursor-pointer"
              style={{
                background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_DARK})`,
                color: "#fff",
                border: `1px solid ${ACCENT}`,
                boxShadow: `0 4px 16px -4px ${ACCENT}80`,
              }}
            >
              {loading ? "Проверка..." : "Войти"}
            </button>
          </form>
        </div>

        <div
          className="text-center text-[10px] mt-6 font-mono"
          style={{ color: "var(--c-text-4)" }}
        >
          СНП 2.0 · 2026
        </div>
      </div>
    </div>
  );
}
